import { Nav } from '../../components/Nav';
import { CorrectionView } from './CorrectionPage';
import { exampleZeroCorrection } from './example';
import styles from './CorrectionPage.module.css';

/** Correção de exemplo com nota zero, para revisar a tela. Só existe em desenvolvimento (/exemplo/nota-zero). */
export default function ExampleZeroCorrectionPage() {
  return (
    <>
      <Nav />
      <main className={styles.page}>
        <CorrectionView correction={exampleZeroCorrection} back={{ to: '/', label: 'Início' }} example />
      </main>
    </>
  );
}
