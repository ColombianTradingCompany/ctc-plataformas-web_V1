import type { Finca, GeneralInfo, Lot } from "../../data";
import type { FichaFormData } from "../fichaData";

export type PaneProps = {
  data: FichaFormData;
  onChange: (patch: Partial<FichaFormData>) => void;
  fincas: Finca[];
  onOpenNewFinca: () => void;
  lot: Lot;
  gi: GeneralInfo;
  onUploadCertFile: (certKey: string, file: File) => void;
  onUploadLotVideo: (file: File) => void;
};
