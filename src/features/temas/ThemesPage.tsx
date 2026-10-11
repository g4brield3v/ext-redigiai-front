import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Nav } from '../../components/Nav';
import { Chip, ErrorState, Field, Skeleton } from '../../components/primitives';
import { ApiError } from '../../lib/api';
import type { Schemas } from '../../lib/api';
import { useExams, useRubric, useThemes } from '../../lib/queries';
import styles from './ThemesPage.module.css';

const SEARCH_DELAY_MS = 300;

const steps = [
  { label: '1 · Vestibular', current: true },
  { label: '2 · Tema', current: true },
  { label: '3 · Tipo de redação', current: false },
  { label: '4 · Envio', current: false },
];

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

function ThemeCard({ theme }: { theme: Schemas['ThemeSummaryDto'] }) {
  return (
    <Link to={`/temas/${theme.id}`} className={styles.theme}>
      <div className={styles.themeTop}>
        <span className={`muted ${styles.themeExam}`}>{theme.examName}</span>
      </div>
      <h3 className={`serif ${styles.themeTitle}`}>{theme.title}</h3>
      <div className={styles.themeTypes}>
        {theme.essayTypes.map((type) => (
          <Chip key={type.id}>{type.name}</Chip>
        ))}
      </div>
      <span className={`muted ${styles.themeTexts}`}>
        Coletânea com {theme.textCount} {theme.textCount === 1 ? 'texto' : 'textos'}
      </span>
    </Link>
  );
}

function ThemeGridSkeleton() {
  return (
    <div className={styles.grid} aria-busy="true" aria-label="Carregando os temas">
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

export function ThemesPage() {
  const exams = useExams();
  const [chosenSlug, setChosenSlug] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search.trim(), SEARCH_DELAY_MS);

  const selected =
    exams.data?.find((exam) => exam.slug === chosenSlug && exam.status === 'active') ??
    exams.data?.find((exam) => exam.status === 'active');
  const themes = useThemes(selected?.slug, debouncedSearch);

  return (
    <>
      <Nav />
      <main className={`container ${styles.page}`}>
        <div className={styles.intro}>
          <span className="eyebrow">Nova redação</span>
          <h1 className="serif h1">Escolha o vestibular e o tema</h1>
          <p className={`muted ${styles.lead}`}>
            Cada tema traz o enunciado e a coletânea de textos. Depois você escolhe o tipo de redação e envia.
          </p>
        </div>

        <ol className={styles.steps} aria-label="Etapas">
          {steps.map((step) => (
            <li key={step.label} className={step.current ? styles.stepCurrent : undefined}>
              {step.label}
            </li>
          ))}
        </ol>

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
                2. Tema da {selected.name}
              </h2>
              <Field
                className={styles.search}
                label="Buscar tema"
                hideLabel
                type="search"
                placeholder="Buscar tema"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div aria-live="polite">
              {themes.error ? (
                <ErrorState
                  message={messageOf(themes.error)}
                  onRetry={themes.error instanceof ApiError && !themes.error.retryable ? undefined : () => void themes.refetch()}
                />
              ) : !themes.data ? (
                <ThemeGridSkeleton />
              ) : themes.data.length === 0 ? (
                <p className={`muted ${styles.empty}`}>
                  {debouncedSearch ? 'Nenhum tema encontrado para essa busca.' : 'Ainda não há temas disponíveis.'}
                </p>
              ) : (
                <div className={styles.grid}>
                  {themes.data.map((theme) => (
                    <ThemeCard key={theme.id} theme={theme} />
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
