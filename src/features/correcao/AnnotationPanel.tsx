import { Fragment, useId } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import type { Annotation, Correction, CorrectionCriterion } from '../../api/provisional-types';
import styles from './CorrectionPage.module.css';
import { goodFolded, hasImportanceOrder, linesLabel, orderedAnnotations, sameAnswer, shortQuote, steppableAnnotations } from './annotations';
import type { Filters, KindFilter, Order } from './annotations';
import { useLearning } from './learning';
import { CriterionNumber, PinMark, cx } from './parts';

/** A resposta, só depois de "Ver resposta": a tentativa do aluno e a forma correta ou uma forma possível. */
function RevealedAnswer({ annotation, attempt }: { annotation: Annotation; attempt: string }) {
  const exact = annotation.answerKind === 'exact';
  return (
    <div className={styles.answer}>
      {attempt.trim() && (
        <div>
          <span className={cx(styles.answerLabel, styles.answerLabelYou)}>Você escreveu</span>
          {attempt}
        </div>
      )}
      <div>
        <span className={styles.answerLabel}>{exact ? 'Forma correta' : 'Uma forma possível'}</span>
        {annotation.answer}
        {/* Uma reescrita possível nunca é comparada: só a forma correta exata. */}
        {exact && sameAnswer(attempt, annotation.answer ?? '') && (
          <>
            {' '}
            <span className={styles.same}>✓ Igual à forma correta</span>
          </>
        )}
      </div>
    </div>
  );
}

/** Tentar antes de ver: o campo, "Ver resposta" e, depois do clique, a resposta. */
function TryIt({ annotation, open }: { annotation: Annotation; open: boolean }) {
  const learning = useLearning();
  const inputId = useId();
  const attempt = learning.attempt(annotation.id);
  const revealed = learning.revealed(annotation.id);

  if (!open && !revealed) {
    return null;
  }
  return (
    <div className={cx(styles.try, !open && styles.tryDone)} data-try>
      {open && (
        <>
          <label htmlFor={inputId}>{annotation.askLabel ?? 'Como você escreveria?'}</label>
          <input
            id={inputId}
            className={styles.tryInput}
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="Escreva a sua versão"
            value={attempt}
            onChange={(event) => learning.setAttempt(annotation.id, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                learning.reveal(annotation.id);
              }
            }}
          />
          {!revealed && (
            <div className={styles.tryRow}>
              <button type="button" className={styles.reveal} onClick={() => learning.reveal(annotation.id)}>
                Ver resposta
              </button>
              <span className={cx('muted', styles.tryHint)}>Tente antes de ver. Ninguém corrige a sua tentativa.</span>
            </div>
          )}
        </>
      )}
      {/* A resposta só entra na página depois do clique; a região avisa o leitor de tela quando ela aparece. */}
      <div aria-live="polite">{revealed && <RevealedAnswer annotation={annotation} attempt={attempt} />}</div>
    </div>
  );
}

type AnnotationCardProps = {
  annotation: Annotation;
  /** Nome curto do critério, para a etiqueta "C3 · Coesão e progressão". */
  criterionName?: string;
  selected: boolean;
  onSelect: (id: number) => void;
  /** Na folha do celular o cartão já vem aberto; no painel, abre quando é selecionado. */
  open?: boolean;
};

/**
 * Cartão de um apontamento. Fechado, um desvio mostra o trecho, a regra, o comentário e "Tente corrigir →";
 * aberto, mostra também o porquê e o campo para tentar antes de ver a resposta. Respondido e fechado, mostra só
 * a tentativa e a resposta.
 */
