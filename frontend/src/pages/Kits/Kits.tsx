import { DataGrid } from "@/components";
import styles from "./Kits.module.css";

const Kits = () => (
  <main className={styles.main}>
    <header className={styles.pageHeader}>
      <h1>Kits</h1>
    </header>
    <section className={styles.content}>
      <DataGrid />
    </section>
  </main>
);

export default Kits;
