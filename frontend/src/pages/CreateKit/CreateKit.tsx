import { useEffect, useState, type FormEvent } from "react";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import { readProducts } from "@/pages/CreateProduct/productStorage";
import { addKit } from "@/pages/Kits/kitStorage";
import styles from "./CreateKit.module.css";

type KitProductSelection = {
  id: number;
  productId: string;
  quantidade: string;
};

export default function CreateKit() {
  const [serial, setSerial] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selections, setSelections] = useState<KitProductSelection[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [products, setProducts] = useState<Awaited<ReturnType<typeof readProducts>>>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    readProducts().then(setProducts).catch((reason: Error) => setError(reason.message));
  }, []);
  const filteredProducts = products.filter((product) =>
    product.produto.toLocaleLowerCase("pt-BR").includes(productSearch.trim().toLocaleLowerCase("pt-BR")),
  );

  const removeSelection = (id: number) => {
    setSelections((current) => current.filter((item) => item.id !== id));
    setSubmitted(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await addKit(serial.trim(), selections.map((selection) => ({
        produtoId: Number(selection.productId),
        quantidade: Number(selection.quantidade),
      })));
      setSerial("");
      setProductSearch("");
      setSelections([]);
      setSubmitted(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível cadastrar o kit.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={styles.main}>
      <header className={styles.pageHeader}>
        <h1 id="create-kit-title">Cadastro de Kit</h1>
      </header>

      <section className={styles.content} aria-labelledby="create-kit-title">
        {submitted && <div className={styles.success} role="status"><CheckCircleRounded /><span>Kit cadastrado com sucesso!</span></div>}
        {error && <p role="alert">{error}</p>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.productPicker}>
            <label className={styles.serialField}>
              <span>Serial do kit</span>
              <input value={serial} onChange={(event) => { setSerial(event.target.value); setSubmitted(false); }} placeholder="Digite a serial" required />
            </label>
            <label className={styles.field}>
              <span>Selecionar produto</span>
              <select value="" onChange={(event) => { const productId = event.target.value; if (!productId) return; const nextId = Math.max(0, ...selections.map((item) => item.id)) + 1; setSelections((current) => [...current, { id: nextId, productId, quantidade: "" }]); setSubmitted(false); }} disabled={products.length === 0 || selections.length === products.length}>
                <option value="">Selecione para adicionar</option>
                {filteredProducts.map((product) => <option key={product.id} value={product.id} disabled={selections.some((item) => item.productId === String(product.id))}>{product.produto}</option>)}
              </select>
            </label>
            <label className={styles.field}>
              <span>Pesquisar produto</span>
              <input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Digite o nome do produto" />
            </label>
          </div>

          {selections.length > 0 && <div className={styles.tableHeader} aria-hidden="true"><span>Produtos vinculados</span><span>Quantidade</span><span>Ação</span></div>}
          <div className={styles.rows}>
            {selections.map((selection, index) => (
              <div className={styles.row} key={selection.id}>
                <span className={styles.selectedProduct}>{products.find((product) => product.id === Number(selection.productId))?.produto}</span>
                <label className={styles.quantityField}>
                  <span className={styles.mobileLabel}>Quantidade</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={selection.quantidade}
                    onChange={(event) => {
                      const quantidade = event.target.value;
                      setSelections((current) => current.map((item) => item.id === selection.id ? { ...item, quantidade } : item));
                      setSubmitted(false);
                    }}
                    aria-label={`Quantidade de ${products.find((product) => product.id === Number(selection.productId))?.produto ?? `produto ${index + 1}`}`}
                    required
                  />
                </label>
                <button type="button" className={styles.removeButton} onClick={() => removeSelection(selection.id)} aria-label={`Remover produto ${index + 1}`}><DeleteOutlineRounded /></button>
              </div>
            ))}
          </div>

          <div className={styles.actions}><button type="submit" className={styles.submitButton} disabled={saving || products.length === 0 || selections.length === 0}>{saving ? "Salvando..." : "Cadastrar kit"}</button></div>
        </form>
      </section>
    </main>
  );
}
