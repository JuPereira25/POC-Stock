import {
  createPending,
  dispatchKit as dispatchMockKit,
  listPending,
  resolvePending,
} from "@/services/mockStore";

export type StockPendingOrder = {
  id: number;
  station: string;
  description: string;
  tipo: "estoque" | "solicitacao";
};

export type ProdutoSemEstoque = {
  produtoId: number;
  produto: string;
  quantidadeNecessaria: number;
  quantidadeDisponivel: number;
};

export class StockApiError extends Error {
  readonly status: number;
  readonly produtosSemEstoque: ProdutoSemEstoque[];

  constructor(message: string, status: number, produtosSemEstoque: ProdutoSemEstoque[] = []) {
    super(message);
    this.name = "StockApiError";
    this.status = status;
    this.produtosSemEstoque = produtosSemEstoque;
  }
}

export const dispatchKit = async (posto: string, serialKit: string, pendenciaId?: number) => {
  const result = dispatchMockKit(posto, serialKit, pendenciaId);
  if (!result.ok) throw new StockApiError(result.mensagem, result.status, result.produtosSemEstoque);
  return {
    serialKit: result.serialKit,
    posto: result.posto,
    produtosAbaixo: result.produtosAbaixo,
  };
};

export const readPendingOrders = async (): Promise<StockPendingOrder[]> => listPending();

export const createPendingOrder = async (posto: string, descricao: string): Promise<StockPendingOrder> =>
  createPending(posto, descricao);

export const resolvePendingOrder = async (id: number) => {
  if (!resolvePending(id)) throw new StockApiError("Pendência não encontrada.", 404);
};
