import { Nav } from '../../components/Nav';
import { CorrectionView } from './CorrectionPage';
import { exampleCorrection } from './example';
import styles from './CorrectionPage.module.css';

/** Correção de exemplo, pública, para quem chega pela página inicial. Conteúdo fixo e fictício. */
export default function ExampleCorrectionPage() {
  return (
    <>
      <Nav />
      <main className={styles.page}>
        <CorrectionView correction={exampleCorrection} back={{ to: '/', label: 'Início' }} example />
      </main>
    </>
  );
}
