# ═══════════════════════════════════════════════════════════════
# customer_support / agent / product_search.py
#
# PURPOSE: Product lookup over the Inventory Sync Agent's live tables
#          (products + variants). Fuzzy / partial name matching, category
#          and attribute search (fabric, color…) and Roman Urdu terms.
#          Everything returned comes from the database; this module never
#          invents or defaults a price or stock figure.
# ═══════════════════════════════════════════════════════════════

import difflib
import json
import re
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.sdk.models.base import Product, Variant

# Roman Urdu → English search vocabulary. This is a translation aid for
# *queries* only; it contains no product data.
ROMAN_URDU_TERMS = {
    # colours
    "surkh": "red", "laal": "red", "lal": "red", "neela": "blue", "nila": "blue",
    "kala": "black", "kaala": "black", "safaid": "white", "safed": "white",
    "sufaid": "white", "hara": "green", "peela": "yellow", "pila": "yellow",
    "gulabi": "pink", "narangi": "orange", "jamni": "purple", "bhura": "brown",
    "sunehri": "golden", "chandi": "silver",
    # fabrics / materials
    "kapra": "fabric", "kapray": "fabric", "kapre": "fabric", "kaprey": "fabric",
    "sooti": "cotton", "suti": "cotton", "soti": "cotton", "reshmi": "silk",
    "resham": "silk", "oon": "wool", "unni": "wool", "chamra": "leather",
    "chamda": "leather", "malmal": "muslin", "chappal": "sandals", "chappals": "sandals",
    "slipper": "slippers",
    # garments / goods
    "joota": "shoes", "jootay": "shoes", "jutti": "shoes", "juti": "shoes",
    "qameez": "shirt", "kameez": "shirt", "kamiz": "shirt", "shalwar": "trouser",
    "chadar": "shawl", "chaadar": "shawl", "topi": "cap",
    "ghari": "watch", "gharri": "watch", "baag": "bag", "thaili": "bag",
    "chashma": "glasses", "bachon": "kids", "bacho": "kids",
    "bachay": "kids", "bacha": "kids", "mardana": "men", "zanana": "women",
    "ladies": "women", "gents": "men",
}

# Generic term -> terms a catalog is likely to use instead. Query-side only.
SYNONYMS = {
    "shoes": {"footwear", "sandal", "sandals", "sneakers", "loafers", "boots", "slippers", "khussa"},
    "fabric": {"cloth", "lawn", "cotton", "silk", "linen", "wool", "suit", "unstitched", "material"},
    "trouser": {"pants", "trousers", "shalwar"},
    "shirt": {"kameez", "top", "tee", "tshirt", "kurta"},
    "shawl": {"wrap", "stole", "scarf", "dupatta"},
    "bag": {"handbag", "purse", "backpack", "tote"},
    "watch": {"watches", "wristwatch"},
    "kids": {"children", "child", "boys", "girls"},
}

# Words that carry no product meaning (English + Roman Urdu fillers).
STOPWORDS = {
    "the", "a", "an", "is", "are", "do", "you", "have", "has", "any", "of", "for",
    "in", "on", "me", "my", "i", "to", "and", "or", "with", "show", "tell", "about",
    "what", "which", "how", "much", "many", "price", "cost", "stock", "available",
    "please", "pls", "want", "need", "looking", "look", "get", "can", "u", "ur",
    "kya", "hai", "hain", "ka", "ki", "ke", "ko", "mein", "main", "mujhe",
    "chahiye", "chahie", "kitna", "kitne", "kitni", "batao", "bataye", "dikhao",
    "milay", "milega", "milegi", "aap", "ap", "k", "ya", "aur", "se", "koi",
    "ye", "yeh", "wo", "woh", "kahan", "rate", "qeemat", "keemat", "daam",
}

_WORD = re.compile(r"[a-z0-9]+")


def _normalize(text: str) -> str:
    return re.sub(r"<[^>]+>", " ", text or "").lower()


def query_tokens(query: str) -> list[str]:
    """Tokenize a customer query: lower-case, translate Roman Urdu, drop fillers."""
    out: list[str] = []
    for w in _WORD.findall((query or "").lower()):
        if w in STOPWORDS:
            continue
        out.append(ROMAN_URDU_TERMS.get(w, w))
    return out


def _stem(w: str) -> str:
    if len(w) > 4 and w.endswith("ies"):
        return w[:-3] + "y"
    if len(w) > 4 and re.search(r"(ch|sh|x|ss)es$", w):
        return w[:-2]
    if len(w) > 3 and w.endswith("s") and not w.endswith("ss"):
        return w[:-1]
    return w


def _token_hit(token: str, words: set[str], text: str) -> float:
    """Best hit over the token and its synonyms (synonyms count slightly less)."""
    best = _token_hit_exact(token, words, text)
    for alt in SYNONYMS.get(token) or SYNONYMS.get(_stem(token), ()):
        best = max(best, 0.9 * _token_hit_exact(alt, words, text))
    return best


