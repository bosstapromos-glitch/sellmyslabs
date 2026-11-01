"use client";
import { Header, Footer } from "./components/Shell";

export default function ErrorPage({ retry }) {
  return (
    <>
      <Header />
      <main id="main" className="wrap recovery-page">
        <h1>This page couldn’t load.</h1>
        <p>
          Please try again. If you were sending a request or saving an offer,
          check its status before repeating the action.
        </p>
        <div className="actions">
          <button className="button" onClick={() => retry()}>
            Try again
          </button>
          <a className="text-link" href="/">
            Back to home
          </a>
        </div>
      </main>
      <Footer compact />
    </>
  );
}
