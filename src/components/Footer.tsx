import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

// Identificação do fornecedor: valores públicos de configuração até a empresa estar aberta (especificação, seção 15).
const company = {
  legalName: import.meta.env.VITE_COMPANY_LEGAL_NAME as string | undefined,
  cnpj: import.meta.env.VITE_COMPANY_CNPJ as string | undefined,
  address: import.meta.env.VITE_COMPANY_ADDRESS as string | undefined,
  supportEmail: import.meta.env.VITE_COMPANY_SUPPORT_EMAIL as string | undefined,
};

export function Footer() {
  const identification = [company.legalName, company.cnpj && `CNPJ ${company.cnpj}`, company.address, company.supportEmail]
    .filter(Boolean)
    .join(' · ');

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <span className="muted">
          Correções feitas por IA com base nos critérios públicos da Fuvest. Não é afiliado à Fuvest.
        </span>
        <nav className={styles.links} aria-label="Rodapé">
          <Link to="/termos">Termos de uso</Link>
          <Link to="/privacidade">Privacidade</Link>
          {company.supportEmail && <a href={`mailto:${company.supportEmail}`}>Contato</a>}
        </nav>
        {identification && <span className={`muted ${styles.company}`}>{identification}</span>}
      </div>
    </footer>
  );
}
