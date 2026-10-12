import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Correction, FeedbackRating } from '../../api/provisional-types';
import { Button } from '../../components/Button';
import { Nav } from '../../components/Nav';
import { ErrorState, Modal, Skeleton } from '../../components/primitives';
import { ApiError, errorMessage, request } from '../../lib/api';
import { formatDay } from '../../lib/format';
import { useCorrection } from '../../lib/queries';
import { AnnotationCard, AnnotationPanel, AnnotationStepper } from './AnnotationPanel';
import { AnnotationSheet } from './AnnotationSheet';
import styles from './CorrectionPage.module.css';
import { CriterionCard } from './CriterionCard';
import { EssayLines } from './EssayLines';
import { ResultSummary } from './ResultSummary';
import { RewritePlan } from './RewritePlan';
import { ZeroResult } from './ZeroResult';
import { noFilters, startingAnnotation, stepAnnotation, visibleAnnotations } from './annotations';
import type { Filters } from './annotations';
import { PinMark, cx } from './parts';

const ratings: { value: FeedbackRating; label: string }[] = [
  { value: 'helped_a_lot', label: 'Ajudou muito' },
  { value: 'helped_partly', label: 'Ajudou em parte' },
  { value: 'did_not_help', label: 'Não ajudou' },
];

function rewriteLink(correction: Correction) {
  const [theme, type, essay] = [correction.themeId, correction.essayTypeId, correction.essayId].map(encodeURIComponent);
  return `/temas/${theme}/enviar?tipo=${type}&reescrita=${essay}`;
}

/** Em telas estreitas os apontamentos abrem numa folha inferior, em vez do painel ao lado. */
const narrowQuery = '(max-width: 980px)';

function useNarrowScreen() {
  return useSyncExternalStore(
    (notify) => {
      const media = window.matchMedia?.(narrowQuery);
      media?.addEventListener('change', notify);
      return () => media?.removeEventListener('change', notify);
    },
    () => window.matchMedia?.(narrowQuery).matches ?? false,
    () => false,
  );
}

function scrollTo(element: Element | null, block: ScrollLogicalPosition = 'start') {
  // O jsdom dos testes não implementa a rolagem.
  element?.scrollIntoView?.({ behavior: 'smooth', block });
}

function PhotoModal({ essayId, onClose }: { essayId: string; onClose: () => void }) {
  // A URL assinada vale 5 minutos: pedida de novo a cada abertura, sem cache.
  const photo = useQuery({
    queryKey: ['photo', essayId],
    queryFn: () => request<{ url: string }>('GET', `/v1/essays/${encodeURIComponent(essayId)}/photo`),
    staleTime: 0,
    gcTime: 0,
  });

  return (
    <Modal title="Foto original" closeButton onClose={onClose}>
      {photo.error ? (
        <ErrorState message={errorMessage(photo.error)} onRetry={() => void photo.refetch()} />
      ) : photo.data ? (
        <img className={styles.photo} src={photo.data.url} alt="Foto da folha que você enviou" />
      ) : (
        <Skeleton height={360} radius={12} />
      )}
    </Modal>
  );
}

