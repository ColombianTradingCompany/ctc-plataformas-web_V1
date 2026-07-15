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
  // Videos adicionales de B4 (slots 2 y 3): viven en datasheet.extra_video_assets,
  // no en lots.video_asset_id (que sigue siendo el video principal).
  onUploadExtraVideo: (slot: number, file: File) => void;
};