def _token_hit_exact(token: str, words: set[str], text: str) -> float:
    """1.0 exact word, 0.8 substring, up to 0.7 fuzzy (typo tolerant), else 0."""
    t = _stem(token)
    if t in words or token in words:
        return 1.0
    if len(t) >= 3 and t in text:
        return 0.8
    if len(t) >= 4:
        best = max(
            (difflib.SequenceMatcher(None, t, w).ratio() for w in words if abs(len(w) - len(t)) <= 3),
            default=0.0,
        )
        if best >= 0.8:
            return 0.7 * best
    return 0.0


@dataclass
class ProductMatch:
    product: Product
    variants: list[Variant]
    score: float


def _haystacks(p: Product, variants: list[Variant]) -> tuple[str, str]:
    """(primary: title/type/vendor/variant options, secondary: description/extra_data)."""
    primary = " ".join(
        [p.title or "", p.product_type or "", p.vendor or ""] + [v.title or "" for v in variants]
    )
    extra = json.dumps(p.extra_data or {}, ensure_ascii=False) if p.extra_data else ""
    secondary = f"{_normalize(p.description)} {extra.lower()}"
    return _normalize(primary), secondary


async def load_store_products(db: AsyncSession, store_id: int) -> list[Product]:
    res = await db.execute(
        select(Product)
        .where(Product.store_id == store_id, Product.status == "active")
        .options(selectinload(Product.variants))
    )
    return list(res.scalars().all())


async def search_products(
    db: AsyncSession,
    store_id: int,
    query: str = "",
    category: str = "",
    attributes: dict | None = None,
    in_stock_only: bool = False,
    limit: int = 5,
) -> list[ProductMatch]:
    """Rank the store's active products against a free-text query.

    ``category`` matches product_type/title/vendor, ``attributes`` (e.g.
    {"color": "red", "fabric": "cotton"}) must appear in variant options,
    title, description or extra_data. All terms may be Roman Urdu.
    """
    products = await load_store_products(db, store_id)
    q_tokens = query_tokens(query)
    cat_tokens = query_tokens(category)
    attr_tokens: list[str] = []
    for v in (attributes or {}).values():
        attr_tokens += query_tokens(str(v))

    matches: list[ProductMatch] = []
    for p in products:
        variants = list(p.variants)
        if in_stock_only and not any((v.inventory_quantity or 0) > 0 for v in variants):
            continue
        primary, secondary = _haystacks(p, variants)
        words_primary = set(_WORD.findall(primary))
        words_secondary = set(_WORD.findall(secondary))

        score = 0.0
        # Category and attributes are filters: every one must hit somewhere.
        ok = True
        for tok in cat_tokens + attr_tokens:
            hit = max(
                _token_hit(tok, words_primary, primary),
                0.9 * _token_hit(tok, words_secondary, secondary),
            )
            if hit < 0.5:
                ok = False
                break
            score += hit
        if not ok:
            continue

        if q_tokens:
            hits = [
                max(
                    _token_hit(tok, words_primary, primary),
                    _token_hit(tok, words_secondary, secondary) * 0.5,
                )
                for tok in q_tokens
            ]
            matched = [h for h in hits if h > 0]
            # A majority of meaningful query tokens must match, so one stray
            # word does not return unrelated products.
            if not matched or len(matched) / len(hits) < 0.5:
                continue
            score += sum(hits)
        elif not (cat_tokens or attr_tokens):
            score = 0.1  # browse everything

        matches.append(ProductMatch(p, variants, score))

    matches.sort(key=lambda m: (-m.score, (m.product.title or "").lower()))
    return matches[: max(1, min(limit, 10))]


async def get_product(db: AsyncSession, store_id: int, product_id: int) -> ProductMatch | None:
    res = await db.execute(
        select(Product)
        .where(Product.id == product_id, Product.store_id == store_id)
        .options(selectinload(Product.variants))
    )
    p = res.scalar_one_or_none()
    if not p:
        return None
    return ProductMatch(p, list(p.variants), 1.0)


def product_to_dict(m: ProductMatch) -> dict:
    """Tool-result shape. Price/stock are verbatim DB values."""
    p = m.product
    desc = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", p.description or "")).strip()
    return {
        "product_id": p.id,
        "title": p.title,
        "category": p.product_type or None,
        "vendor": p.vendor or None,
        "description": desc[:400] or None,
        "variants": [
            {
                "variant_id": v.id,
                "option": v.title,
                "sku": v.sku or None,
                "price": f"{float(v.price or 0):.2f}",
                "compare_at_price": f"{float(v.compare_at_price):.2f}" if v.compare_at_price else None,
                "stock": int(v.inventory_quantity or 0),
                "in_stock": (v.inventory_quantity or 0) > 0,
            }
            for v in m.variants
        ],
    }
