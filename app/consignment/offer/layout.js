import AuthProvider from "../../components/AuthProvider";
export default function Layout({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
