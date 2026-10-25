import { Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";

export function NotFoundPage() {
  usePageTitle("Página não encontrada");
  return (
    <div className="container page-message">
      <h1>Página não encontrada</h1>
      <p>O endereço que você acessou não existe ou foi removido.</p>
      <Link to="/" className="btn btn-primary">
        Voltar para o início
      </Link>
    </div>
  );
}
