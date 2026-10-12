import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Nav } from '../../components/Nav';
import { Chip, ErrorState, Skeleton } from '../../components/primitives';
import { ApiError, errorMessage } from '../../lib/api';
import type { Schemas } from '../../lib/api';
import { useTheme } from '../../lib/queries';
import styles from './ProposalPage.module.css';

const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5080';

function CollectionText({ text }: { text: Schemas['ThemeTextDto'] }) {
  return (
    <section className={styles.text}>
      <span className={styles.textNumber}>Texto {text.position}</span>
      <h3 className={`serif ${styles.textTitle}`}>{text.title}</h3>
      {text.kind === 'image' ? (
        <div className={`muted ${styles.image}`}>[Imagem]</div>
      ) : (
        <p className={styles.textBody}>{text.body}</p>
      )}
      <p className={`muted ${styles.source}`}>{text.source}</p>
    </section>
  );
}

function PageSkeleton() {
  return (
    <div className={styles.columns} aria-busy="true" aria-label="Carregando a proposta">
      <div className={`${styles.card} ${styles.reading}`}>
        <Skeleton width={90} height={14} />
        <Skeleton height={110} />
        <Skeleton height={260} />
      </div>
      <div className={`${styles.card} ${styles.aside}`}>
        <Skeleton width={220} height={26} />
        <Skeleton height={120} radius={14} />
        <Skeleton height={48} radius={999} />
      </div>
    </div>
  );
}

/** 2b · Proposta e coletânea do tema. */
export function ProposalPage() {
  const { themeId } = useParams();
  const theme = useTheme(themeId);
  const data = theme.data;
  const notAvailable = theme.error instanceof ApiError && theme.error.code === 'THEME_NOT_AVAILABLE';

  return (
    <>
      <Nav current="temas" />
      <main className={`container ${styles.page}`}>
        <div className={styles.heading}>
          <nav aria-label="Você está em" className={styles.crumbs}>
            <Link to="/temas">{data?.examName ?? 'Fuvest'}</Link> <span className="muted">/</span> <Link to="/temas">Temas</Link>
            {data && <span className="muted"> / {data.title}</span>}
          </nav>
          <span className="eyebrow">Proposta de redação{data ? ` · ${data.examName}` : ''}</span>
          <h1 className={`serif h1 ${styles.title}`}>
            {data ? data.title : theme.error ? 'Tema' : <Skeleton width={420} height={46} />}
          </h1>
          {data && (
            <div className={styles.chips}>
              {data.essayTypes.map((type) => (
                <Chip key={type.id}>{type.name}</Chip>
              ))}
              <Chip>
                Coletânea com {data.texts.length} {data.texts.length === 1 ? 'texto' : 'textos'}
              </Chip>
            </div>
          )}
        </div>

        {theme.error ? (
          <div className={styles.errorBlock}>
            <ErrorState message={errorMessage(theme.error)} onRetry={notAvailable ? undefined : () => void theme.refetch()} />
            {notAvailable && <Button to="/temas">Ver os temas</Button>}
          </div>
        ) : !data ? (
          <PageSkeleton />
        ) : (
          <div className={styles.columns}>
            <article className={`${styles.card} ${styles.reading}`}>
              <section className={styles.statement}>
                <span className="eyebrow">Proposta</span>
                <p>{data.statement}</p>
                <div className={styles.instructions}>
                  {data.essayTypes.map((type) => (
                    <div key={type.id}>
                      <span className={styles.strong}>{type.name}</span>
                      <p className="muted">{type.instruction || type.description}</p>
                    </div>
                  ))}
                </div>
              </section>
              <span className={`eyebrow ${styles.collectionLabel}`}>Coletânea</span>
              {data.texts.map((text) => (
                <CollectionText key={text.position} text={text} />
              ))}
            </article>

            <aside className={`${styles.card} ${styles.aside}`} aria-label="Como enviar">
              <h2 className={`serif h2 ${styles.asideTitle}`}>Escreva à mão, como na prova</h2>
              <ol className={styles.steps}>
                <li>
                  <span className={styles.stepNumber}>1</span>
                  <span className={styles.stepWithLink}>
                    Imprima a folha pautada de {data.sheetLines} linhas.
                    <a className={styles.download} href={`${apiUrl}/v1/themes/${encodeURIComponent(data.id)}/sheet.pdf`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
                      </svg>
                      Baixar a folha (PDF)
                    </a>
                  </span>
                </li>
                <li>
                  <span className={styles.stepNumber}>2</span>
                  <span>Escreva a redação na folha, sem nome nem assinatura.</span>
                </li>
                <li>
                  <span className={styles.stepNumber}>3</span>
                  <span>Fotografe a folha inteira e envie para correção.</span>
                </li>
              </ol>
              <div className={styles.cta}>
                <Button block to={`/temas/${encodeURIComponent(data.id)}/enviar`}>
                  Enviar minha redação
                </Button>
                <span className={`muted ${styles.hint}`}>Você escolhe o tipo de redação na próxima página.</span>
              </div>
            </aside>
          </div>
        )}
      </main>
    </>
  );
}
