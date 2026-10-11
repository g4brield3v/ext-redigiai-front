import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Correction, FeedbackRating } from '../../api/mock-types';
import { Button } from '../../components/Button';
import { CriterionCard, ScoreSummary } from '../../components/CriterionCard';
import { EssaySheet } from '../../components/EssaySheet';
import { Nav } from '../../components/Nav';
import { ErrorState, Modal, Skeleton } from '../../components/primitives';
import { errorMessage, request } from '../../lib/api';
import { formatDay } from '../../lib/format';
import { useCorrection } from '../../lib/queries';
import styles from './CorrectionPage.module.css';
import { blankLines, toSheetLines } from './sheet';

const ratings: { value: FeedbackRating; label: string }[] = [
  { value: 'helped_a_lot', label: 'Ajudou muito' },
  { value: 'helped_partly', label: 'Ajudou em parte' },
  { value: 'did_not_help', label: 'Não ajudou' },
];

function rewriteLink(correction: Correction) {
  const [theme, type, essay] = [correction.themeId, correction.essayTypeId, correction.essayId].map(encodeURIComponent);
  return `/temas/${theme}?tipo=${type}&reescrever=${essay}`;
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
  const [missing, setMissing] = useState(false);
  const send = useMutation({
    mutationFn: () =>
      request<void>('POST', `/v1/corrections/${encodeURIComponent(correction.id)}/feedback`, {
        body: { rating, comment: comment.trim() || null },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['correction'] }),
  });

  if (correction.feedback || send.isSuccess) {
    return (
      <section className={styles.feedback} aria-live="polite">
        <h2 className="h3">Avalie esta correção</h2>
        <p className="muted">Obrigado. A sua avaliação ajuda a melhorar as próximas correções.</p>
      </section>
    );
  }

  return (
    <section className={styles.feedback}>
      <h2 className="h3">Avalie esta correção</h2>
      <fieldset>
        <legend className="muted">A correção ajudou você a entender o que melhorar?</legend>
        <div className={styles.ratings}>
          {ratings.map((option) => (
            <label key={option.value}>
              <input type="radio" name="avaliacao" checked={rating === option.value} onChange={() => {
                  setRating(option.value);
                  setMissing(false);
                }}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className={styles.comment}>
        <label htmlFor="comentario">Comentário (opcional)</label>
        <textarea
          id="comentario"
          rows={3}
          maxLength={1000}
          placeholder="Conte o que faltou ou o que não fez sentido"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </div>
      {send.error && <ErrorState message={errorMessage(send.error)} />}
      {missing && (
        <p className={styles.missing} role="alert">
          Escolha uma das opções para enviar a avaliação.
        </p>
      )}
      <Button
        variant="ghost"
        className={styles.start}
        disabled={send.isPending}
        onClick={() => (rating ? send.mutate() : setMissing(true))}
      >
        Enviar avaliação
      </Button>
    </section>
  );
}

type ViewProps = {
  correction: Correction;
  /** A correção de exemplo é pública: sem foto, reescrita nem avaliação. */
  example?: boolean;
};

export function CorrectionView({ correction, example = false }: ViewProps) {
  const [showAll, setShowAll] = useState(false);
  const [highlighted, setHighlighted] = useState<number[]>([]);
  const [photoOpen, setPhotoOpen] = useState(false);

  const written = toSheetLines(correction.lines, { marks: correction.marks });
  const lastWritten = correction.lines.at(-1)?.number ?? 0;
  const lines = showAll ? [...written, ...blankLines(lastWritten + 1, correction.sheetLines)] : written;
  const flagged = new Set(correction.marks.filter((mark) => mark.kind === 'issue').map((mark) => mark.criterion));

  function showCriterion(position: number) {
    const card = document.getElementById(`criterio-${position}`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card?.focus({ preventScroll: true });
  }

  function showLines(lineNumbers: number[]) {
    setHighlighted(lineNumbers);
    const first = lineNumbers[0];
    if (first !== undefined) {
      if (first > lastWritten) {
        setShowAll(true);
      }
      requestAnimationFrame(() =>
        document.querySelector(`[data-line="${first}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      );
    }
  }

  const delta =
    correction.scoreDelta !== null && correction.previousVersion !== null
      ? `${correction.scoreDelta > 0 ? '+' : ''}${correction.scoreDelta} desde a ${correction.previousVersion}ª versão`
      : null;
  const rewrite = example ? '/temas' : rewriteLink(correction);

  return (
    <>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h1 className="serif h1">{correction.title}</h1>
          <span className="muted">
            Enviada em {formatDay(correction.sentAt)} · {correction.version}ª versão · grade {correction.examName} v
            {correction.rubricVersion}
          </span>
        </div>
        <div className={styles.actions}>
          {!example && (
            <Button variant="ghost" onClick={() => setPhotoOpen(true)}>
              Ver foto original
            </Button>
          )}
          <Button to={rewrite}>{example ? 'Ver os temas' : 'Reescrever esta redação'}</Button>
        </div>
      </div>

      <ScoreSummary
        score={correction.score}
        maxScore={correction.maxScore}
        delta={delta}
        strengths={correction.strengths}
        mainIssue={correction.mainIssue}
      />

      <div className={styles.columns}>
        <section className={styles.window}>
          <div className={styles.windowHeader}>
            <h2 className="h3">Sua redação</h2>
            <div className={`muted ${styles.legend}`}>
              <span>
                <span className={styles.legendGood} />
                funcionou
              </span>
              <span>
                <span className={styles.legendIssue} />
                tirou pontos
              </span>
            </div>
          </div>
          <EssaySheet lines={lines} withMargin highlighted={highlighted} onMarkClick={showCriterion} />
          {!showAll && lastWritten < correction.sheetLines && (
            <div className={styles.more}>
              <Button variant="ghost" className={styles.moreButton} onClick={() => setShowAll(true)}>
                Mostrar linhas {lastWritten + 1} a {correction.sheetLines}
              </Button>
            </div>
          )}
        </section>

        {correction.zeroReason ? (
          <section className={styles.zero}>
            <h2 className="h3">A redação recebeu nota zero</h2>
            <span className={styles.zeroReason}>{correction.zeroReason}</span>
            <p>{correction.zeroExplanation}</p>
          </section>
        ) : (
          <div className={styles.criteria}>
            {correction.criteria.map((criterion) => (
              <CriterionCard
                key={criterion.position}
                criterion={criterion}
                flagged={flagged.has(criterion.position)}
                onShowLines={() => showLines(criterion.lines)}
              />
            ))}
          </div>
        )}
      </div>

      {correction.nextSteps.length > 0 && (
        <section className={styles.rewrite}>
          <div>
            <h2 className={`serif ${styles.rewriteTitle}`}>O que corrigir na reescrita</h2>
            <ol>
              {correction.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <Button to={rewrite} variant="inverse">
            {example ? 'Ver os temas' : 'Reescrever esta redação'}
          </Button>
        </section>
      )}

      {!example && <Feedback correction={correction} />}

      <footer className={`muted ${styles.footer}`}>
        Correção feita por IA com base nos critérios públicos da {correction.examName} (grade v{correction.rubricVersion}
        ). Não substitui a banca.
      </footer>

      {photoOpen && <PhotoModal essayId={correction.essayId} onClose={() => setPhotoOpen(false)} />}
    </>
  );
}

function CorrectionSkeleton() {
  return (
    <div className={styles.skeleton} aria-busy="true" aria-label="Carregando a correção">
      <Skeleton width="60%" height={46} />
      <Skeleton height={150} radius={18} />
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
      <main className={`container ${styles.page}`}>
        <Link className={styles.back} to="/painel">
          ← Minhas correções
        </Link>
        {correction.error ? (
          <ErrorState message={errorMessage(correction.error)} onRetry={() => void correction.refetch()} />
        ) : correction.data ? (
          <CorrectionView correction={correction.data} />
        ) : (
          <CorrectionSkeleton />
        )}
      </main>
    </>
  );
}
