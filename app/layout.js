import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};
export const metadata = {
  metadataBase: new URL("https://www.sellmyslabs.net"),
  title: {
    default: "Sell Pokémon, Sports Cards & Sealed Products | SellMySlabs",
    template: "%s | SellMySlabs",
  },
  description:
    "Sell graded cards, raw Pokémon and sports cards, and sealed products to Lifestyle Cards & Collectibles in Twin Falls, Idaho. Request a personal offer.",
  twitter: { card: "summary_large_image", images: ["/opengraph-image?v=2"] },
  icons: {
    icon: "/favicon.svg",
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  applicationName: "SellMySlabs",
  appleWebApp: {
    capable: true,
    title: "SellMySlabs",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: "SellMySlabs | We buy cards & sealed products",
    description:
      "Request an offer for graded cards, raw cards and sealed products.",
    url: "https://www.sellmyslabs.net",
    images: [
      {
        url: "/opengraph-image?v=2",
        width: 1200,
        height: 630,
        alt: "SellMySlabs — Graded cards, raw cards and sealed products",
      },
    ],
    type: "website",
    siteName: "SellMySlabs",
    locale: "en_US",
  },
};
export default function RootLayout({ children }) {
  const content = (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {children}
    </>
  );
  return (
    <html lang="en">
      <body>
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
          <ClerkProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl="/account"
            signUpFallbackRedirectUrl="/account"
            localization={{
              signIn: {
                emailCode: {
                  subtitle: "Use the code from your email to sign in.",
                },
                password: { subtitle: "Continue to your SellMySlabs account." },
                start: {
                  title: "Sign in",
                  titleCombined: "Sign in",
                  subtitle: "See your requests, offers and purchase progress.",
                  subtitleCombined:
                    "See your requests, offers and purchase progress.",
                },
              },
              signUp: {
                emailCode: { subtitle: "Enter the code to verify your email." },
                start: {
                  title: "Create your account",
                  titleCombined: "Create your account",
                  subtitle:
                    "Use the email on your request to see your items, offers and progress.",
                  subtitleCombined:
                    "Use the email on your request to see your items, offers and progress.",
                },
              },
            }}
            appearance={{
              variables: {
                colorPrimary: "#0071e3",
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
                borderRadius: "12px",
              },
            }}
          >
            {content}
          </ClerkProvider>
        ) : (
          content
        )}
      </body>
    </html>
  );
}
