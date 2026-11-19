import type { FC } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components";
import homeIconUrl from "@/assets/home.png";
import kitsIconUrl from "@/assets/kits.png";
import productIconUrl from "@/assets/product.png";
import styles from "./AppLayout.module.css";
import { StockAlertsProvider } from "@/pages/Home/StockAlertsContext";

const IconImage: FC<{ src: string; className?: string }> = ({ src, className }) => (
  <img src={src} alt="" className={className} />
);

const HomeIcon: FC<{ className?: string }> = ({ className }) => <IconImage src={homeIconUrl} className={className} />;
const KitsIcon: FC<{ className?: string }> = ({ className }) => <IconImage src={kitsIconUrl} className={className} />;
const ProductIcon: FC<{ className?: string }> = ({ className }) => <IconImage src={productIconUrl} className={className} />;

export default function AppLayout() {
  return (
    <StockAlertsProvider><div className={styles.layout}>
      <Sidebar
        items={[
          { label: "Página Inicial", href: "/", icon: HomeIcon },
          { label: "Kits", href: "/kits", icon: KitsIcon },
          { label: "Cadastrar Kits", href: "/kits/cadastrar", icon: ProductIcon },
          { label: "Cadastrar Produto", href: "/produtos/cadastrar", icon: ProductIcon },
        ]}
      />
      <Outlet />
    </div></StockAlertsProvider>
  );
}
