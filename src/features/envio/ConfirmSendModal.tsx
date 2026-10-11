import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { BatchEssayRequest, BatchEssayResponse } from '../../api/provisional-types';
import { Button } from '../../components/Button';
import { Modal, Notice, SheetThumb, Skeleton } from '../../components/primitives';
import { errorMessage, request } from '../../lib/api';
import { corrections } from '../../lib/format';
import { useAccount } from '../../lib/queries';
import { clearDraft } from './draft';
import styles from './ThemePage.module.css';

export type PendingEssay = { title: string; fileName: string; themeId: string; essayTypeId: string; assetId: string };

type Props = {
  essays: PendingEssay[];
  parentEssayId?: string;
  onClose: () => void;
};

/** 3b · Confirmação do envio: custo, saldo depois e o aviso de que não há troca de foto nem cancelamento. */
export function ConfirmSendModal({ essays, parentEssayId, onClose }: Props) {
  const account = useAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Uma chave por abertura do modal: repetir o clique não cria redações em dobro.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [aiNoticeChecked, setAiNoticeChecked] = useState(false);

  const send = useMutation({
    mutationFn: () =>
      request<BatchEssayResponse>('POST', '/v1/essays/batch', {
        idempotencyKey,
        body: {
          essays: essays.map(({ themeId, essayTypeId, assetId }) => ({ themeId, essayTypeId, assetId, parentEssayId })),
          aiNoticeAccepted: needsAiNotice ? true : undefined,
        } satisfies BatchEssayRequest,
      }),
    onSuccess: async () => {
      await clearDraft();
      await queryClient.invalidateQueries();
      navigate('/painel');
    },
  });

  const cost = essays.length;
  const balance = account.data?.credits.total;
  const needsAiNotice = account.data ? !account.data.aiNoticeAccepted : false;
  const insufficient = balance !== undefined && balance < cost;
  const canConfirm = balance !== undefined && !insufficient && (!needsAiNotice || aiNoticeChecked) && !send.isPending;

  return (
    <Modal title="Confirme o envio" onClose={onClose}>
      <ul className={styles.pending}>
        {essays.map((essay) => (
          <li key={essay.assetId}>
            <SheetThumb />
            <span>
              <span className={styles.strong}>{essay.title}</span>
              <span className={`muted ${styles.small}`}>{essay.fileName}</span>
            </span>
          </li>
        ))}
      </ul>

      <dl className={styles.costs}>
        <dt className="muted">Custo</dt>
        <dd>{corrections(cost)}</dd>
        <dt className="muted">Saldo depois do envio</dt>
        <dd>{balance === undefined ? <Skeleton width={90} height={18} /> : corrections(Math.max(0, balance - cost))}</dd>
      </dl>

      <Notice>
        Depois de confirmar, a leitura da redação começa na hora. Não é possível trocar a foto nem cancelar o envio.
      </Notice>

      {needsAiNotice && (
        <label className={styles.aiNotice}>
          <input type="checkbox" checked={aiNoticeChecked} onChange={(event) => setAiNoticeChecked(event.target.checked)} />
          <span>
            A correção é feita por IA, segue os critérios públicos da Fuvest e não substitui a banca. O texto da redação
            é enviado a um provedor de IA nos Estados Unidos.
          </span>
        </label>
      )}

      {insufficient && (
        <p className={styles.modalError} role="alert">
          Você não tem correções suficientes para este envio. <Link to="/comprar?voltar=envio">Comprar correções</Link>
        </p>
      )}
      {send.error && (
        <p className={styles.modalError} role="alert">
          {errorMessage(send.error)}
        </p>
      )}

      <div className={styles.modalActions}>
        <Button variant="ghost" onClick={onClose}>
          Voltar e revisar
        </Button>
        <Button disabled={!canConfirm} onClick={() => send.mutate()}>
          Confirmar envio
        </Button>
      </div>
    </Modal>
  );
}
