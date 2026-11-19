import { addKit as createMockKit, listKits, searchKit } from "@/services/mockStore";

export type KitStatus = "Abaixo" | "Máximo";

export type CreateKitItem = {
  produtoId: number;
  quantidade: number;
};

export type KitSearchItem = {
  id: number;
  serialKit: string;
  produtoId: number;
  produto: string;
  quantidade: number;
  status: boolean;
  qrcode: string | null;
};

export const listAllKits = async (): Promise<KitSearchItem[]> => listKits();

export const searchKitBySerial = async (serial: string): Promise<KitSearchItem[]> => {
  const items = searchKit(serial);
  if (items.length === 0) throw new Error("Kit não encontrado.");
  return items;
};

export const addKit = async (serial: string, itens: CreateKitItem[]) => createMockKit(serial, itens);
