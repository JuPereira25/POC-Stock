import { Header, PendingOrders } from "@/components";
import { useStockAlerts } from "./StockAlertsContext";
import styles from "./Home.module.css";

export default function Home() {
  const { pendingOrders, handlePendingOrder, hasMqttPending } = useStockAlerts();
  return <main className={styles.main}>
    <Header title="Página Inicial" notificationActive={hasMqttPending} />
    <section className={styles.content}>
      <PendingOrders orders={pendingOrders} onResolve={handlePendingOrder} />
    </section>
  </main>;
}
