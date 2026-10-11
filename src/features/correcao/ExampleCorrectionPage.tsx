import { Link } from 'react-router-dom';
import { Nav } from '../../components/Nav';
import { correction } from '../../mocks/data';
import { CorrectionView } from './CorrectionPage';
import styles from './CorrectionPage.module.css';

/** Correção de exemplo, pública, para quem chega pela página inicial. Conteúdo fixo e fictício. */
export default function ExampleCorrectionPage() {
  return (
    <>
      <Nav />
      <main className={`container ${styles.page}`}>
        <Link className={styles.back} to="/">
          ← Início
        </Link>
        <CorrectionView correction={correction} example />
      </main>
    </>
  );
}
