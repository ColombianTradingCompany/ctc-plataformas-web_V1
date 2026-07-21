import { ComingSoon } from "../ComingSoon";
import { CatalogoTabs } from "../catalogo/CatalogoTabs";

export default function BcpSubastasPage() {
  return (
    <div>
      <CatalogoTabs />
      <ComingSoon
        title="Subastas Tyrian"
        description="Aquí se administrará la subasta en vivo de los lotes de grado Tyrian, por mitades."
      />
    </div>
  );
}
