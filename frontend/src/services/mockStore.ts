export type MockProduct = {
  id: number;
  nome: string;
  qtd: number;
  status: boolean;
  qrcode: string;
};

export type MockKitRow = {
  id: number;
  serialKit: string;
  produtoId: number;
  produto: string;
  quantidade: number;
  status: boolean;
  qrcode: string | null;
};

export type MockPending = {
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

export type DispatchResult =
  | { ok: true; serialKit: string; posto: string; produtosAbaixo: MockPending[] }
  | { ok: false; status: 404 | 409; mensagem: string; produtosSemEstoque: ProdutoSemEstoque[] };

type KitItem = {
  id: number;
  serialKit: string;
  produtoId: number;
  quantidade: number;
};

let nextProductId = 7;
let nextKitItemId = 8;
let nextPendingId = 4;

const products: MockProduct[] = [
  { id: 1, nome: "SSD NVMe 512GB", qtd: 24, status: true, qrcode: "QR-SSD-512" },
  { id: 2, nome: "Memória DDR4 16GB", qtd: 18, status: true, qrcode: "QR-RAM-16" },
  { id: 3, nome: "Placa-mãe B550", qtd: 0, status: false, qrcode: "QR-MB-B550" },
  { id: 4, nome: "Fonte 650W", qtd: 6, status: true, qrcode: "QR-PSU-650" },
  { id: 5, nome: "Pasta térmica", qtd: 40, status: true, qrcode: "QR-PASTE" },
  { id: 6, nome: "Cabo SATA", qtd: 0, status: false, qrcode: "QR-SATA" },
];

const kitItems: KitItem[] = [
  { id: 1, serialKit: "KIT-1042", produtoId: 1, quantidade: 1 },
  { id: 2, serialKit: "KIT-1042", produtoId: 2, quantidade: 2 },
  { id: 3, serialKit: "KIT-1042", produtoId: 4, quantidade: 1 },
  { id: 4, serialKit: "KIT-2088", produtoId: 3, quantidade: 1 },
  { id: 5, serialKit: "KIT-2088", produtoId: 5, quantidade: 1 },
  { id: 6, serialKit: "KIT-2088", produtoId: 6, quantidade: 2 },
  { id: 7, serialKit: "KIT-3310", produtoId: 1, quantidade: 1 },
];

const pendings: MockPending[] = [
  { id: 1, station: "Posto 1", description: "Nova solicitação de material recebida.", tipo: "solicitacao" },
  { id: 2, station: "Posto 3", description: "Placa-mãe B550 está sem estoque. Quantidade atual: 0.", tipo: "estoque" },
  { id: 3, station: "Posto 2", description: "Solicitação de kit de montagem.", tipo: "solicitacao" },
];

const clone = <T,>(value: T): T => structuredClone(value);

const toKitRow = (item: KitItem): MockKitRow | null => {
  const product = products.find((entry) => entry.id === item.produtoId);
  if (!product) return null;
  return {
    id: item.id,
    serialKit: item.serialKit,
    produtoId: product.id,
    produto: product.nome,
    quantidade: item.quantidade,
    status: product.qtd > 0,
    qrcode: product.qrcode,
  };
};

export const listProducts = () => clone(products);

export const addProduct = (product: Omit<MockProduct, "id">) => {
  const created: MockProduct = { ...product, id: nextProductId++ };
  products.push(created);
  return clone(created);
};

export const updateProduct = (id: number, changes: Omit<MockProduct, "id">) => {
  const product = products.find((entry) => entry.id === id);
  if (!product) return null;
  Object.assign(product, changes);
  return clone(product);
};

export const deleteProduct = (id: number) => {
  const index = products.findIndex((entry) => entry.id === id);
  if (index < 0) return false;
  products.splice(index, 1);
  return true;
};

export const listKits = () => kitItems.map(toKitRow).filter((item): item is MockKitRow => item !== null);

export const searchKit = (serial: string) => {
  const normalized = serial.trim().toLowerCase();
  return listKits().filter((item) => item.serialKit.toLowerCase() === normalized);
};

export const addKit = (serialKit: string, itens: Array<{ produtoId: number; quantidade: number }>) => {
  const missing = itens.some((item) => !products.some((product) => product.id === item.produtoId));
  if (missing) throw new Error("Um ou mais produtos não foram encontrados.");

  const created = itens.map((item) => {
    const row: KitItem = {
      id: nextKitItemId++,
      serialKit,
      produtoId: item.produtoId,
      quantidade: item.quantidade,
    };
    kitItems.push(row);
    return row;
  });

  return { serialKit, itens: created };
};

export const listPending = () => clone(pendings);

export const createPending = (station: string, description: string): MockPending => {
  const created: MockPending = {
    id: nextPendingId++,
    station,
    description,
    tipo: "solicitacao",
  };
  pendings.push(created);
  return clone(created);
};

export const resolvePending = (id: number) => {
  const index = pendings.findIndex((item) => item.id === id);
  if (index < 0) return false;
  pendings.splice(index, 1);
  return true;
};

export const dispatchKit = (posto: string, serialKit: string, pendenciaId?: number): DispatchResult => {
  const serial = serialKit.trim();
  const itens = kitItems.filter((item) => item.serialKit.toLowerCase() === serial.toLowerCase());
  if (itens.length === 0) {
    return { ok: false, status: 404, mensagem: "Kit não encontrado.", produtosSemEstoque: [] };
  }

  const semEstoque: ProdutoSemEstoque[] = [];
  for (const item of itens) {
    const product = products.find((entry) => entry.id === item.produtoId);
    if (!product || product.qtd < item.quantidade) {
      semEstoque.push({
        produtoId: item.produtoId,
        produto: product?.nome ?? "Produto",
        quantidadeNecessaria: item.quantidade,
        quantidadeDisponivel: product?.qtd ?? 0,
      });
    }
  }

  if (semEstoque.length > 0) {
    return {
      ok: false,
      status: 409,
      mensagem: "Não é possível liberar o kit. Há peças sem estoque suficiente.",
      produtosSemEstoque: semEstoque,
    };
  }

  const produtosAbaixo: MockPending[] = [];
  for (const item of itens) {
    const product = products.find((entry) => entry.id === item.produtoId);
    if (!product) continue;
    product.qtd -= item.quantidade;
    product.status = product.qtd > 0;
    if (!product.status) {
      const pending: MockPending = {
        id: nextPendingId++,
        station: posto,
        description: `${product.nome} está sem estoque. Quantidade atual: ${product.qtd}.`,
        tipo: "estoque",
      };
      pendings.push(pending);
      produtosAbaixo.push(clone(pending));
    }
  }

  if (pendenciaId !== undefined) {
    resolvePending(pendenciaId);
  }

  return { ok: true, serialKit: serial, posto, produtosAbaixo };
};
