import { codigoCtc } from "@/components/kaffetal-regal/data";
import type { ProducerContact } from "@/lib/bcpProducers";
import styles from "@/components/panel/shared.module.css";

// Compact contact line shown on incoming finca/lote cards so BCP can reach the
// producer. Server component (no interactivity) -- just formats the contact.
// V6.23 (TAR-149): el código del productor es el GUARDADO (`producer_profiles.codigo`); quien llama lo lee y lo pasa en `codigo`
// (`codigosDeProductores`), nunca se calcula del id.
export function ProducerContactLine({ producer, codigo }: { producer: ProducerContact | undefined; codigo: string | null | undefined }) {
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
      <span className={styles.badge}>{codigoCtc(codigo)}</span> {bits.join(" · ")}
    </p>
  );
}