export function AnnotationCard({ annotation, criterionName, selected, onSelect, open = selected }: AnnotationCardProps) {
  const learning = useLearning();
  const issue = annotation.kind === 'issue';
  const quote = shortQuote(annotation.quote);
  // Correção antiga, sem resposta: o cartão mostra a forma correta como antes, sem campo para tentar.
  const learns = issue && Boolean(annotation.answer);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onSelect(annotation.id);
    }
  }

  function onClick(event: MouseEvent<HTMLElement>) {
    // O campo e os botões de dentro do cartão não trocam a seleção.
    if (event.target instanceof Element && event.target.closest('[data-try]')) {
      return;
    }
    onSelect(annotation.id);
  }

  return (
    <article
      className={cx(styles.card, selected && styles.cardSelected)}
      data-annotation-card={annotation.id}
      tabIndex={0}
      aria-label={`Apontamento ${annotation.id}`}
      aria-current={selected ? 'true' : undefined}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <span className={styles.cardTop}>
        <PinMark id={annotation.id} kind={annotation.kind} />
        <span className={cx(styles.kind, issue ? styles.kindIssue : styles.kindGood)}>{issue ? '↓ Tirou pontos' : '✓ Funcionou'}</span>
        <span aria-hidden="true">·</span>
        <span>{linesLabel(annotation)}</span>
        <span className={styles.criterionTag}>
          C{annotation.criterion}
          {criterionName && ` · ${criterionName}`}
        </span>
      </span>
      <span className={styles.quote}>“{!learns && annotation.fix ? <s>{quote}</s> : quote}”</span>
      {annotation.ruleName && <span className={styles.rule}>Regra: {annotation.ruleName}</span>}
      {annotation.note && <span className={styles.note}>{annotation.note}</span>}
      {learns ? (
        <>
          {open && annotation.why && (
            <div className={styles.why}>
              <b>Por quê</b>
              {annotation.why}
            </div>
          )}
          <TryIt annotation={annotation} open={open} />
          {!open && !learning.revealed(annotation.id) && <span className={styles.tryLink}>Tente corrigir →</span>}
        </>
      ) : (
        annotation.fix && (
          <span className={styles.fix}>
            <b>Escreva</b>
            <span>{annotation.fix}</span>
          </span>
        )
      )}
    </article>
  );
}

type StepperProps = {
  /** Posição do apontamento selecionado entre os que o passo a passo percorre; 0 quando nenhum está selecionado. */
  position: number;
  total: number;
  onStep: (delta: 1 | -1) => void;
};

export function AnnotationStepper({ position, total, onStep }: StepperProps) {
  return (
    <div className={styles.stepper}>
      <button type="button" disabled={total === 0} onClick={() => onStep(-1)}>
        ← Anterior
      </button>
      <span aria-live="polite">
        <strong>{position}</strong> <span className="muted">de {total} {total === 1 ? 'apontamento' : 'apontamentos'}</span>
      </span>
      <button type="button" disabled={total === 0} onClick={() => onStep(1)}>
        Próximo →
      </button>
    </div>
  );
}

const orders: { value: Order; label: string }[] = [
  { value: 'importance', label: 'Por importância' },
  { value: 'line', label: 'Por linha' },
];

