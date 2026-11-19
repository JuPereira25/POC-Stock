import { useEffect, useId, useRef, type FormEvent, type MouseEvent } from "react";
import styles from "./StockAlertModal.module.css";

type StockAlertModalProps = {
  open: boolean;
  onClose: () => void;
  onResolve?: () => void;
  alertLabel?: string;
  station?: string;
  message: string;
  closeLabel?: string;
  resolveLabel?: string;
  /** Quando true, mostra input para bipar o código do kit com o scanner. */
  scanEnabled?: boolean;
  onScan?: (serial: string) => void;
  /** Esconde o botão de resolver; fica só o de pendente/fechar. */
  showResolve?: boolean;
  /** Esconde a barra de ações (útil em toasts que fecham sozinhos). */
  hideActions?: boolean;
  /** Fecha automaticamente após N ms. */
  autoCloseMs?: number;
  busy?: boolean;
  error?: string;
  variant?: "alert" | "success" | "error";
};

export default function StockAlertModal({
  open,
  onClose,
  onResolve,
  alertLabel = "Atenção Estoque!",
  station = "Posto 01",
  message,
  closeLabel = "Fechar por agora",
  resolveLabel = "Resolvida",
  scanEnabled = false,
  onScan,
  showResolve = true,
  hideActions = false,
  autoCloseMs,
  busy = false,
  error,
  variant = "alert",
}: StockAlertModalProps) {
  const titleId = useId();
  const messageId = useId();
  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, busy]);

  useEffect(() => {
    if (!open || !autoCloseMs || busy) return;

    const timer = window.setTimeout(onClose, autoCloseMs);
    return () => window.clearTimeout(timer);
  }, [open, autoCloseMs, onClose, busy]);

  useEffect(() => {
    if (!open || !scanEnabled || busy) return;

    const focusScanner = () => scanInputRef.current?.focus();
    focusScanner();
    const timer = window.setInterval(focusScanner, 400);
    return () => window.clearInterval(timer);
  }, [open, scanEnabled, busy]);

  if (!open) return null;

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (hideActions) return;
    if (event.target === event.currentTarget && !busy) onClose();
  };

  const handleScanSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !onScan) return;

    const value = scanInputRef.current?.value.trim() ?? "";
    if (!value) return;

    if (scanInputRef.current) scanInputRef.current.value = "";
    onScan(value);
  };

  const modalClass = [
    styles.modal,
    variant === "success" ? styles.successModal : "",
    variant === "error" ? styles.errorModal : "",
  ]
    .filter(Boolean)
    .join(" ");

  const headerClass = [
    styles.header,
    variant === "success" ? styles.successHeader : "",
    variant === "error" ? styles.errorHeader : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.backdrop} onMouseDown={handleBackdropClick}>
      <section
        className={modalClass}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
      >
        <header className={headerClass}>
          <span id={titleId}>{alertLabel}</span>
          <strong className={styles.station}>{station}</strong>
        </header>

        <div className={styles.content}>
          <p id={messageId}>{message}</p>

          {scanEnabled && (
            <form className={styles.scanField} onSubmit={handleScanSubmit}>
              <label htmlFor={`${titleId}-scan`}>
                <span>Bipe o código do kit</span>
                <input
                  id={`${titleId}-scan`}
                  ref={scanInputRef}
                  type="text"
                  name="serialKit"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={busy}
                  placeholder="Aguardando leitura do scanner…"
                  aria-label="Código do kit"
                />
              </label>
              {busy && <p className={styles.busyHint}>Registrando saída…</p>}
            </form>
          )}

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          {!hideActions && (
            <div className={`${styles.actions} ${!showResolve || !onResolve ? styles.actionsSingle : ""}`}>
              <button type="button" className={styles.closeButton} onClick={onClose} disabled={busy}>
                {closeLabel}
              </button>
              {showResolve && onResolve && (
                <button
                  type="button"
                  className={styles.resolveButton}
                  onClick={onResolve}
                  disabled={busy}
                  autoFocus={!scanEnabled}
                >
                  {busy ? "Salvando..." : resolveLabel}
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
