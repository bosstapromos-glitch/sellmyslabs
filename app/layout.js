import './globals.css';

export const metadata = {
  metadataBase: new URL('https://sellmyslabs.net'),
  title: {
    default: 'Sell My Slabs — Sell Your Graded Cards for Cash | PSA, CGC, BGS',
    template: '%s | Sell My Slabs',
  },
  description: 'Sell your graded cards for cash. We buy PSA, CGC & BGS slabs — Pokémon, football, baseball, basketball, hockey, soccer & One Piece. Get an offer within 24 hours. Fast payment, trusted buyers.',
  keywords: ['sell graded cards', 'sell PSA cards', 'sell CGC cards', 'sell BGS cards', 'sell pokemon cards for cash', 'graded card buyers', 'sell my slabs', 'sell sports cards', 'sell trading cards', 'card buyers near me', 'sell graded pokemon cards', 'sell graded sports cards', 'sell one piece cards', 'sell hockey cards', 'sell soccer cards', 'sell baseball cards', 'sell football cards', 'sell basketball cards', 'graded card buyers near me', 'sell PSA 10 cards', 'sell CGC cards for cash'],
  authors: [{ name: 'Sell My Slabs' }],
  creator: 'Sell My Slabs',
  publisher: 'Sell My Slabs',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  alternates: { canonical: 'https://sellmyslabs.net' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://sellmyslabs.net',
    siteName: 'Sell My Slabs',
    title: 'Sell My Slabs — Sell Your Graded Cards for Cash',
    description: 'We buy PSA, CGC & BGS graded cards. Pokémon, sports cards, One Piece & more. Get a competitive offer within 24 hours.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sell My Slabs — Sell Your Graded Cards for Cash',
    description: 'We buy PSA, CGC & BGS graded cards. Get an offer within 24 hours. Fast payment.',
  },
  other: {
    'theme-color': '#C8A961',
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Sell My Slabs",
    "url": "https://sellmyslabs.net",
    "description": "We buy PSA, CGC & BGS graded trading cards for cash. Pokémon, sports cards, One Piece and more. Competitive offers within 24 hours.",
    "priceRange": "$$",
    "areaServed": { "@type": "Country", "name": "United States" },
    "knowsAbout": ["Graded Trading Cards", "PSA Cards", "CGC Cards", "BGS Cards", "Pokémon Cards", "Sports Cards", "One Piece Cards"],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Sell My Slabs",
    "url": "https://sellmyslabs.net",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "What graded cards do you buy?", "acceptedAnswer": { "@type": "Answer", "text": "We buy PSA, CGC, and BGS graded cards across Pokémon, football, baseball, basketball, hockey, soccer, and One Piece categories." } },
      { "@type": "Question", "name": "How fast will I get an offer?", "acceptedAnswer": { "@type": "Answer", "text": "We review every submission individually and typically respond within 24 hours with an offer or update." } },
      { "@type": "Question", "name": "Is every card guaranteed to receive an offer?", "acceptedAnswer": { "@type": "Answer", "text": "No. We review every submission but offers are based on our current buying criteria, market conditions, and inventory needs. We will always respond to let you know either way." } },
      { "@type": "Question", "name": "How do I get paid?", "acceptedAnswer": { "@type": "Answer", "text": "Once you accept an offer and ship your cards, we process payment quickly. We support multiple payment methods for your convenience." } },
      { "@type": "Question", "name": "Can I submit multiple cards at once?", "acceptedAnswer": { "@type": "Answer", "text": "Yes! We offer both single card submission and bulk submission via CSV upload or manual multi-card entry for larger collections." } },
    ],
  },
];

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
        {jsonLd.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      </head>
      <body>
  {children}
  <script dangerouslySetInnerHTML={{ __html: `window.$crisp=[];window.CRISP_WEBSITE_ID="85fa75e1-15ae-4443-9de9-20db635429e9";(function(){var d=document;var s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s)})();` }} />
</body>
    </html>
  );
}
