import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Nav } from '../../components/Nav';
import { Chip, ErrorState, Notice, Skeleton } from '../../components/primitives';
import { RichText } from '../../components/RichText';
import { ApiError, errorMessage } from '../../lib/api';
import type { Schemas } from '../../lib/api';
import { usePrompt } from '../../lib/queries';
import styles from './ProposalPage.module.css';
import { genreInSentence } from './summary';

const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5080';

type Block = Schemas['PromptBlockPublicDto'];

function Source({ text }: { text?: string | null }) {
  return text ? (
    <p className={styles.source}>
      <RichText text={text} />
    </p>
  ) : null;
}

/** Notas de rodapé do texto (glossário, tradução), em letra menor, entre o texto e a fonte. */
function Notes({ notes }: { notes?: string[] | null }) {
  return notes?.length ? (
    <ul className={styles.notes}>
      {notes.map((note, index) => (
        <li key={index}>
          <RichText text={note} />
        </li>
      ))}
    </ul>
  ) : null;
}

/** Um texto da coletânea: prosa, verso em colunas ou imagem, com o rótulo (quando aparece), as notas e a fonte. */
function CollectionItem({ data }: { data: Block['data'] }) {
  const label = data.label && !data.hideLabel ? <strong className={styles.label}>{data.label}:</strong> : null;
  const labeled = label ? styles.labeled : styles.unlabeled;

  if (data.format === 'image') {
    return (
      <section className={styles.block}>
        <div className={labeled}>
          {label}
          {data.imageUrl ? (
            <img className={styles.image} src={data.imageUrl} alt={data.alt ?? ''} />
          ) : (
            <div className={`muted ${styles.imageMissing}`}>{data.alt ?? '[Imagem]'}</div>
          )}
        </div>
        <Notes notes={data.notes} />
        <Source text={data.source} />
      </section>
    );
  }

  if (data.format === 'verse') {
    return (
      <section className={styles.block}>
        <div className={labeled}>
          {label}
          <div className={styles.verse}>
            {(data.columns ?? []).map((column, index) => (
              <div key={index} className={styles.column}>
                {column.map((verse, line) => (
                  // Verso vazio separa as estrofes: ocupa a linha dele.
                  <span key={line}>{verse ? <RichText text={verse} /> : ' '}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <Notes notes={data.notes} />
        <Source text={data.source} />
      </section>
    );
  }

  return (
    <section className={styles.block}>
      <p className={styles.prose}>
        {label && <>{label} </>}
        <RichText text={data.body ?? ''} />
      </p>
      <Notes notes={data.notes} />
      <Source text={data.source} />
    </section>
  );
}

const isHalf = (block: Block | undefined) => block?.kind === 'collection_item' && block.data.width === 'half';

/**
 * Os blocos em linhas: dois textos da coletânea seguidos com metade da largura ficam lado a lado; os demais (e um
 * texto de metade sem par) ocupam a linha inteira.
 */
function rows(blocks: Block[]): Block[][] {
  const result: Block[][] = [];
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index]!;
    if (isHalf(block) && isHalf(blocks[index + 1])) {
      result.push([block, blocks[index + 1]!]);
      index++;
    } else {
      result.push([block]);
    }
  }
  return result;
}

/** Card com 3 itens empilhados, na ordem cadastrada: texto ou imagem, cada um com a legenda opcional embaixo. */
function CardBlock({ data }: { data: Block['data'] }) {
  return (
    <section className={styles.cardBlock}>
      <div className={styles.cardBox}>
        {data.title && <strong className={styles.cardTitle}>{data.title}</strong>}
        {(data.cardItems ?? []).map((item, index) => (
          <div key={index} className={styles.cardItem}>
            {item.format === 'image' ? (
              item.imageUrl ? (
                <img className={styles.image} src={item.imageUrl} alt={item.alt ?? ''} />
              ) : (
                <div className={`muted ${styles.imageMissing}`}>{item.alt ?? '[Imagem]'}</div>
              )
            ) : (
              <p>
                <RichText text={item.body ?? ''} />
              </p>
            )}
            <Source text={item.caption} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Os blocos na ordem em que o administrador os cadastrou: a mesma que a correção recebe. */
function PromptBlock({ block, genre }: { block: Block; genre: string }) {
  const data = block.data;
  switch (block.kind) {
    case 'collection_item':
      return <CollectionItem data={data} />;
    case 'card':
      return <CardBlock data={data} />;
    case 'command':
      return (
        <section className={styles.command}>
          <p>
            <RichText text={data.body ?? ''} />
          </p>
        </section>
      );
    case 'instructions':
      return (
        <section className={styles.instructions}>
          <span className={styles.instructionsTitle}>{data.title ?? 'Instruções'}</span>
          <ul>
            <li>
              <strong>Tipo de redação:</strong> {genreInSentence(genre)}
            </li>
            {(data.items ?? []).map((item, index) => (
              <li key={index}>
                <RichText text={item} />
              </li>
            ))}
          </ul>
        </section>
      );
    case 'heading':
      return <h2 className={`h3 ${styles.sectionTitle}`}>{data.text}</h2>;
    case 'paragraph':
      return (
        <p className={styles.paragraph}>
          <RichText text={data.body ?? ''} />
        </p>
      );
    case 'divider':
      return <hr className={styles.divider} />;
    default:
      return null;
  }
}

/**
 * O conteúdo da proposta, bloco a bloco, como o aluno lê. A prévia do cadastro usa este mesmo componente, para o
 * administrador ver exatamente o que vai ao ar. O tipo de redação é o nome da categoria de correção.
 */
export function PromptBlocks({ blocks, genre }: { blocks: Block[]; genre: string }) {
  return (
    <div className={styles.blocks}>
      {rows(blocks).map((row, index) =>
        row.length === 2 ? (
          <div key={`${row[0]!.position}-${index}`} className={styles.pair}>
            {row.map((block, side) => (
              <PromptBlock key={side} block={block} genre={genre} />
            ))}
          </div>
        ) : (
          <PromptBlock key={`${row[0]!.position}-${index}`} block={row[0]!} genre={genre} />
        ),
      )}
    </div>
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

/** 2b · Proposta de redação: a coletânea, o comando e as instruções, na ordem da prova. */
export function ProposalPage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  // Quem chega de uma redação antiga abre a versão que usou, mesmo que a proposta já tenha outra.
  const version = Number(params.get('versao')) || undefined;
  const prompt = usePrompt(slug, version);
  const data = prompt.data;
  const notAvailable = prompt.error instanceof ApiError && prompt.error.code === 'PROMPT_NOT_AVAILABLE';
  const archived = data?.status === 'archived';
  const submit = `/propostas/${encodeURIComponent(slug ?? '')}/enviar`;

  return (
    <>
      <Nav current="temas" />
      <main className={`container ${styles.page}`}>
        <div className={styles.heading}>
          <nav aria-label="Você está em" className={styles.crumbs}>
            <Link to="/propostas">{data?.examName ?? 'Fuvest'}</Link> <span className="muted">/</span>{' '}
            <Link to="/propostas">Propostas</Link>
            {data && <span className="muted"> / {data.title}</span>}
          </nav>
          <span className="eyebrow">Proposta de redação{data ? ` · ${data.examName}` : ''}</span>
          <h1 className={`serif h1 ${styles.title}`}>
            {data ? data.title : prompt.error ? 'Proposta' : <Skeleton width={420} height={46} />}
          </h1>
          {data && (
            <div className={styles.chips}>
              <Chip>{data.essayType.name}</Chip>
              <Chip>
                Coletânea com {data.textCount} {data.textCount === 1 ? 'texto' : 'textos'}
              </Chip>
            </div>
          )}
        </div>

        {prompt.error ? (
          <div className={styles.errorBlock}>
            <ErrorState message={errorMessage(prompt.error)} onRetry={notAvailable ? undefined : () => void prompt.refetch()} />
            {notAvailable && <Button to="/propostas">Ver as propostas</Button>}
          </div>
        ) : !data ? (
          <PageSkeleton />
        ) : (
          <div className={styles.columns}>
            <article className={`${styles.card} ${styles.reading}`}>
              {archived && (
                <Notice>
                  Esta é a versão da proposta usada na sua redação. Ela foi substituída e não recebe novas redações.{' '}
                  <Link to={`/propostas/${encodeURIComponent(data.slug)}`}>Ver a versão atual</Link>
                </Notice>
              )}
              <PromptBlocks blocks={data.blocks} genre={data.essayType.name} />
              {!archived && (
                <div className={styles.ready}>
                  <span>
                    <strong>Já escreveu?</strong> Envie a foto da folha para correção.
                  </span>
                  <Button to={submit}>Enviar minha redação</Button>
                </div>
              )}
            </article>

            <aside className={`${styles.card} ${styles.aside}`} aria-label="Como fazer">
              <h2 className={`serif h2 ${styles.asideTitle}`}>Como na prova</h2>
              <ol className={styles.steps}>
                <li>
                  <span className={styles.stepNumber}>1</span>
                  <span>Leia a coletânea, o comando e as instruções.</span>
                </li>
                <li>
                  <span className={styles.stepNumber}>2</span>
                  <span className={styles.stepWithLink}>
                    Imprima a folha pautada: ela sai com o tema e o tipo no topo.
                    <a className={styles.download} href={`${apiUrl}/v1/prompts/${encodeURIComponent(data.id)}/sheet.pdf`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
                      </svg>
                      Baixar a folha (PDF)
                    </a>
                  </span>
                </li>
                <li>
                  <span className={styles.stepNumber}>3</span>
                  <span>Escreva à mão, sem nome nem assinatura.</span>
                </li>
                <li>
                  <span className={styles.stepNumber}>4</span>
                  <span>Fotografe a folha e envie.</span>
                </li>
              </ol>
              {!archived && (
                <Button block to={submit}>
                  Enviar minha redação
                </Button>
              )}
            </aside>
          </div>
        )}
      </main>
    </>
  );
}
