import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { HubConnectionBuilder } from "@microsoft/signalr";
import { StockAlertModal, type PendingOrder } from "@/components";
import { getHubUrl } from "@/services/appConfig";
import {
  createPendingOrder,
  dispatchKit,
  readPendingOrders,
  resolvePendingOrder as resolveRequest,
  StockApiError,
  type ProdutoSemEstoque,
} from "./homeStorage";

type StationRequest = { id: string; station: string; message: string };
type ResultModal =
  | { type: "success"; station: string; serialKit: string }
  | { type: "not-found"; station: string }
  | { type: "insufficient"; station: string; produtos: ProdutoSemEstoque[] };

type StockContextValue = {
  pendingOrders: PendingOrder[];
  handlePendingOrder: (order: PendingOrder) => void;
  hasMqttPending: boolean;
};

const STOCK_REQUEST_MESSAGE = "Nova solicitação de material recebida.";

const StockContext = createContext<StockContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useStockAlerts = () => {
  const value = useContext(StockContext);
  if (!value) throw new Error("useStockAlerts deve ser usado dentro de StockAlertsProvider");
  return value;
};

export function StockAlertsProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<StationRequest[]>([]);
  const [lowAlerts, setLowAlerts] = useState<PendingOrder[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [pendingRequest, setPendingRequest] = useState<PendingOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [resultModal, setResultModal] = useState<ResultModal | null>(null);

  const liveRequest = requests[0] ?? null;
  const activeRequest = pendingRequest
    ? { station: pendingRequest.station, message: pendingRequest.description }
    : liveRequest;
  const lowAlert = lowAlerts[0] ?? null;
  const showRequestModal = activeRequest !== null && resultModal === null;

  const reload = useCallback(async () => setPendingOrders(await readPendingOrders()), []);

  useEffect(() => {
    void readPendingOrders()
      .then(setPendingOrders)
      .catch((reason) => console.error("Não foi possível carregar as pendências de estoque.", reason));
  }, []);

  useEffect(() => {
    const connection = new HubConnectionBuilder().withUrl(getHubUrl()).withAutomaticReconnect().build();
    connection.on("StockAlertReceived", ({ station }: { station: string }) =>
      setRequests((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          station,
          message: STOCK_REQUEST_MESSAGE,
        },
      ]),
    );
    connection.start().catch((reason) => console.error("Não foi possível conectar aos alertas.", reason));
    return () => {
      connection.stop().catch(() => undefined);
    };
  }, []);

  const markResolved = useCallback(async (id: number) => {
    await resolveRequest(id);
    setPendingOrders((current) => current.filter((item) => item.id !== id));
    setLowAlerts((current) => current.filter((item) => item.id !== id));
  }, []);

  const handlePendingOrder = useCallback((order: PendingOrder) => {
    if (order.tipo === "solicitacao") {
      setPendingRequest(order);
      setError("");
      setResultModal(null);
    } else {
      void markResolved(order.id);
    }
  }, [markResolved]);

  const clearActiveRequest = () => {
    if (pendingRequest) setPendingRequest(null);
    else setRequests((current) => current.slice(1));
  };

  const sendKit = async (serialKit: string) => {
    if (!activeRequest || saving) return;

    const serial = serialKit.trim();
    if (!serial) return;

    setSaving(true);
    setError("");

    try {
      const result = await dispatchKit(activeRequest.station, serial, pendingRequest?.id);
      clearActiveRequest();
      setLowAlerts((current) => [...current, ...result.produtosAbaixo]);
      setResultModal({ type: "success", station: activeRequest.station, serialKit: result.serialKit || serial });
      await reload();
    } catch (reason) {
      if (reason instanceof StockApiError && reason.status === 404) {
        setResultModal({ type: "not-found", station: activeRequest.station });
        setError("");
      } else if (reason instanceof StockApiError && reason.status === 409) {
        setResultModal({
          type: "insufficient",
          station: activeRequest.station,
          produtos: reason.produtosSemEstoque,
        });
        setError("");
      } else {
        setError(reason instanceof Error ? reason.message : "Não foi possível registrar a saída.");
      }
    } finally {
      setSaving(false);
    }
  };

  const postpone = async () => {
    if (!liveRequest || pendingRequest) return;
    setSaving(true);
    setError("");
    try {
      const item = await createPendingOrder(liveRequest.station, liveRequest.message);
      setPendingOrders((current) => [...current, item]);
      setRequests((current) => current.slice(1));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível criar a pendência.");
    } finally {
      setSaving(false);
    }
  };

  const hasMqttPending = requests.length > 0 || pendingOrders.some((item) => item.tipo === "solicitacao");

  const insufficientMessage =
    resultModal?.type === "insufficient"
      ? [
          "Não é possível liberar o kit. As peças abaixo estão sem estoque suficiente:",
          ...resultModal.produtos.map((item) => {
            if (item.quantidadeDisponivel <= 0) {
              return `• ${item.produto} — sem estoque (necessário: ${item.quantidadeNecessaria})`;
            }
            return `• ${item.produto} — disponível: ${item.quantidadeDisponivel}, necessário: ${item.quantidadeNecessaria}`;
          }),
        ].join("\n")
      : "";

  return (
    <StockContext.Provider value={{ pendingOrders, handlePendingOrder, hasMqttPending }}>
      {children}

      <StockAlertModal
        open={showRequestModal}
        station={activeRequest?.station}
        message={activeRequest?.message ?? ""}
        closeLabel={pendingRequest ? "Cancelar" : "Pendente"}
        showResolve={false}
        scanEnabled
        onScan={(serial) => void sendKit(serial)}
        onClose={() => (pendingRequest ? setPendingRequest(null) : void postpone())}
        busy={saving}
        error={error}
      />

      <StockAlertModal
        open={resultModal?.type === "success"}
        variant="success"
        alertLabel="Saída registrada"
        station={resultModal?.type === "success" ? resultModal.station : undefined}
        message={
          resultModal?.type === "success"
            ? `Kit ${resultModal.serialKit} registrado com sucesso.\nA saída dos produtos foi realizada.`
            : ""
        }
        hideActions
        autoCloseMs={1500}
        showResolve={false}
        onClose={() => setResultModal(null)}
      />

      <StockAlertModal
        open={resultModal?.type === "not-found"}
        variant="error"
        alertLabel="Kit não encontrado"
        station={resultModal?.type === "not-found" ? resultModal.station : activeRequest?.station}
        message="Nenhum kit encontrado"
        closeLabel="Tentar novamente"
        showResolve={false}
        onClose={() => setResultModal(null)}
      />

      <StockAlertModal
        open={resultModal?.type === "insufficient"}
        variant="error"
        alertLabel="Estoque insuficiente"
        station={resultModal?.type === "insufficient" ? resultModal.station : activeRequest?.station}
        message={insufficientMessage}
        closeLabel="Entendi"
        showResolve={false}
        onClose={() => setResultModal(null)}
      />

      <StockAlertModal
        open={activeRequest === null && resultModal === null && lowAlert !== null}
        alertLabel="Estoque abaixo do limite"
        station={lowAlert?.station}
        message={lowAlert ? `A saída foi registrada.\n${lowAlert.description}` : ""}
        closeLabel="Pendente"
        resolveLabel="Resolvido"
        onClose={() => setLowAlerts((current) => current.slice(1))}
        onResolve={() => lowAlert && void markResolved(lowAlert.id)}
      />
    </StockContext.Provider>
  );
}
