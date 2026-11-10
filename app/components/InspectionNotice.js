import { SLAB_INSPECTION_NOTICE } from "../../lib/inspection-policy";
import styles from "./InspectionNotice.module.css";

export default function InspectionNotice() {
  return (
    <aside className={styles.notice} aria-label="Slab inspection time">
      <strong>Slab inspection: 1–2 weeks after delivery</strong>
      <p>
        {SLAB_INSPECTION_NOTICE} Please accept an offer and confirm shipping
        details before sending items.{" "}
        <a href="/purchase-terms" target="_blank" rel="noopener noreferrer">
          Purchase terms
        </a>
      </p>
    </aside>
  );
}
