# ═══════════════════════════════════════════════════════════════
# customer_support / agent / cart.py
#
# PURPOSE: Per-chat-session cart backed by the carts/cart_items tables.
#          Lines point at real variants; stock is validated against the
#          live variant row and prices are re-read on every view.
#          Checkout hands off to Shopify through a cart permalink
#          (https://{shop}/cart/{variantId}:{qty},…) which needs no token.
# ═══════════════════════════════════════════════════════════════

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.sdk.models.base import Product, Store, Variant
from src.sdk.platforms.shopify_admin import shop_domain_for
from src.sdk.models.support import Cart, CartItem

MAX_LINE_QUANTITY = 20


class CartError(Exception):
    """Raised for user-correctable cart problems; message is safe to show the model."""


async def get_or_create_cart(db: AsyncSession, store_id: int, conversation_id: int) -> Cart:
    res = await db.execute(
        select(Cart).where(Cart.conversation_id == conversation_id).options(selectinload(Cart.items))
    )
    cart = res.scalar_one_or_none()
    if cart:
        return cart
    cart = Cart(store_id=store_id, conversation_id=conversation_id)
    db.add(cart)
    await db.flush()
    await db.refresh(cart, attribute_names=["items"])
    return cart


async def _variant_for_store(db: AsyncSession, store_id: int, variant_id: int) -> tuple[Variant, Product]:
    res = await db.execute(
        select(Variant, Product)
        .join(Product, Product.id == Variant.product_id)
        .where(Variant.id == variant_id, Product.store_id == store_id, Product.status == "active")
    )
    row = res.first()
    if not row:
        raise CartError(f"variant_id {variant_id} does not exist in this store")
    return row[0], row[1]


async def update_cart(
    db: AsyncSession,
    store_id: int,
    conversation_id: int,
    action: str,
    variant_id: int | None = None,
    quantity: int | None = None,
) -> dict:
    """action: add | remove | set_quantity | view | clear. Returns the cart snapshot."""
    cart = await get_or_create_cart(db, store_id, conversation_id)
    action = (action or "").lower()
    change: dict | None = None

    if action in ("add", "set_quantity", "remove") and variant_id is None:
        raise CartError("variant_id is required for this action")

    if action == "add":
        qty = 1 if quantity is None else int(quantity)
        if qty < 1:
            raise CartError("quantity must be at least 1")
        variant, product = await _variant_for_store(db, store_id, variant_id)
        line = next((i for i in cart.items if i.variant_id == variant.id), None)
        new_qty = (line.quantity if line else 0) + qty
        stock = int(variant.inventory_quantity or 0)
        if stock <= 0:
            raise CartError(f"'{product.title}' ({variant.title}) is out of stock (stock: 0); nothing was added")
        if new_qty > stock:
            raise CartError(
                f"only {stock} of '{product.title}' ({variant.title}) in stock; "
                f"cart already has {line.quantity if line else 0}; nothing was changed"
            )
        if new_qty > MAX_LINE_QUANTITY:
            raise CartError(f"maximum {MAX_LINE_QUANTITY} per item per cart; nothing was changed")
        if line:
            line.quantity = new_qty
        else:
            line = CartItem(cart_id=cart.id, variant_id=variant.id, quantity=new_qty)
            db.add(line)
            cart.items.append(line)
        change = {"action": "added", "variant_id": variant.id, "product": product.title, "quantity_now": new_qty}

    elif action == "set_quantity":
        qty = int(quantity if quantity is not None else -1)
        if qty < 0:
            raise CartError("quantity must be 0 or more")
        variant, product = await _variant_for_store(db, store_id, variant_id)
        line = next((i for i in cart.items if i.variant_id == variant.id), None)
        if qty == 0:
            if not line:
                raise CartError(f"'{product.title}' is not in the cart")
            cart.items.remove(line)
            await db.delete(line)
            change = {"action": "removed", "variant_id": variant.id, "product": product.title}
        else:
            stock = int(variant.inventory_quantity or 0)
            if qty > stock:
                raise CartError(
                    f"only {stock} of '{product.title}' ({variant.title}) in stock; nothing was changed"
                )
            if qty > MAX_LINE_QUANTITY:
                raise CartError(f"maximum {MAX_LINE_QUANTITY} per item per cart; nothing was changed")
            if line:
                line.quantity = qty
            else:
                line = CartItem(cart_id=cart.id, variant_id=variant.id, quantity=qty)
                db.add(line)
                cart.items.append(line)
            change = {"action": "quantity_set", "variant_id": variant.id, "product": product.title, "quantity_now": qty}

    elif action == "remove":
        variant, product = await _variant_for_store(db, store_id, variant_id)
        line = next((i for i in cart.items if i.variant_id == variant.id), None)
        if not line:
            raise CartError(f"'{product.title}' ({variant.title}) is not in the cart")
        cart.items.remove(line)
        await db.delete(line)
        change = {"action": "removed", "variant_id": variant.id, "product": product.title}

    elif action == "clear":
        for line in list(cart.items):
            cart.items.remove(line)
            await db.delete(line)
        change = {"action": "cleared"}

    elif action == "view":
        change = {"action": "viewed"}
    else:
        raise CartError("action must be one of: add, remove, set_quantity, view, clear")

    await db.flush()
    snap = await cart_snapshot(db, store_id, conversation_id)
    snap["change"] = change
    return snap


async def cart_snapshot(db: AsyncSession, store_id: int, conversation_id: int) -> dict:
    """Current cart with live price / stock per line and a checkout link."""
    res = await db.execute(
        select(Cart).where(Cart.conversation_id == conversation_id).options(selectinload(Cart.items))
    )
    cart = res.scalar_one_or_none()
    lines, total, notes = [], 0.0, []
    permalink_parts: list[str] = []
    if cart:
        for item in cart.items:
            vr = await db.execute(
                select(Variant, Product)
                .join(Product, Product.id == Variant.product_id)
                .where(Variant.id == item.variant_id)
            )
            row = vr.first()
            if not row:
                continue
            variant, product = row
            price = float(variant.price or 0)
            stock = int(variant.inventory_quantity or 0)
            line_total = price * item.quantity
            total += line_total
            lines.append({
                "variant_id": variant.id,
                "product": product.title,
                "option": variant.title,
                "quantity": item.quantity,
                "unit_price": f"{price:.2f}",
                "line_total": f"{line_total:.2f}",
                "current_stock": stock,
            })
            if item.quantity > stock:
                notes.append(f"'{product.title}' now has only {stock} in stock (cart has {item.quantity})")
            if variant.platform_variant_id:
                permalink_parts.append(f"{variant.platform_variant_id}:{item.quantity}")

    checkout_url = None
    if permalink_parts:
        store = (await db.execute(select(Store).where(Store.id == store_id))).scalar_one_or_none()
        domain = shop_domain_for(store) if store and store.platform == "shopify" else None
        if domain:
            checkout_url = f"https://{domain}/cart/{','.join(permalink_parts)}"

    return {
        "items": lines,
        "item_count": sum(l["quantity"] for l in lines),
        "total": f"{total:.2f}",
        "checkout_url": checkout_url,
        "warnings": notes,
    }
