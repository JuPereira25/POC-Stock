import { useEffect, useState, type FormEvent } from "react";
import {
  DataGrid as MuiDataGrid,
  type GridColDef,
} from "@mui/x-data-grid";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import {
  listAllKits,
  searchKitBySerial,
  type KitSearchItem,
} from "@/pages/Kits/kitStorage";
import styles from "./DataGrid.module.css";

export default function KitsDataGrid() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<KitSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Nenhum kit encontrado.");

  useEffect(() => {
    void listAllKits()
      .then(setRows)
      .catch((reason: Error) => setMessage(reason.message));
  }, []);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const serial = search.trim();

    if (!serial) {
      setLoading(true);
      try {
        setRows(await listAllKits());
        setMessage("Nenhum kit encontrado.");
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const items = await searchKitBySerial(serial);
      setRows(items);
    } catch (reason) {
      setRows([]);
      setMessage(reason instanceof Error ? reason.message : "Não foi possível buscar o kit.");
    } finally {
      setLoading(false);
    }
  };

  const columns: GridColDef<KitSearchItem>[] = [
    { field: "serialKit", headerName: "Serial do kit", minWidth: 170, flex: 0.8 },
    { field: "produto", headerName: "Produto", minWidth: 240, flex: 1.4 },
    {
      field: "quantidade",
      headerName: "Quantidade",
      type: "number",
      minWidth: 130,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "status",
      headerName: "Status",
      minWidth: 130,
      renderCell: ({ value }) => {
        const label = value ? "Máximo" : "Abaixo";
        return <span className={`${styles.status} ${value ? styles.maximo : styles.abaixo}`}>{label}</span>;
      },
    },
    { field: "qrcode", headerName: "QR Code", minWidth: 180, flex: 1 },
  ];

  return (
    <section className={styles.card} aria-label="Itens do kit">
      <div className={styles.toolbar}>
        <form className={styles.search} role="search" onSubmit={handleSearch}>
          <label htmlFor="kit-search" className={styles.srOnly}>Pesquisar kit pela serial</label>
          <input
            id="kit-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Digite a serial do kit"
          />
          <button type="submit" disabled={loading}>
            <SearchOutlined fontSize="small" />
            {loading ? "Buscando..." : "Pesquisar"}
          </button>
        </form>
      </div>

      <div className={styles.grid}>
        <MuiDataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          pageSizeOptions={[5, 10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 5, page: 0 } } }}
          disableRowSelectionOnClick
          localeText={{ noRowsLabel: message }}
        />
      </div>
    </section>
  );
}
