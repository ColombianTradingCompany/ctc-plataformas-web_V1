"use client";

// Print / save-as-PDF trigger for the EUDR dossier. Hidden when printing.
export function PrintButton() {
  return (
    <button className="btn btn-solid no-print" type="button" onClick={() => window.print()}>
      Imprimir / Guardar PDF
    </button>
  );
}
