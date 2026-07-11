import { supplierCode } from "@/components/kaffetal-regal/data";
import type { ProducerContact } from "@/lib/bcpProducers";
import styles from "./shared.module.css";

// Compact contact line shown on incoming finca/lote cards so BCP can reach the
// producer. Server component (no interactivity) -- just formats the contact.
export function ProducerContactLine({ producer }: { producer: ProducerContact | undefined }) {
  if (!producer) return null;
  const bits = [
    producer.fullName,
    producer.companyName,
    producer.phone && `☎ ${producer.phone}${producer.whatsappConfirmed ? " (WhatsApp)" : ""}`,
    producer.email,
    producer.department,
  ].filter(Boolean);
  return (
    <p className={styles.meta}>
      <span className={styles.badge}>{supplierCode(producer.id)}</span> {bits.join(" · ")}
    </p>
  );
}
