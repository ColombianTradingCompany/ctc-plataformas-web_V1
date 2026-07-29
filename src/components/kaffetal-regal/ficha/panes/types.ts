import type { Finca, FincaCertificate, GeneralInfo, Lot } from "../../data";
import type { FichaFormData } from "../fichaData";

export type PaneProps = {
  data: FichaFormData;
  onChange: (patch: Partial<FichaFormData>) => void;
  fincas: Finca[];
  /** F2: certificados de las fincas del productor (F1) — A4 deriva de aquí los
   *  claims del lote; la Ficha nunca los edita. */
  fincaCerts: FincaCertificate[];
  onOpenNewFinca: () => void;
  lot: Lot;
  gi: GeneralInfo;
  onUploadCertFile: (certKey: string, file: File, onProgress?: (fraction: number) => void) => Promise<boolean>;
  /** La sección que se está viendo ya fue enviada (fieldset deshabilitado).
   *  A3/A4 lo usan para no mostrar un input de archivo muerto. */
  viewingLocked?: boolean;
  onUploadLotVideo: (file: File, onProgress?: (fraction: number) => void) => Promise<boolean>;
  // Videos adicionales de B4 (slots 2 y 3): viven en datasheet.extra_video_assets,
  // no en lots.video_asset_id (que sigue siendo el video principal).
  onUploadExtraVideo: (slot: number, file: File, onProgress?: (fraction: number) => void) => Promise<boolean>;
};
