import { Link } from 'react-router-dom';
import type { EssayStatus, EssaySummary, Progress } from '../../api/provisional-types';
import { Button } from '../../components/Button';
import { Nav } from '../../components/Nav';
import { AlertIcon, Chip, ErrorState, Skeleton } from '../../components/primitives';
import type { ChipTone } from '../../components/primitives';
import { errorMessage } from '../../lib/api';
import { formatDay, formatDeadline, formatSentAt } from '../../lib/format';
import { useAccount, useEssays, useProgress } from '../../lib/queries';
import styles from './DashboardPage.module.css';

export const statusChip: Record<EssayStatus, { label: string; tone: ChipTone }> = {
  uploaded: { label: 'Lendo sua redação', tone: 'running' },
  awaiting_review: { label: 'Precisa de você', tone: 'review' },
  queued: { label: 'Na fila', tone: 'queued' },
  processing: { label: 'Em correção', tone: 'running' },
  completed: { label: 'Corrigida', tone: 'ok' },
  failed: { label: 'Não corrigida · crédito devolvido', tone: 'error' },
  cancelled: { label: 'Cancelada · crédito devolvido', tone: 'error' },
};

function EssayAction({ essay }: { essay: EssaySummary }) {
  switch (essay.status) {
    case 'awaiting_review':
      return (
        <Button to={`/redacoes/${essay.id}/revisao`} size="xs">
          Preencher palavras
        </Button>
      );
    case 'completed':
      return (
        <Button to={`/redacoes/${essay.id}`} size="xs" variant="ghost">
          Ver correção
        </Button>
      );
    case 'failed':
      return (
        <Button to={`/propostas/${encodeURIComponent(essay.promptSlug)}/enviar`} size="xs" variant="ghost">
          Reenviar
        </Button>
      );
    default:
      return null;
  }
}

function EssayTitle({ essay }: { essay: EssaySummary }) {
  return (
    <>
      {essay.title}
      {essay.hasVersions && <span className={`muted ${styles.version}`}> · {essay.version}ª versão</span>}
    </>
  );
}

function Score({ essay }: { essay: EssaySummary }) {
  return essay.score !== null ? (
    <>
      <strong>{essay.score}</strong> <span className="muted">/ {essay.maxScore}</span>
    </>
  ) : (
    <span className="muted">—</span>
  );
}

