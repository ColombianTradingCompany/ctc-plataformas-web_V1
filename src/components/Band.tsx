import Image from "next/image";
import type { StaticImageData } from "next/image";

// `children` (2026-08-11): una franja puede llevar algo DEBAJO del pie —hoy los
// dos conceptos que Kaffetal Regal trae de ctcexport.com—. Es opcional, así que
// las franjas que ya existían no se enteran.
export function Band({
  image,
  eyebrow,
  heading,
  caption,
  children,
}: {
  image: StaticImageData | string;
  eyebrow: string;
  heading: React.ReactNode;
  caption: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="band">
      <Image
        src={image}
        alt=""
        fill
        sizes="100vw"
        style={{ objectFit: "cover" }}
      />
      <div className="wrap">
        <p className="eyebrow" style={{ color: "var(--accent-soft)" }}>
          {eyebrow}
        </p>
        <h2 style={{ marginTop: 12 }}>{heading}</h2>
        <p className="cap">{caption}</p>
        {children}
      </div>
    </section>
  );
}