function Feedback({ correction }: { correction: Correction }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [comment, setComment] = useState('');
  const send = useMutation({
    mutationFn: () =>
      request<void>('POST', `/v1/corrections/${encodeURIComponent(correction.id)}/feedback`, {
        body: { rating, comment: comment.trim() || null },
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['correction'] }),
  });
  // A correção já tinha sido avaliada (em outra aba, por exemplo): vale como enviada.
  const alreadySent = send.error instanceof ApiError && send.error.code === 'INVALID_STATE';

  if (correction.feedback || send.isSuccess || alreadySent) {
    return (
      <div className={styles.feedback} aria-live="polite">
        <h2 className={styles.h3}>A correção ajudou você a entender o que melhorar?</h2>
        <p className="muted">Obrigado. A sua avaliação ajuda a melhorar as próximas correções.</p>
      </div>
    );
  }

  return (
    <div className={styles.feedback}>
      <div className={styles.feedbackQuestion}>
        <h2 className={styles.h3} id="avaliacao-pergunta">
          A correção ajudou você a entender o que melhorar?
        </h2>
        <div className={styles.filters} role="radiogroup" aria-labelledby="avaliacao-pergunta">
          {ratings.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={rating === option.value}
              className={cx(styles.filter, rating === option.value && styles.filterOn)}
              onClick={() => setRating(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.comment}>
        <label htmlFor="comentario">Comentário (opcional)</label>
        <textarea
          id="comentario"
          maxLength={1000}
          placeholder="Conte o que faltou ou o que não fez sentido"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </div>
      {send.error && <ErrorState message={errorMessage(send.error)} />}
      <Button
        variant={rating ? 'primary' : 'ghost'}
        className={styles.sendButton}
        disabled={!rating || send.isPending}
        onClick={() => send.mutate()}
      >
        Enviar avaliação
      </Button>
    </div>
  );
}

type Section = { id: string; label: string; count?: number };

/** Navegação de seções, fixa no topo ao rolar; a seção visível fica destacada. */
function SectionNav({ sections }: { sections: Section[] }) {
  const [current, setCurrent] = useState(sections[0]?.id);
  const ids = sections.map((section) => section.id).join(' ');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }
    // Vale a seção que cruza a faixa logo abaixo da barra fixa.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) {
          setCurrent(visible.target.id);
        }
      },
      { rootMargin: '-80px 0px -70% 0px' },
    );
    for (const id of ids.split(' ')) {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    }
    return () => observer.disconnect();
  }, [ids]);

  return (
    <nav className={styles.sectionNav} aria-label="Seções da correção">
      <div className={styles.wrap}>
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={section.id === current ? styles.current : undefined}
            aria-current={section.id === current ? 'true' : undefined}
            onClick={(event) => {
              event.preventDefault();
              setCurrent(section.id);
              scrollTo(document.getElementById(section.id));
            }}
          >
            {section.label}
            {section.count !== undefined && <span className={styles.count}>{section.count}</span>}
          </a>
        ))}
      </div>
    </nav>
  );
}

type ViewProps = {
  correction: Correction;
  back: { to: string; label: string };
  /** A correção de exemplo é pública: sem foto, reescrita nem avaliação. */
  example?: boolean;
};