/** Gráfico de linha das notas; a escala vai de zero à nota máxima da grade. */
function ProgressChart({ points }: { points: Progress['points'] }) {
  // A escala é a da grade da correção; sem pontos não há gráfico, e o 1 só evita divisão por zero.
  const max = points[0]?.maxScore ?? 1;
  const y = (score: number) => 20 + (max - score) * (150 / max);
  const x = (index: number) => (points.length === 1 ? 275 : 80 + (index * 390) / (points.length - 1));
  const ticks = [max, Math.round((max * 2) / 3), Math.round(max / 3)];
  const last = points.length - 1;
  const label =
    points.length === 1
      ? `Nota da sua correção: ${points[0]!.score} de ${max}`
      : `Notas das últimas ${points.length} correções: ${points.map((point) => point.score).join(', ')} de ${max}`;

  return (
    <svg viewBox="0 0 520 170" width="100%" role="img" aria-label={label} className={styles.chart}>
      {ticks.map((tick, index) => (
        <g key={tick}>
          <line x1="40" y1={y(tick)} x2="510" y2={y(tick)} stroke={index === ticks.length - 1 ? '#D3DBEA' : '#EDF1F7'} />
          <text x="30" y={y(tick) + 4} textAnchor="end" fontSize="12" fill="#56627A">
            {tick}
          </text>
        </g>
      ))}
      <polyline
        points={points.map((point, index) => `${x(index)},${y(point.score)}`).join(' ')}
        fill="none"
        stroke="#2346C9"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {points.map((point, index) => (
        <g key={point.essayId}>
          {index === last ? (
            <circle cx={x(index)} cy={y(point.score)} r="7" fill="#2346C9" />
          ) : (
            <circle cx={x(index)} cy={y(point.score)} r="5" fill="#FFFFFF" stroke="#2346C9" strokeWidth="2.5" />
          )}
          <text
            x={x(index)}
            y={index === last ? y(point.score) - 15 : y(point.score) + 23}
            textAnchor="middle"
            fontSize={index === last ? 15 : 13}
            fontWeight={index === last ? 700 : 400}
            fill="#0E1B33"
          >
            {point.score}
          </text>
          <text x={x(index)} y="152" textAnchor="middle" fontSize="12" fill="#56627A">
            {formatDay(point.date)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function ProgressCards() {
  const progress = useProgress();

  if (progress.error) {
    return <ErrorState message={errorMessage(progress.error)} onRetry={() => void progress.refetch()} />;
  }
  if (!progress.data) {
    return (
      <div className={styles.cards} aria-busy="true" aria-label="Carregando a sua evolução">
        <Skeleton height={300} radius={18} />
        <Skeleton height={300} radius={18} />
      </div>
    );
  }
  if (progress.data.points.length === 0) {
    return null;
  }

  const { points, lastDelta, focus } = progress.data;
  return (
    <div className={styles.cards}>
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className="h3">Sua evolução</h2>
          {lastDelta !== null && lastDelta !== 0 && (
            <Chip tone={lastDelta > 0 ? 'ok' : 'error'}>
              {lastDelta > 0 ? '+' : '−'}
              {Math.abs(lastDelta)} {Math.abs(lastDelta) === 1 ? 'ponto' : 'pontos'} na última correção
            </Chip>
          )}
        </div>
        <ProgressChart points={points} />
      </section>
      {focus && (
        <section className={`${styles.card} ${styles.focusCard}`}>
          <h2 className="h3">Seu foco agora</h2>
          <p className="muted">O critério que mais tirou pontos nas suas últimas 3 correções:</p>
          <div className={styles.focus}>
            <span>
              {focus.criterionPosition} · {focus.criterionName}
            </span>
            <span>{focus.guidance}</span>
          </div>
          <Link className={styles.focusLink} to={`/redacoes/${focus.essayId}#criterio-${focus.criterionPosition}`}>
            Ver na última correção →
          </Link>
        </section>
      )}
    </div>
  );
}

function EssayTable({ essays }: { essays: EssaySummary[] }) {
  return (
    <section className={styles.list}>
      <div className={styles.listHeader}>
        <h2 className="h3">Correções</h2>
        <span className="muted">
          {essays.length} {essays.length === 1 ? 'redação' : 'redações'}
        </span>
      </div>

      {/* Computador: tabela. */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Redação</th>
            <th scope="col">Enviada</th>
            <th scope="col">Status</th>
            <th scope="col">Nota</th>
            <th scope="col">
              <span className="visually-hidden">Ação</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {essays.map((essay) => (
            <tr key={essay.id}>
              <td className={styles.title}>
                <EssayTitle essay={essay} />
              </td>
              <td className="muted">{formatSentAt(essay.createdAt)}</td>
              <td>
                <Chip tone={statusChip[essay.status].tone}>{statusChip[essay.status].label}</Chip>
              </td>
              <td className={styles.score}>
                <Score essay={essay} />
              </td>
              <td className={styles.action}>
                <EssayAction essay={essay} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Celular: a mesma lista em cartões, sem rolagem lateral. */}
      <ul className={styles.mobileList}>
        {essays.map((essay) => (
          <li key={essay.id}>
            <span className={styles.title}>
              <EssayTitle essay={essay} />
            </span>
            <div className={styles.mobileMeta}>
              <Chip tone={statusChip[essay.status].tone}>{statusChip[essay.status].label}</Chip>
              <span className="muted">{formatSentAt(essay.createdAt)}</span>
              {essay.score !== null && (
                <span className={styles.score}>
                  <Score essay={essay} />
                </span>
              )}
            </div>
            <EssayAction essay={essay} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 8 · Minhas correções. */
export function DashboardPage() {
  const account = useAccount();
  const essays = useEssays();

  const firstName = account.data?.name?.split(' ')[0];
  const pending = essays.data?.items.find((essay) => essay.status === 'awaiting_review' && essay.reviewDeadlineAt);

  return (
    <>
      <Nav />
      <main className={`container ${styles.page}`}>
        <div className={styles.header}>
          <h1 className="serif h1">{account.data ? (firstName ? `Olá, ${firstName}` : 'Olá') : <Skeleton width={220} height={46} />}</h1>
          <div className={styles.headerActions}>
            {account.data && (
              <span>
                <strong>{account.data.credits.total}</strong>{' '}
                <span className="muted">
                  {account.data.credits.total === 1 ? 'correção disponível' : 'correções disponíveis'}
                </span>
              </span>
            )}
            <Button to="/comprar" variant="ghost">
              Comprar correções
            </Button>
            <Button to="/propostas">Nova redação</Button>
          </div>
        </div>

        {pending && (
          <section className={styles.alert} aria-label="Precisa de você">
            <AlertIcon size={24} />
            <div>
              <span className={styles.alertTitle}>Uma redação precisa de você</span>
              <span>
                Não conseguimos ler {pending.illegibleCount} {pending.illegibleCount === 1 ? 'palavra' : 'palavras'} em{' '}
                {pending.title}. Preencha até {formatDeadline(pending.reviewDeadlineAt!)}, ou a redação será cancelada e a
                correção volta para o seu saldo.
              </span>
            </div>
            <Button to={`/redacoes/${pending.id}/revisao`}>Preencher palavras</Button>
          </section>
        )}

        {essays.error ? (
          <ErrorState message={errorMessage(essays.error)} onRetry={() => void essays.refetch()} />
        ) : !essays.data ? (
          <div aria-busy="true" aria-label="Carregando as suas correções">
            <Skeleton height={320} radius={18} />
          </div>
        ) : essays.data.items.length === 0 ? (
          <section className={styles.empty}>
            <p>Você ainda não enviou nenhuma redação.</p>
            <Button to="/propostas">Ver as propostas</Button>
          </section>
        ) : (
          <>
            <ProgressCards />
            <div aria-live="polite">
              <EssayTable essays={essays.data.items} />
            </div>
          </>
        )}
      </main>
    </>
  );
}