function OrderPicker({ order, onOrder }: { order: Order; onOrder: (order: Order) => void }) {
  return (
    <div className={styles.orderRow}>
      <span className={cx('muted', styles.orderLabel)}>Ordem</span>
      <div className={styles.segmented} role="group" aria-label="Ordem dos apontamentos">
        {orders.map((option) => (
          <button
            key={option.value}
            type="button"
            className={cx(order === option.value && styles.segmentOn)}
            aria-pressed={order === option.value}
            onClick={() => onOrder(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const kinds: { value: KindFilter; label: string; dot?: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'issue', label: 'Tiraram pontos', dot: styles.dotIssue },
  { value: 'good', label: 'Funcionaram', dot: styles.dotGood },
];

type FiltersProps = {
  annotations: Annotation[];
  criteria: CorrectionCriterion[];
  filters: Filters;
  onFilters: (filters: Filters) => void;
};

export function AnnotationFilters({ annotations, criteria, filters, onFilters }: FiltersProps) {
  return (
    <>
      <div className={styles.filters} role="group" aria-label="Filtrar apontamentos">
        {kinds.map((kind) => (
          <button
            key={kind.value}
            type="button"
            className={cx(styles.filter, filters.kind === kind.value && styles.filterOn)}
            aria-pressed={filters.kind === kind.value}
            onClick={() => onFilters({ ...filters, kind: kind.value })}
          >
            {kind.dot && <span className={cx(styles.dot, kind.dot)} />}
            {kind.label}{' '}
            <span className={styles.filterCount}>
              {kind.value === 'all' ? annotations.length : annotations.filter((annotation) => annotation.kind === kind.value).length}
            </span>
          </button>
        ))}
      </div>
      {criteria.length > 0 && (
        <div className={styles.filters} role="group" aria-label="Filtrar por critério">
          {criteria.map((criterion) => {
            const on = filters.criterion === criterion.position;
            return (
              <button
                key={criterion.position}
                type="button"
                className={cx(styles.filter, on && styles.filterOn)}
                aria-pressed={on}
                // Clicar de novo no critério ligado desliga o filtro.
                onClick={() => onFilters({ ...filters, criterion: on ? null : criterion.position })}
              >
                <CriterionNumber position={criterion.position} size="small" />
                {criterion.shortName}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

/** O primeiro grupo é por onde começar; o do critério 4, os ajustes de escrita; os demais vêm depois. */
function groupTitle(index: number, criterion: number) {
  if (index === 0) {
    return 'Corrija primeiro';
  }
  return criterion === 4 ? 'Ajustes de escrita' : 'Depois';
}

type AnnotationPanelProps = FiltersProps & {
  annotationGroups: Correction['annotationGroups'];
  order: Order;
  onOrder: (order: Order) => void;
  /** Os que funcionaram, abertos pelo aluno em "Por importância". */
  goodOpen: boolean;
  onGoodOpen: (open: boolean) => void;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onStep: (delta: 1 | -1) => void;
  /** Nota zero: só os cartões e a explicação, sem passo a passo nem filtros. */
  plain?: boolean;
};

/**
 * Lista de apontamentos ao lado da folha, com Anterior/Próximo, a ordem e os filtros. "Por importância" agrupa os
 * desvios por critério, do que mais aumenta a nota para o que menos, e recolhe os que funcionaram.
 */
export function AnnotationPanel({
  annotations,
  criteria,
  annotationGroups,
  filters,
  onFilters,
  order,
  onOrder,
  goodOpen,
  onGoodOpen,
  selectedId,
  onSelect,
  onStep,
  plain = false,
}: AnnotationPanelProps) {
  const correction = { annotations, annotationGroups };
  const importance = order === 'importance' && hasImportanceOrder(correction);
  const ordered = orderedAnnotations(correction, order, filters);
  const steppable = steppableAnnotations(correction, order, filters, goodOpen);
  const nameOf = (position: number) => criteria.find((criterion) => criterion.position === position)?.shortName;
  const card = (annotation: Annotation) => (
    <AnnotationCard
      key={annotation.id}
      annotation={annotation}
      criterionName={nameOf(annotation.criterion)}
      selected={annotation.id === selectedId}
      onSelect={onSelect}
    />
  );

  let list;
  if (importance) {
    const byId = new Map(ordered.map((annotation) => [annotation.id, annotation]));
    const grouped = new Set(annotationGroups.flatMap((group) => group.markIds));
    const loose = ordered.filter((annotation) => annotation.kind === 'issue' && !grouped.has(annotation.id));
    const goods = ordered.filter((annotation) => annotation.kind === 'good');
    const folded = goodFolded(correction, order, filters, goodOpen);
    list = (
      <>
        {annotationGroups.map((group, index) => {
          const shown = group.markIds.map((id) => byId.get(id)).filter((annotation): annotation is Annotation => annotation !== undefined);
          // Um grupo sem cartão visível pelos filtros não mostra cabeçalho.
          if (shown.length === 0) {
            return null;
          }
          const name = nameOf(group.criterion);
          return (
            <Fragment key={group.criterion}>
              <div className={styles.group}>
                <CriterionNumber position={group.criterion} size="small" />
                <span>
                  <strong>{groupTitle(index, group.criterion)}</strong>
                  {name && <span className="muted"> · {name}</span>}
                </span>
                <span className={styles.groupGain}>até +{group.potentialGain}</span>
              </div>
              {shown.map(card)}
            </Fragment>
          );
        })}
        {loose.map(card)}
        {goods.length > 0 && filters.kind !== 'good' && (
          <button type="button" className={styles.fold} aria-expanded={!folded} onClick={() => onGoodOpen(folded)}>
            <span>
              ✓ {goods.length} {goods.length === 1 ? 'trecho que funcionou' : 'trechos que funcionaram'}
            </span>
            <span className={styles.foldAction}>{folded ? 'Mostrar' : 'Esconder'}</span>
          </button>
        )}
        {!folded && goods.map(card)}
      </>
    );
  } else {
    list = ordered.map(card);
  }

  return (
    <>
      {!plain && (
        <>
          <AnnotationStepper
            position={steppable.findIndex((annotation) => annotation.id === selectedId) + 1}
            total={steppable.length}
            onStep={onStep}
          />
          {hasImportanceOrder(correction) && <OrderPicker order={order} onOrder={onOrder} />}
          <AnnotationFilters annotations={annotations} criteria={criteria} filters={filters} onFilters={onFilters} />
        </>
      )}
      <div className={styles.cards}>
        {list}
        {ordered.length === 0 && <p className={cx('muted', styles.empty)}>Nenhum apontamento com esses filtros.</p>}
      </div>
      {plain && (
        <div className={cx('muted', styles.panelNote)}>
          Com nota zero, os critérios não recebem nível. A correção mostra só o motivo, os apontamentos e o plano de reescrita.
        </div>
      )}
    </>
  );
}
