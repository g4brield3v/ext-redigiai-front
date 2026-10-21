import { exampleCriteria, exampleScore, homeRubric as rubric } from './example';
import styles from './HomePage.module.css';

/**
 * "Como a nota é calculada". Critérios, pesos e máximo são os da grade publicada, fixos na página (ela é pública e o
 * catálogo exige login); os níveis e os pontos são os da redação de exemplo.
 */
export function ScoreSection() {
  return (
    <section id="nota" className={styles.dark}>
      <div className={`container ${styles.stack48}`}>
        <div className={styles.heading}>
          <span className={`eyebrow ${styles.eyebrowDark}`}>Como a nota é calculada</span>
          <h2 className={`serif ${styles.h2}`}>A mesma conta da grade da Fuvest, à vista em toda correção.</h2>
          <p className={styles.leadDark}>
            Cada critério recebe um nível de 1 a {rubric.maxLevel}. O nível é multiplicado pelo peso do
            critério, e os resultados são somados.
          </p>
        </div>
        <div className={`${styles.split} ${styles.scoreSplit}`}>
          <div className={styles.tableCard}>
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
                {rubric.criteria.map((criterion) => {
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
                    {exampleScore} <span className={`muted ${styles.regular}`}>/ {rubric.maxScore}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className={styles.notes}>
            <div className={styles.noteCard}>
              <h3 className={styles.h3}>Quando a nota é zero</h3>
              <p>Antes dos critérios, verificamos as situações que zeram a redação:</p>
              <ul className={styles.zeroRules}>
                {rubric.zeroRules.map((rule) => (
                  <li key={rule.code}>{rule.description}</li>
                ))}
              </ul>
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
