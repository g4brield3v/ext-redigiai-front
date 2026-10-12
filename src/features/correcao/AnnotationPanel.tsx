import type { Annotation, CorrectionCriterion } from '../../api/provisional-types';
import styles from './CorrectionPage.module.css';
import { linesLabel, shortQuote, visibleAnnotations } from './annotations';
import type { Filters, KindFilter } from './annotations';
import { CriterionNumber, PinMark, cx } from './parts';

type AnnotationCardProps = {
  annotation: Annotation;
  selected: boolean;
  onSelect: (id: number) => void;
};

/** Cartão de um apontamento: tipo, linhas, critério, o trecho, a regra, a explicação e a forma correta. */
export function AnnotationCard({ annotation, selected, onSelect }: AnnotationCardProps) {
  const issue = annotation.kind === 'issue';
  const quote = shortQuote(annotation.quote);

  return (
    <button
      type="button"
      className={cx(styles.card, selected && styles.cardSelected)}
      data-annotation-card={annotation.id}
      aria-pressed={selected}
      onClick={() => onSelect(annotation.id)}
    >
      <span className={styles.cardTop}>
        <PinMark id={annotation.id} kind={annotation.kind} />
        <span className={cx(styles.kind, issue ? styles.kindIssue : styles.kindGood)}>{issue ? '↓ Tirou pontos' : '✓ Funcionou'}</span>
        <span aria-hidden="true">·</span>
        <span>{linesLabel(annotation)}</span>
        <CriterionNumber position={annotation.criterion} bad={issue} className={styles.cardCriterion} />
      </span>
      <span className={styles.quote}>“{annotation.fix ? <s>{quote}</s> : quote}”</span>
      {annotation.ruleName && <span className={styles.rule}>Regra: {annotation.ruleName}</span>}
      {annotation.note && <span className={styles.note}>{annotation.note}</span>}
      {annotation.fix && (
        <span className={styles.fix}>
          <b>Escreva</b>
          <span>{annotation.fix}</span>
        </span>
      )}
    </button>
  );
}

type StepperProps = {
  /** Posição do apontamento selecionado entre os visíveis; 0 quando nenhum está selecionado. */
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

type AnnotationPanelProps = FiltersProps & {
  selectedId: number | null;
  onSelect: (id: number) => void;
  onStep: (delta: 1 | -1) => void;
  /** Nota zero: só os cartões e a explicação, sem passo a passo nem filtros. */
  plain?: boolean;
};

/** Lista de apontamentos ao lado da folha, em ordem de linha, com Anterior/Próximo e filtros. */
export function AnnotationPanel({ annotations, criteria, filters, onFilters, selectedId, onSelect, onStep, plain = false }: AnnotationPanelProps) {
  const visible = visibleAnnotations(annotations, filters);

  return (
    <>
      {!plain && (
        <>
          <AnnotationStepper
            position={visible.findIndex((annotation) => annotation.id === selectedId) + 1}
            total={visible.length}
            onStep={onStep}
          />
          <AnnotationFilters annotations={annotations} criteria={criteria} filters={filters} onFilters={onFilters} />
        </>
      )}
      <div className={styles.cards}>
        {visible.map((annotation) => (
          <AnnotationCard key={annotation.id} annotation={annotation} selected={annotation.id === selectedId} onSelect={onSelect} />
        ))}
        {visible.length === 0 && <p className={cx('muted', styles.empty)}>Nenhum apontamento com esses filtros.</p>}
      </div>
      {plain && (
        <div className={cx('muted', styles.panelNote)}>
          Com nota zero, os critérios não recebem nível. A correção mostra só o motivo, os apontamentos e o plano de reescrita.
        </div>
      )}
    </>
  );
}
