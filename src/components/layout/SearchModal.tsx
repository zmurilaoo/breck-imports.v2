import { useCallback } from "react";
import { useUI } from "../../context/ui-context";
import { useLockBody } from "../../hooks/useLockBody";
import { CloseIcon } from "../Icons";
import { SearchForm } from "./SearchForm";

export function SearchModal() {
  const { searchOpen, setSearchOpen } = useUI();
  const close = useCallback(() => setSearchOpen(false), [setSearchOpen]);
  useLockBody(searchOpen, close);

  if (!searchOpen) return null;
  return (
    <div className="search-modal" role="dialog" aria-modal="true" aria-label="Buscar produtos">
      <div className="search-modal-header">
        <span className="drawer-title">Buscar</span>
        <button type="button" className="icon-btn" aria-label="Fechar busca" onClick={close}>
          <CloseIcon size={22} />
        </button>
      </div>
      <div className="search-modal-body">
        <SearchForm autoFocus onDone={close} />
      </div>
    </div>
  );
}
