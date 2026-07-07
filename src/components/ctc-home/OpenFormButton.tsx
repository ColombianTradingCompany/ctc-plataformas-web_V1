"use client";

import { useContactModal } from "./ContactModal";

export function OpenFormButton({
  formKey,
  className,
  style,
  children,
}: {
  formKey: "general" | "tech" | "cocreate" | "varietales";
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const { openForm } = useContactModal();
  return (
    <button className={className} style={style} onClick={() => openForm(formKey)}>
      {children}
    </button>
  );
}
