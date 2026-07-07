import Image from "next/image";
import type { StaticImageData } from "next/image";

export function Band({
  image,
  eyebrow,
  heading,
  caption,
}: {
  image: StaticImageData | string;
  eyebrow: string;
  heading: React.ReactNode;
  caption: string;
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
      </div>
    </section>
  );
}
