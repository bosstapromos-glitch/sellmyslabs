export default function PurchaseTerms({ terms }) {
  return (
    <section
      className="purchase-terms"
      aria-labelledby="purchase-terms-heading"
    >
      <h2 id="purchase-terms-heading">Purchase Terms</h2>
      <p className="hint">Version {terms.version}</p>
      {terms.sections.map(({ title, text }) => (
        <section key={title}>
          <h3>{title}</h3>
          <p>{text}</p>
        </section>
      ))}
    </section>
  );
}
