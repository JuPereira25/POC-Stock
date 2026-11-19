import styles from "./Header.module.css";
import billFill from "@/assets/Bell_fill.png";

interface HeaderProps {
    title?: string;
    notificationActive?: boolean;
}

export default function Header({
    title = "Página Inicial",
    notificationActive = false,
}: HeaderProps) {
    return (
        <header className={styles.header}>
            <h1 className={styles.title}>{title}</h1>
            <span
                className={`${styles.pending} ${notificationActive ? styles.notificationActive : ""}`}
                aria-label={notificationActive ? "Existe uma solicitação MQTT pendente" : "Nenhuma solicitação MQTT pendente"}
            >
                <img
                    src={billFill}
                    alt=""
                    className={styles.pendingIcon}
                    aria-hidden="true"
                />
            </span>
        </header>
    );
}
