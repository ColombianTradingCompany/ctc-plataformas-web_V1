"use client";

import { useToast } from "@/components/Toast";

export function ToastButton({
  message,
  className,
  style,
  children,
}: {
  message: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const { showToast } = useToast();
  return (
    <button className={className} style={style} onClick={() => showToast(message)}>
      {children}
    </button>
  );
}