export function CorrectionView({ correction, back, example = false }: ViewProps) {
  const zero = correction.zero.applies;
  const narrow = useNarrowScreen();
  const [selectedId, setSelectedId] = useState(() => startingAnnotation(correction));
  const [filters, setFilters] = useState<Filters>(noFilters);
  const [sheet, setSheet] = useState<'one' | 'list' | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);

  const visible = visibleAnnotations(correction.annotations, filters);
  const selected = visible.find((annotation) => annotation.id === selectedId);
  const rewriteTo = example ? '/temas' : rewriteLink(correction);
  const rewriteLabel = example ? 'Ver os temas' : 'Reescrever esta redação';

  /** Seleciona o mesmo apontamento na folha e no painel e rola o outro lado até ele. */
  const select = useCallback(
    (id: number, from: 'text' | 'card') => {
      setSelectedId(id);
      if (from === 'text') {
        if (narrow) {
          setSheet('one');
        } else {
          requestAnimationFrame(() => scrollTo(document.querySelector(`[data-annotation-card="${id}"]`), 'nearest'));
        }
      } else {
        setSheet(null);
        requestAnimationFrame(() => scrollTo(document.querySelector(`[data-annotation="${id}"]`), 'center'));
      }
    },
    [narrow],
  );

  const step = useCallback(
    (delta: 1 | -1) => {
      const next = stepAnnotation(visibleAnnotations(correction.annotations, filters), selectedId, delta);
      if (next !== null) {
        setSelectedId(next);
        requestAnimationFrame(() => scrollTo(document.querySelector(`[data-annotation="${next}"]`), 'center'));
      }
    },
    [correction.annotations, filters, selectedId],
  );

  // Teclas j e k percorrem os apontamentos visíveis, fora de campos de texto.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (event.ctrlKey || event.metaKey || event.altKey || target?.closest('input, textarea, select, [contenteditable]')) {
        return;
      }
      if (event.key === 'j') {
        step(1);
      } else if (event.key === 'k') {
        step(-1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  function applyFilters(next: Filters) {
    setFilters(next);
    // Com o filtro, a seleção passa para o primeiro apontamento que continua visível.
    const stillVisible = visibleAnnotations(correction.annotations, next);
    if (!stillVisible.some((annotation) => annotation.id === selectedId)) {
      setSelectedId(stillVisible[0]?.id ?? null);
    }
  }

  function showInText(id: number | null, next: Filters) {
    setFilters(next);
    setSelectedId(id);
    scrollTo(document.getElementById('texto'));
  }

  function showCriterion(position: number) {
    const card = document.getElementById(`criterio-${position}`);
    scrollTo(card);
    card?.focus({ preventScroll: true });
  }

  const sections: Section[] = [
    { id: 'texto', label: 'Texto comentado', count: correction.annotations.length },
    ...(zero ? [] : [{ id: 'criterios', label: 'Critérios' }]),
    ...(correction.nextSteps.length > 0 ? [{ id: 'plano', label: 'Plano de reescrita' }] : []),
    ...(example ? [] : [{ id: 'avaliar', label: 'Avaliar a correção' }]),
  ];

  return (
    <>
      <div className={cx(styles.wrap, styles.top)}>
        <Link className={styles.back} to={back.to}>
          ← {back.label}
        </Link>
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <h1 className={cx('serif', styles.title)}>{correction.title}</h1>
            <span className={cx('muted', styles.meta)}>
              Enviada em {formatDay(correction.sentAt)} · {correction.version}ª versão · grade {correction.rubric.versionLabel}
            </span>
          </div>
          <div className={styles.actions}>
            {!example && (
              <Button variant="ghost" onClick={() => setPhotoOpen(true)}>
                Ver foto original
              </Button>
            )}
            <Button to={rewriteTo}>{rewriteLabel}</Button>
          </div>
        </div>
      </div>

      {zero ? (
        <ZeroResult correction={correction} proposalTo={example ? '/temas' : `/temas/${encodeURIComponent(correction.themeId)}`} />
      ) : (
        <ResultSummary
          correction={correction}
          onShowCriterion={showCriterion}
          onShowInText={() => showInText(startingAnnotation(correction), noFilters)}
        />
      )}

      <SectionNav sections={sections} />

      <section id="texto" className={cx(styles.wrap, styles.section, styles.sectionFirst)}>
        <div className={styles.sectionHead}>
          <h2 className={cx('serif', styles.h2)}>Texto comentado</h2>
          <p className="muted">
            {zero
              ? 'Os apontamentos mostram onde o texto saiu do tema e o que vale aproveitar na reescrita.'
              : 'Clique num número para ver o apontamento. Os vermelhos tiraram pontos; os verdes funcionaram e valem manter.'}
          </p>
        </div>
        <div className={styles.textColumns}>
          <div className={styles.paper}>
            <div className={styles.paperHead}>
              <span className={styles.paperTitle}>Sua redação</span>
              {zero ? (
                <span className={cx('muted', styles.legend)}>
                  Mostrando {correction.lines.length} de {correction.sheetLines} linhas
                </span>
              ) : (
                <span className={cx('muted', styles.legend)}>
                  <span>
                    <PinMark id={1} kind="issue" />
                    tirou pontos
                  </span>
                  <span>
                    <PinMark id={1} kind="good" />
                    funcionou
                  </span>
                </span>
              )}
            </div>
            <EssayLines lines={correction.lines} annotations={visible} selectedId={selectedId} onSelect={(id) => select(id, 'text')} />
          </div>
          <aside className={styles.panel} aria-label="Apontamentos">
            <AnnotationPanel
              annotations={correction.annotations}
              criteria={correction.criteria}
              filters={filters}
              onFilters={applyFilters}
              selectedId={selectedId}
              onSelect={(id) => select(id, 'card')}
              onStep={step}
              plain={zero}
            />
          </aside>
        </div>
      </section>

      {!zero && (
        <section id="criterios" className={cx(styles.wrap, styles.section)}>
          <div className={styles.sectionHead}>
            <h2 className={cx('serif', styles.h2)}>Critérios</h2>
            <p className="muted">Cada critério mostra o seu nível, o que a grade pede para o próximo e o que fazer para chegar lá.</p>
          </div>
          <div className={styles.criteria}>
            {correction.criteria.map((criterion) => (
              <CriterionCard
                key={criterion.position}
                criterion={criterion}
                maxLevel={correction.rubric.maxLevel}
                annotations={correction.annotations}
                onShowInText={(position) => {
                  const next = { kind: 'all' as const, criterion: position };
                  showInText(visibleAnnotations(correction.annotations, next)[0]?.id ?? null, next);
                }}
              />
            ))}
          </div>
        </section>
      )}

      {correction.nextSteps.length > 0 && (
        <section id="plano" className={cx(styles.wrap, styles.section)}>
          <RewritePlan correctionId={correction.id} steps={correction.nextSteps} zero={zero} rewriteTo={rewriteTo} rewriteLabel={rewriteLabel} />
        </section>
      )}

      <section id="avaliar" className={cx(styles.wrap, styles.section, styles.feedbackSection)}>
        {!example && <Feedback correction={correction} />}
        <p className={cx('muted', styles.footer)}>
          Correção feita por IA com base nos critérios públicos da {correction.examName}, grade {correction.rubric.versionLabel}. Não
          substitui a banca.
        </p>
      </section>

      {correction.annotations.length > 0 && !sheet && (
        <button type="button" className={styles.fab} onClick={() => setSheet('list')}>
          Apontamentos ({correction.annotations.length})
        </button>
      )}

      {sheet === 'one' && selected && (
        <AnnotationSheet title={`Apontamento ${selected.id}`} onClose={() => setSheet(null)}>
          <AnnotationCard annotation={selected} selected onSelect={() => select(selected.id, 'card')} />
          <AnnotationStepper
            position={visible.findIndex((annotation) => annotation.id === selected.id) + 1}
            total={visible.length}
            onStep={step}
          />
          <button type="button" className={styles.sheetAll} onClick={() => setSheet('list')}>
            Ver todos os apontamentos
          </button>
        </AnnotationSheet>
      )}

      {sheet === 'list' && (
        <AnnotationSheet title={`Apontamentos (${correction.annotations.length})`} onClose={() => setSheet(null)}>
          <AnnotationPanel
            annotations={correction.annotations}
            criteria={correction.criteria}
            filters={filters}
            onFilters={applyFilters}
            selectedId={selectedId}
            onSelect={(id) => select(id, 'card')}
            onStep={step}
            plain={zero}
          />
        </AnnotationSheet>
      )}

      {photoOpen && <PhotoModal essayId={correction.essayId} onClose={() => setPhotoOpen(false)} />}
    </>
  );
}

function CorrectionSkeleton() {
  return (
    <div className={cx(styles.wrap, styles.top, styles.skeleton)} aria-busy="true" aria-label="Carregando a correção">
      <Skeleton width="60%" height={46} />
      <Skeleton height={220} radius={18} />
      <Skeleton height={520} radius={18} />
    </div>
  );
}

/** 9 · Correção de uma redação do aluno. */
export function CorrectionPage() {
  const { id } = useParams();
  const correction = useCorrection(id);

  return (
    <>
      <Nav current="painel" />
      <main className={styles.page}>
        {correction.error ? (
          <div className={cx(styles.wrap, styles.top)}>
            <Link className={styles.back} to="/painel">
              ← Minhas correções
            </Link>
            <ErrorState message={errorMessage(correction.error)} onRetry={() => void correction.refetch()} />
          </div>
        ) : correction.data ? (
          // A chave refaz a seleção e os filtros quando o aluno abre outra correção.
          <CorrectionView key={correction.data.id} correction={correction.data} back={{ to: '/painel', label: 'Minhas correções' }} />
        ) : (
          <CorrectionSkeleton />
        )}
      </main>
    </>
  );
}
