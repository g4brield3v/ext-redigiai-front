import { ErrorState, Skeleton } from '../../components/primitives';
import { ApiError } from '../../lib/api';
import { useExams, useRubric } from '../../lib/queries';
import { exampleCriteria, exampleScore } from './example';
import styles from './HomePage.module.css';

/**
 * "Como a nota é calculada". Critérios, pesos e máximo vêm da grade publicada (GET /v1/rubrics/{versionId});
 * os níveis e os pontos são os da redação de exemplo da página.
 */
export function ScoreSection() {
  const exams = useExams();
  const fuvest = exams.data?.find((exam) => exam.status === 'active');
  const rubric = useRubric(fuvest?.currentRubricVersionId);
  const error = exams.error ?? rubric.error;

  return (
    <section id="nota" className={styles.dark}>
      <div className={`container ${styles.stack48}`}>
        <div className={styles.heading}>
          <span className={`eyebrow ${styles.eyebrowDark}`}>Como a nota é calculada</span>
          <h2 className={`serif ${styles.h2}`}>A mesma conta da grade da Fuvest, à vista em toda correção.</h2>
          <p className={styles.leadDark}>
            Cada critério recebe um nível de 1 a 3. O nível é multiplicado pelo peso do critério, e os resultados são
            somados.
          </p>
        </div>
        <div className={`${styles.split} ${styles.scoreSplit}`}>
          <div className={styles.tableCard}>
            {error ? (
              <ErrorState
                message={error instanceof ApiError ? error.message : 'Não foi possível carregar a grade.'}
                onRetry={() => void (exams.error ? exams.refetch() : rubric.refetch())}
              />
            ) : !rubric.data ? (
              <div className={styles.tableSkeleton} aria-busy="true" aria-label="Carregando a grade">
                {[0, 1, 2, 3, 4].map((row) => (
                  <Skeleton key={row} height={22} />
                ))}
              </div>
            ) : (
              <table className={styles.calc} aria-label="Cálculo da nota do exemplo">
                <thead>
                  <tr>
                    <th scope="col">Critério</th>
                    <th scope="col" className={styles.num}>
                      Nível
                    </th>
                    <th scope="col" className={styles.num}>
                      Peso
                    </th>
                    <th scope="col" className={styles.num}>
                      Pontos
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rubric.data.criteria.map((criterion) => {
                    const example = exampleCriteria.find((item) => item.position === criterion.position);
                    return (
                      <tr key={criterion.position}>
                        <td>
                          {criterion.position} · {criterion.name}
                        </td>
                        <td className={styles.num}>{example?.level ?? '–'}</td>
                        <td className={styles.num}>× {criterion.weight}</td>
                        <td className={styles.num}>
                          {example?.points ?? '–'} <span className="muted">/ {criterion.maxPoints}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>Nota da grade</td>
                    <td className={`${styles.num} ${styles.total}`}>
                      {exampleScore} <span className={`muted ${styles.regular}`}>/ {rubric.data.maxScore}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
          <div className={styles.notes}>
            <div className={styles.noteCard}>
              <h3 className={styles.h3}>Quando a nota é zero</h3>
              <p>
                Antes dos critérios, verificamos as situações que zeram a redação: tema não desenvolvido, tipo de texto
                não atendido, cópia integral da coletânea ou identificação do candidato, como nome ou assinatura na
                folha.
              </p>
            </div>
            <div className={styles.noteCard}>
              <h3 className={styles.h3}>Se a grade mudar</h3>
              <p>
                Atualizamos critérios e pesos quando a Fuvest publicar mudanças. Cada correção informa a versão da grade
                usada.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
