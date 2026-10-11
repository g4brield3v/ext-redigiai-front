import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { EssayDetail, IllegibleAnswer } from '../../api/mock-types';
import { Button } from '../../components/Button';
import { EssaySheet } from '../../components/EssaySheet';
import { Nav } from '../../components/Nav';
import { CheckIcon, ErrorState, Field, Modal, Notice, Skeleton } from '../../components/primitives';
import { ApiError, errorMessage, request } from '../../lib/api';
import { formatDeadline } from '../../lib/format';
import { useEssay } from '../../lib/queries';
import { toSheetLines } from '../correcao/sheet';
import styles from './ReviewPage.module.css';

const draftKey = (essayId: string) => `redigiai.review.${essayId}`;

function readDraft(essayId: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(draftKey(essayId)) ?? '{}');
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function ConfirmWordsModal({
  essay,
  answers,
  onClose,
}: {
  essay: EssayDetail;
  answers: IllegibleAnswer[];
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const send = useMutation({
    mutationFn: () => request<void>('PUT', `/v1/essays/${encodeURIComponent(essay.id)}/illegible`, { body: answers }),
    onSuccess: async () => {
      localStorage.removeItem(draftKey(essay.id));
      await queryClient.invalidateQueries();
      navigate('/painel');
    },
    onError: (error) => {
      // Prazo vencido: a redação foi cancelada e o que estava digitado não serve mais.
      if (error instanceof ApiError && error.code === 'REVIEW_EXPIRED') {
        localStorage.removeItem(draftKey(essay.id));
      }
    },
  });
  const expired = send.error instanceof ApiError && send.error.code === 'REVIEW_EXPIRED';

  return (
    <Modal title="Confira as palavras" subtitle={essay.title} onClose={onClose}>
      <dl className={styles.words}>
        {essay.illegibleWords.map((word) => (
          <div key={word.id}>
            <dt className="muted">Linha {word.lineNumber}</dt>
            <dd>{answers.find((answer) => answer.wordId === word.id)?.value}</dd>
          </div>
        ))}
      </dl>
      <Notice>
        Essas palavras entram na redação exatamente como estão e não podem ser alteradas depois do envio.
      </Notice>
      {send.error && (
        <p className={styles.error} role="alert">
          {errorMessage(send.error)}
        </p>
      )}
      {expired ? (
        <Button to="/painel" block>
          Voltar para Minhas correções
        </Button>
      ) : (
        <div className={styles.modalActions}>
          <Button variant="ghost" onClick={onClose}>
            Voltar e revisar
          </Button>
          <Button disabled={send.isPending} onClick={() => send.mutate()}>
            Confirmar e enviar
          </Button>
        </div>
      )}
    </Modal>
  );
}

function ReviewForm({ essay }: { essay: EssayDetail }) {
  const [values, setValues] = useState(() => readDraft(essay.id));
  const [confirming, setConfirming] = useState(false);

  // O que já foi digitado fica guardado no navegador até o envio.
  useEffect(() => {
    try {
      localStorage.setItem(draftKey(essay.id), JSON.stringify(values));
    } catch {
      // Sem armazenamento: vale o que está na tela.
    }
  }, [essay.id, values]);

  const words = essay.illegibleWords;
  const filled = words.filter((word) => values[word.id]?.trim()).length;
  const answers = words.map((word) => ({ wordId: word.id, value: (values[word.id] ?? '').trim() }));
  const lineNumbers = words.map((word) => word.lineNumber);
  const label = `Sua folha, com as palavras ilegíveis destacadas ${lineNumbers.length === 1 ? 'na linha' : 'nas linhas'} ${lineNumbers.join(' e ')}`;

  return (
    <>
      <div className={styles.top}>
        <div className={styles.intro}>
          <span className={`muted ${styles.essayTitle}`}>{essay.title}</span>
          <h1 className="serif h1">
            Não conseguimos ler {words.length} {words.length === 1 ? 'palavra' : 'palavras'}
          </h1>
          <p className={`muted ${styles.lead}`}>
            Digite exatamente o que está na folha, mesmo que tenha erro. Nesta etapa nada é corrigido.
          </p>
          {essay.reviewDeadlineAt && (
            <p className={styles.deadline}>
              Preencha até <strong>{formatDeadline(essay.reviewDeadlineAt)}</strong>. Depois desse prazo, a redação é
              cancelada e a correção volta para o seu saldo.
            </p>
          )}
        </div>
        <div className={styles.progress}>
          <span aria-live="polite">
            {filled} de {words.length} preenchidas
          </span>
          <span
            className={styles.bar}
            role="progressbar"
            aria-label="Palavras preenchidas"
            aria-valuemin={0}
            aria-valuemax={words.length}
            aria-valuenow={filled}
          >
            <span style={{ width: `${words.length ? (filled / words.length) * 100 : 0}%` }} />
          </span>
        </div>
      </div>

      <div className={styles.columns}>
        <figure className={styles.window}>
          <EssaySheet lines={toSheetLines(essay.lines, { illegible: words })} label={label} />
          <figcaption className="muted">
            Transcrição da sua foto. As palavras em amarelo são as que não conseguimos ler.
          </figcaption>
        </figure>

        <div className={styles.side}>
          {words.map((word) => {
            const done = !!values[word.id]?.trim();
            return (
              <section key={word.id} className={styles.word}>
                <div className={styles.wordHeader}>
                  <span className={styles.strong}>Linha {word.lineNumber}</span>
                  {done && (
                    <span className={styles.done}>
                      <CheckIcon color="#17603B" />
                      Preenchida
                    </span>
                  )}
                </div>
                <p className="muted">
                  {word.contextBefore} <mark>{values[word.id]?.trim() || '      '}</mark>{' '}
                  {word.contextAfter}
                </p>
                <Field
                  label="O que está escrito"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  maxLength={60}
                  value={values[word.id] ?? ''}
                  onChange={(event) => setValues((current) => ({ ...current, [word.id]: event.target.value }))}
                />
              </section>
            );
          })}
          <Button block disabled={filled < words.length} onClick={() => setConfirming(true)}>
            Enviar para correção
          </Button>
          <p className={`muted ${styles.help}`}>O botão é liberado quando todas as palavras estiverem preenchidas.</p>
        </div>
      </div>

      {confirming && <ConfirmWordsModal essay={essay} answers={answers} onClose={() => setConfirming(false)} />}
    </>
  );
}

/** 6 · Palavras ilegíveis: o aluno digita só o que não deu para ler. Não há troca de foto nem cancelamento. */
export function ReviewPage() {
  const { id } = useParams();
  const essay = useEssay(id);

  return (
    <>
      <Nav current="painel" />
      <main className={`container ${styles.page}`}>
        <Link className={styles.back} to="/painel">
          ← Minhas correções
        </Link>
        {essay.error ? (
          <ErrorState message={errorMessage(essay.error)} onRetry={() => void essay.refetch()} />
        ) : !essay.data ? (
          <div className={styles.skeleton} aria-busy="true" aria-label="Carregando a redação">
            <Skeleton width="50%" height={46} />
            <Skeleton height={480} radius={18} />
          </div>
        ) : essay.data.status !== 'awaiting_review' ? (
          <div className={styles.skeleton}>
            <ErrorState message="Essa ação não está disponível para esta redação agora." />
            <Button to="/painel" className={styles.start}>
              Voltar para Minhas correções
            </Button>
          </div>
        ) : (
          <ReviewForm essay={essay.data} />
        )}
      </main>
    </>
  );
}
