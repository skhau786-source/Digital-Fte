import "./globals.css";
import { LanguageProvider } from "./lib/LanguageContext";
import { LanguageSelectorModal } from "./components/LanguageSelectorModal";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ChatbotLoader } from "./components/ChatbotLoader";
import { AuthProvider } from "./components/auth/AuthProvider";
import { StoreProvider } from "./components/providers/StoreProvider";
import { ToastProvider } from "./components/providers/ToastProvider";

import { Metadata } from "next";
import { BRAND_CONFIG } from "./lib/branding";

export const metadata: Metadata = {
  title: `${BRAND_CONFIG.name} | ${BRAND_CONFIG.tagline}`,
  description: BRAND_CONFIG.heroSubtitle,
  icons: {
    icon: BRAND_CONFIG.logoPath,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

  return (
    <html lang="en">
      <body>
        <GoogleOAuthProvider clientId={googleClientId}>
          <AuthProvider>
            <StoreProvider>
              <ToastProvider>
                <LanguageProvider>
                  <LanguageSelectorModal />
                  {children}
                  <ChatbotLoader />
                </LanguageProvider>
              </ToastProvider>
            </StoreProvider>
          </AuthProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
