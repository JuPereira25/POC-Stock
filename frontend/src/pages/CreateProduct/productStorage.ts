import { addProduct as createMockProduct, deleteProduct as removeMockProduct, listProducts, updateProduct as saveMockProduct } from "@/services/mockStore";

export type ProductStatus = "Abaixo" | "Máximo";

export type Product = {
  id: number;
  produto: string;
  quantidadeMinima: number;
  status: ProductStatus;
  qrCode: string;
};

type ProductResponse = {
  id: number;
  nome: string;
  qtd: number;
  status: boolean;
  qrcode: string | null;
};

const toProduct = (product: ProductResponse): Product => ({
  id: product.id,
  produto: product.nome,
  quantidadeMinima: product.qtd,
  status: product.status ? "Máximo" : "Abaixo",
  qrCode: product.qrcode ?? "",
});

const toResponse = (product: Omit<Product, "id">): Omit<ProductResponse, "id"> => ({
  nome: product.produto,
  qtd: product.quantidadeMinima,
  status: product.status === "Máximo",
  qrcode: product.qrCode,
});

export const readProducts = async (): Promise<Product[]> => listProducts().map(toProduct);

export const addProduct = async (product: Omit<Product, "id">): Promise<Product> =>
  toProduct(createMockProduct(toResponse(product)));

export const deleteProduct = async (id: number): Promise<void> => {
  if (!removeMockProduct(id)) throw new Error("Produto não encontrado.");
};

export const updateProduct = async (product: Product): Promise<Product> => {
  const updated = saveMockProduct(product.id, toResponse(product));
  if (!updated) throw new Error("Produto não encontrado.");
  return toProduct(updated);
};
