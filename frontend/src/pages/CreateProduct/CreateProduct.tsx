import { useEffect, useState, type FormEvent } from "react";
import AddRounded from "@mui/icons-material/AddRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import SaveRounded from "@mui/icons-material/SaveRounded";
import EditOutlined from "@mui/icons-material/EditOutlined";
import {
  addProduct,
  deleteProduct,
  readProducts,
  updateProduct,
  type Product,
  type ProductStatus,
} from "./productStorage";
import styles from "./CreateProduct.module.css";

const initialForm = {
  produto: "",
  quantidadeMinima: "",
  status: "Abaixo" as ProductStatus,
  qrCode: "",
};

export default function CreateProduct() {
  const [form, setForm] = useState(initialForm);
  const [products, setProducts] = useState<Awaited<ReturnType<typeof readProducts>>>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    readProducts().then(setProducts).catch((reason: Error) => setError(reason.message));
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const product = await addProduct({ ...form, quantidadeMinima: Number(form.quantidadeMinima) });
      setProducts((current) => [...current, product]);
      setForm(initialForm);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível cadastrar o produto.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setError("");
    try {
      await deleteProduct(id);
      setProducts((current) => current.filter((product) => product.id !== id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível excluir o produto.");
    }
  };

  const changeProduct = (id: number, changes: Partial<Product>) => {
    setProducts((current) => current.map((product) => product.id === id ? { ...product, ...changes } : product));
  };

  const handleUpdate = async (product: Product) => {
    setSaving(true);
    setError("");
    try {
      const updated = await updateProduct(product);
      changeProduct(product.id, updated);
      setEditingId(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível editar o produto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={styles.main}>
      <header className={styles.pageHeader}>
        <h1 id="create-product-title">Cadastrar Produto</h1>
      </header>

      <section className={styles.content} aria-labelledby="create-product-title">
        {error && <p role="alert">{error}</p>}
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.tableHeader} aria-hidden="true">
            <span>Produto</span>
            <span>Qtd. mínima</span>
            <span>Status</span>
            <span>QR Code</span>
            <span>Ação</span>
          </div>

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.mobileLabel}>Produto</span>
              <input value={form.produto} onChange={(event) => setForm({ ...form, produto: event.target.value })} placeholder="Nome do produto" required />
            </label>
            <label className={styles.field}>
              <span className={styles.mobileLabel}>Qtd. mínima</span>
              <input type="number" min={0} value={form.quantidadeMinima} onChange={(event) => setForm({ ...form, quantidadeMinima: event.target.value })} required />
            </label>
            <label className={styles.field}>
              <span className={styles.mobileLabel}>Status</span>
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProductStatus })}>
                <option>Abaixo</option>
                <option>Máximo</option>
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.mobileLabel}>QR Code</span>
              <input value={form.qrCode} onChange={(event) => setForm({ ...form, qrCode: event.target.value })} placeholder="Código do QR Code" required />
            </label>
            <button className={styles.addButton} type="submit" disabled={saving}><AddRounded />{saving ? "Salvando..." : "Adicionar"}</button>
          </div>
        </form>

        <div className={styles.list}>
          <h2>Produtos cadastrados</h2>
          {products.length === 0 ? (
            <p className={styles.empty}>Nenhum produto cadastrado.</p>
          ) : (
            products.map((product) => {
              const editing = editingId === product.id;
              return (
              <div className={styles.productRow} key={product.id}>
                {editing ? <input aria-label="Produto" value={product.produto} onChange={(event) => changeProduct(product.id, { produto: event.target.value })} /> : <span data-label="Produto">{product.produto}</span>}
                {editing ? <input aria-label="Quantidade" type="number" min={0} value={product.quantidadeMinima === 0 ? "" : product.quantidadeMinima} onChange={(event) => changeProduct(product.id, { quantidadeMinima: event.target.value === "" ? 0 : Math.max(0, Number(event.target.value)) })} /> : <span data-label="Qtd. mínima">{product.quantidadeMinima}</span>}
                {editing ? <select aria-label="Status" value={product.status} onChange={(event) => changeProduct(product.id, { status: event.target.value as ProductStatus })}><option>Abaixo</option><option>Máximo</option></select> : <span data-label="Status">{product.status}</span>}
                {editing ? <input aria-label="QR Code" value={product.qrCode} onChange={(event) => changeProduct(product.id, { qrCode: event.target.value })} /> : <span data-label="QR Code">{product.qrCode}</span>}
                <div className={styles.rowActions}>
                  {editing ?
                    <button type="button" className={styles.saveButton} disabled={saving} onClick={() => void handleUpdate(product)} aria-label={`Salvar ${product.produto}`}><SaveRounded /></button> :
                    <button type="button" className={styles.editButton} disabled={saving} onClick={() => setEditingId(product.id)} aria-label={`Editar ${product.produto}`}><EditOutlined /></button>}
                  <button type="button" className={styles.deleteButton} disabled={saving} onClick={() => void handleDelete(product.id)} aria-label={`Excluir ${product.produto}`}><DeleteOutlineRounded /></button>
                </div>
              </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
