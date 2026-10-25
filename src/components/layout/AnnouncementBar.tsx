import { announcements } from "../../data/site";
import { BoltIcon } from "../Icons";

export function AnnouncementBar() {
  // Repetimos as mensagens para preencher a faixa e permitir o loop contínuo do letreiro.
  const items = Array.from({ length: 8 }, () => announcements).flat();
  return (
    <div className="adbar" role="region" aria-label="Avisos da loja">
      <div className="adbar-track">
        {[0, 1].map((copy) => (
          <div className="adbar-group" key={copy} aria-hidden={copy === 1}>
            {items.map((text, i) => (
              <span className="adbar-item" key={i}>
                <BoltIcon size={14} />
                {text}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
