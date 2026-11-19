import { notFound } from "next/navigation";
import { Header, Footer } from "../components/Shell";
import JsonLd, {
  faqSchema,
  breadcrumbSchema,
  serviceSchema,
} from "../components/JsonLd";
import { BUSINESS } from "../../lib/site";
import { SELL_GUIDES, SELL_PROCESS, sellGuide } from "../../lib/sell-guides";
import styles from "./Guide.module.css";

export const dynamicParams = false;
export const generateStaticParams = () =>
  SELL_GUIDES.map(({ slug }) => ({ guide: slug }));

export async function generateMetadata({ params }) {
  const guide = sellGuide((await params).guide);
  if (!guide) return {};
  const path = `/${guide.slug}`;
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: path },
    openGraph: {
      title: `${guide.title} | SellMySlabs`,
      description: guide.description,
      url: path,
    },
  };
}

export default async function Page({ params }) {
  const guide = sellGuide((await params).guide);
  if (!guide) notFound();
  const path = `/${guide.slug}`;
  const others = SELL_GUIDES.filter((g) => g.slug !== guide.slug);
  return (
    <>
      <JsonLd
        graph={[
          breadcrumbSchema([
            ["Home", "/"],
            [guide.label, path],
          ]),
          serviceSchema({
            name: guide.title,
            description: guide.description,
            path,
          }),
          faqSchema(guide.faqs),
        ]}
      />
      <Header />
      <main id="main" className={`wrap ${styles.page}`}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{guide.label}</span>
        </nav>
        <span className="eyebrow">{guide.eyebrow}</span>
        <h1>{guide.heading}</h1>
        <p className={styles.lead}>{guide.lead}</p>
        <div className="actions">
          <a className="button" href="/sell">
            Request an offer
          </a>
          <a className="text-link" href="/#how-it-works">
            See how it works
          </a>
        </div>
        <p className="micro">No obligation to sell.</p>

        {guide.sections.map((section) => (
          <section className={styles.section} key={section.heading}>
            <h2>{section.heading}</h2>
            {section.text?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.list && (
              <ul>
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {section.link && (
              <a className="text-link" href={section.link[0]}>
                {section.link[1]}
              </a>
            )}
          </section>
        ))}

        <section className={styles.section}>
          <h2>{SELL_PROCESS.heading}</h2>
          <ol>
            {SELL_PROCESS.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <a className="text-link" href="/purchase-terms">
            Read the purchase terms
          </a>
        </section>

        {guide.showShop && (
          <section className={styles.section}>
            <h2>{BUSINESS.name}</h2>
            <p>{BUSINESS.address}</p>
            <p className={styles.contact}>
              <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>
              <a href={`mailto:${BUSINESS.email}`}>Email our team</a>
              <a href={BUSINESS.google} target="_blank" rel="noreferrer">
                Find us on Google
              </a>
            </p>
          </section>
        )}

        <section className={styles.section}>
          <h2>Common questions</h2>
          {guide.faqs.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </section>

        <section className={styles.cta}>
          <h2>Let’s see what you’ve got.</h2>
          <p>Send your item details and photos. We’ll take a look.</p>
          <a className="button" href="/sell">
            Request an offer
          </a>
        </section>

        <nav className={styles.more} aria-label="More items we buy">
          <h2>More we buy</h2>
          <ul>
            {others.map((other) => (
              <li key={other.slug}>
                <a href={`/${other.slug}`}>{other.label}</a>
              </li>
            ))}
            <li>
              <a href="/consignment">Consignment</a>
            </li>
          </ul>
        </nav>
      </main>
      <Footer />
    </>
  );
}
