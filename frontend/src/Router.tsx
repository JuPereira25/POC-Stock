import { Route, Routes } from "react-router-dom";
import { AppLayout } from "@/layouts";
import { CreateKitPage, CreateProductPage, HomePage, KitsPage } from "@/pages";

const Router = () => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/kits" element={<KitsPage />} />
      <Route path="/kits/cadastrar" element={<CreateKitPage />} />
      <Route path="/produtos/cadastrar" element={<CreateProductPage />} />
    </Route>
  </Routes>
);

export default Router;
