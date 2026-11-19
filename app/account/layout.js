import { Header, Footer } from "../components/Shell";
import AuthProvider from "../components/AuthProvider";
export const metadata = {
  title: "Your requests",
  robots: { index: false, follow: false, nosnippet: true },
  referrer: "no-referrer",
  alternates: { canonical: null },
  openGraph: {
    title: "Your SellMySlabs account",
    description: "Sign in to view your private requests and offers.",
  },
};
export default function Layout({ children }) {
  return (
    <AuthProvider>
      <Header context="account" />
      {children}
      <Footer compact />
    </AuthProvider>
  );
}
