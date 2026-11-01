import { Header, Footer } from "./components/Shell";

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="wrap recovery-page">
        <span className="eyebrow">PAGE NOT FOUND</span>
        <h1>That page isn’t here.</h1>
        <p>
          The link may have changed. You can return home or start an offer
          request.
        </p>
        <div className="actions">
          <a className="button" href="/">
            Back to home
          </a>
          <a className="text-link" href="/sell">
            Request an offer
          </a>
        </div>
      </main>
      <Footer compact />
    </>
  );
}
