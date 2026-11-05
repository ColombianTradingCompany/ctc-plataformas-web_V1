"use client";

import { Component, type ReactNode } from "react";

// ── CTCx OS · si el mapa de la portada falla (V6.19, F2) ─────────────────────
// La portada de la OS es la Hacienda. Si el mapa no se puede pintar, Inicio no se cae con él: vuelve a
// las tarjetas de antes (`enSuLugar`), con la lista de los módulos, los avisos y «Copiar contexto para
// Tailor». Es un límite propio de la portada; el de `(app)/error.tsx` queda para lo que falle fuera de él.

type Props = { enSuLugar: ReactNode; children: ReactNode };

export class SiElMapaFalla extends Component<Props, { fallo: boolean }> {
  state = { fallo: false };

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  componentDidCatch(error: unknown) {
    console.error("CTCx OS · el mapa de la portada falló; Inicio vuelve a las tarjetas", error);
  }

  render() {
    return this.state.fallo ? this.props.enSuLugar : this.props.children;
  }
}
