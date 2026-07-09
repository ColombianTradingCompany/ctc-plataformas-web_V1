import type { Finca } from "../../data";
import type { FichaFormData } from "../fichaData";

export type PaneProps = {
  data: FichaFormData;
  onChange: (patch: Partial<FichaFormData>) => void;
  fincas: Finca[];
  onOpenNewFinca: () => void;
};
