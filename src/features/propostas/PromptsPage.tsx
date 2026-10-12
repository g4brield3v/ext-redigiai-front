import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Nav } from '../../components/Nav';
import { Chip, ErrorState, Field, Skeleton, StepBar } from '../../components/primitives';
import { ApiError } from '../../lib/api';
import type { Schemas } from '../../lib/api';
import type { EssaySummary } from '../../api/provisional-types';
import { useEssays, useExams, usePrompts, useRubric } from '../../lib/queries';
import { useAuthState } from '../auth/AuthContext';
import { statusChip } from '../painel/DashboardPage';
import styles from './PromptsPage.module.css';

const SEARCH_DELAY_MS = 300;

function useDebounced(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function messageOf(error: unknown) {
  return error instanceof ApiError ? error.message : 'Algo deu errado do nosso lado. Tente novamente em instantes.';
}

function ExamButton({
  exam,
  selected,
  onSelect,
}: {
  exam: Schemas['ExamDto'];
  selected: boolean;
  onSelect: () => void;
}) {
  const rubric = useRubric(selected ? exam.currentRubricVersionId : null);
  const available = exam.status === 'active';

  return (
    <button
      type="button"
      className={styles.exam}
      aria-pressed={available ? selected : undefined}
      disabled={!available}
      onClick={onSelect}
    >
      <span className={styles.examName}>{exam.name}</span>{" "}
      <span className={styles.examDetail}>
        {available ? (rubric.data ? `Grade com ${rubric.data.criteria.length} critérios` : ' ') : 'Em breve'}
      </span>
    </button>
  );
}

/** O cartão mostra a situação da redação mais recente que o aluno logado enviou para a proposta. */
function PromptCard({ prompt, essay }: { prompt: Schemas['PromptSummaryDto']; essay?: EssaySummary }) {
  const chip = essay && statusChip[essay.status];
  return (
    <Link to={`/propostas/${encodeURIComponent(prompt.slug)}`} className={essay ? `${styles.theme} ${styles.themeSent}` : styles.theme}>
      <div className={styles.themeTop}>
        <span className={`muted ${styles.themeExam}`}>{prompt.examName}</span>
        {chip && (
          <Chip tone={chip.tone}>
            {essay.status === 'completed' && essay.score !== null ? `Corrigida · ${essay.score}/${essay.maxScore}` : chip.label}
          </Chip>
        )}
      </div>
      <h3 className={`serif ${styles.themeTitle}`}>{prompt.title}</h3>
      {prompt.summary && <span className={`muted ${styles.themeTexts}`}>{prompt.summary}</span>}
      <div className={styles.themeTypes}>
        <Chip>{prompt.genreLabel}</Chip>
      </div>
      <span className={`muted ${styles.themeTexts}`}>
        Coletânea com {prompt.textCount} {prompt.textCount === 1 ? 'texto' : 'textos'}
      </span>
    </Link>
  );
}

function PromptGridSkeleton() {
  return (
    <div className={styles.grid} aria-busy="true" aria-label="Carregando as propostas">
      {[0, 1, 2].map((card) => (
        <div key={card} className={styles.theme}>
          <Skeleton width={60} height={14} />
          <Skeleton width="80%" height={28} />
          <Skeleton width={110} height={24} radius={999} />
          <Skeleton width={150} height={14} />
        </div>
      ))}
    </div>
  );
}

/** 2 · Vestibular e proposta. */
export function PromptsPage() {
  const exams = useExams();
  const [chosenSlug, setChosenSlug] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search.trim(), SEARCH_DELAY_MS);

  const selected =
    exams.data?.find((exam) => exam.slug === chosenSlug && exam.status === 'active') ??
    exams.data?.find((exam) => exam.status === 'active');
  const prompts = usePrompts(selected?.slug, debouncedSearch);
  const auth = useAuthState();
  const essays = useEssays(auth.isSignedIn);
  // A lista vem da mais recente para a mais antiga: vale a primeira de cada proposta, em qualquer versão dela.
  const latestByPrompt = new Map<string, EssaySummary>();
  for (const essay of essays.data?.items ?? []) {
    if (!latestByPrompt.has(essay.promptSlug)) {
      latestByPrompt.set(essay.promptSlug, essay);
    }
  }

  return (
    <>
      <Nav />
      <main className={`container ${styles.page}`}>
        <div className={styles.intro}>
          <span className="eyebrow">Nova redação</span>
          <h1 className="serif h1">Escolha o vestibular e a proposta</h1>
          <p className={`muted ${styles.lead}`}>
            Cada proposta traz a coletânea e o comando, como na prova. Você escolhe a proposta antes de escrever.
          </p>
        </div>

        <StepBar current={2} />

        <section className={styles.block} aria-labelledby="vestibular">
          <h2 id="vestibular" className="h3">
            1. Vestibular
          </h2>
          {exams.error ? (
            <ErrorState message={messageOf(exams.error)} onRetry={() => void exams.refetch()} />
          ) : !exams.data ? (
            <div className={styles.exams} aria-busy="true" aria-label="Carregando os vestibulares">
              {[0, 1, 2].map((item) => (
                <Skeleton key={item} width={180} height={70} radius={14} />
              ))}
            </div>
          ) : (
            <div className={styles.exams} role="group" aria-labelledby="vestibular">
              {exams.data.map((exam) => (
                <ExamButton
                  key={exam.slug}
                  exam={exam}
                  selected={exam.slug === selected?.slug}
                  onSelect={() => setChosenSlug(exam.slug)}
                />
              ))}
            </div>
          )}
        </section>

        {selected && (
          <section className={styles.block} aria-labelledby="tema">
            <div className={styles.themesHeader}>
              <h2 id="tema" className="h3">
                2. Propostas da {selected.name}
              </h2>
              <Field
                className={styles.search}
                label="Buscar proposta"
                hideLabel
                type="search"
                placeholder="Buscar proposta"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div aria-live="polite">
              {prompts.error ? (
                <ErrorState
                  message={messageOf(prompts.error)}
                  onRetry={prompts.error instanceof ApiError && !prompts.error.retryable ? undefined : () => void prompts.refetch()}
                />
              ) : !prompts.data ? (
                <PromptGridSkeleton />
              ) : prompts.data.length === 0 ? (
                <p className={`muted ${styles.empty}`}>
                  {debouncedSearch ? 'Nenhuma proposta encontrada para essa busca.' : 'Ainda não há propostas disponíveis.'}
                </p>
              ) : (
                <div className={styles.grid}>
                  {prompts.data.map((prompt) => (
                    <PromptCard key={prompt.id} prompt={prompt} essay={latestByPrompt.get(prompt.slug)} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
