export const SITE_ORIGIN = "https://www.sellmyslabs.net";
export const SHOP_ID = `${SITE_ORIGIN}/#shop`;

export const faqSchema = (faqs) => ({
  "@type": "FAQPage",
  mainEntity: faqs.map(([name, text]) => ({
    "@type": "Question",
    name,
    acceptedAnswer: { "@type": "Answer", text },
  })),
});

export const breadcrumbSchema = (trail) => ({
  "@type": "BreadcrumbList",
  itemListElement: trail.map(([name, path], index) => ({
    "@type": "ListItem",
    position: index + 1,
    name,
    item: `${SITE_ORIGIN}${path}`,
  })),
});

export const serviceSchema = ({ name, description, path }) => ({
  "@type": "Service",
  name,
  description,
  url: `${SITE_ORIGIN}${path}`,
  provider: { "@id": SHOP_ID },
  areaServed: { "@type": "Country", name: "United States" },
});

export default function JsonLd({ graph }) {
  const data = { "@context": "https://schema.org", "@graph": graph };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
