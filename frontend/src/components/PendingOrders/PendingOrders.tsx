import styles from "./PendingOrders.module.css";

export interface PendingOrder {
  id: number;
  station: string;
  description: string;
  tipo: "estoque" | "solicitacao";
}

interface PendingOrdersProps {
  orders?: PendingOrder[];
  onResolve: (order: PendingOrder) => void;
}

export default function PendingOrders({
  orders = [],
  onResolve,
}: PendingOrdersProps) {
  return (
    <section className={styles.card} aria-labelledby="pending-orders-title">
      <header className={styles.header}>
        <h2 id="pending-orders-title" className={styles.title}>
          Pendências de estoque
        </h2>
        <span className={styles.counter}>
          {orders.length} {orders.length === 1 ? "pendência" : "pendências"}
        </span>
      </header>

      <div className={styles.content}>
        {orders.length === 0 ? (
          <p className={styles.empty}>Nenhum pedido pendente.</p>
        ) : (
          <ul className={styles.list}>
            {orders.map((order) => (
              <li key={order.id} className={styles.item}>
                <div className={styles.orderInformation}>
                  <strong className={styles.station}>{order.station}</strong>
                  <span className={styles.description}>{order.description}</span>
                </div>
                <button
                  type="button"
                  className={styles.resolveButton}
                  onClick={() => onResolve(order)}
                  aria-label={`Marcar pendência do ${order.station} como resolvida`}
                >
                  Marcar como resolvido
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
