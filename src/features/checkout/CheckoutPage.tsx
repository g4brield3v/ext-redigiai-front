import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Nav } from '../../components/Nav';
import { CheckIcon, ErrorState, Skeleton } from '../../components/primitives';
import { ApiError, errorMessage, request } from '../../lib/api';
import type { Schemas } from '../../lib/api';
import { formatDay, formatMoney } from '../../lib/format';
import type { CardInput } from '../../lib/mercadopago';
import { useAccount } from '../../lib/queries';
import { CardForm } from './CardForm';
import styles from './CheckoutPage.module.css';

type Payment = Schemas['PaymentDto'];
type PlanCheckout = Schemas['PlanCheckoutDto'];

// Preços exibidos na tela; o valor cobrado é sempre o que o backend calcula.
const PLAN_CENTS = 3990;
const SINGLE_CENTS = 1600;
// Quanto esperar a confirmação do plano antes de sugerir conferir depois.
const PLAN_WAIT_MS = 60_000;

type Product = 'plan' | 'single';
type Method = 'pix' | 'card';
type Stage = { kind: 'form' } | { kind: 'pix'; payment: Payment } | { kind: 'card'; paymentId: string } | { kind: 'plan'; since: number; firstChargeAt: string | null };

const REJECTED = 'O pagamento não foi aprovado. Tente outro meio de pagamento.';

/**
 * Situação do pagamento, sempre perguntada ao backend (que consulta o Mercado Pago): a tela nunca
 * mostra "aprovado" por conta própria. Consulta a cada 3 s enquanto estiver pendente.
 */
function usePaymentStatus(paymentId: string) {
  return useQuery({
    queryKey: ['payment', paymentId],
    queryFn: () => request<Payment>('GET', `/v1/payments/${encodeURIComponent(paymentId)}`),
    refetchInterval: (query) => (query.state.data?.status === 'pending' || !query.state.data ? 3000 : false),
  });
}

function Confirming() {
  return (
    <section className={styles.card} aria-live="polite" aria-busy="true">
      <h2 className="h3">Confirmando o pagamento</h2>
      <span className="muted">Isso leva alguns segundos. A página avisa assim que o pagamento for aprovado.</span>
    </section>
  );
}

/** Cartão da compra avulsa: espera a confirmação do backend. */
function CardPaymentStatus({ paymentId, onApproved, onRetry }: { paymentId: string; onApproved: () => void; onRetry: () => void }) {
  const payment = usePaymentStatus(paymentId);

  if (payment.error) {
    return <ErrorState message={errorMessage(payment.error)} onRetry={() => void payment.refetch()} />;
  }
  if (payment.data?.status === 'approved') {
    return <Approved onContinue={onApproved} />;
  }
  if (payment.data && payment.data.status !== 'pending') {
    return <ErrorState message={REJECTED} onRetry={onRetry} />;
  }
  return <Confirming />;
}

/** Pix: QR code e copia-e-cola vindos da API. */
function PixPayment({ payment, onApproved, onRetry }: { payment: Payment; onApproved: () => void; onRetry: () => void }) {
  const [copied, setCopied] = useState(false);
  const status = usePaymentStatus(payment.id);
  const pix = payment.pix;

  if (status.data?.status === 'approved') {
    return <Approved onContinue={onApproved} />;
  }
  if (!pix || (status.data && status.data.status !== 'pending')) {
    return <ErrorState message={REJECTED} onRetry={onRetry} />;
  }

  // Só a imagem que a API mandou, em base64; nada além disso entra no src.
  const qrCode = /^[A-Za-z0-9+/=]+$/.test(pix.qrCodeBase64) ? `data:image/png;base64,${pix.qrCodeBase64}` : null;

  return (
    <section className={styles.card} aria-live="polite">
      <h2 className="h3">Pague com Pix</h2>
      <div className={styles.pix}>
        <div className={styles.qr} role="img" aria-label="QR code do Pix">
          {qrCode ? <img src={qrCode} alt="" /> : <span className="muted">QR code</span>}
        </div>
        <div className={styles.pixInfo}>
          <label htmlFor="pix-code" className={styles.label}>
            Pix copia e cola
          </label>
          <textarea id="pix-code" readOnly rows={3} value={pix.copyPaste} />
          <Button
            variant="ghost"
            className={styles.start}
            onClick={() => void navigator.clipboard.writeText(pix.copyPaste).then(() => setCopied(true))}
          >
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
          <span className="muted">O código vale por 30 minutos. A página avisa assim que o pagamento for aprovado.</span>
        </div>
      </div>
    </section>
  );
}

/** Plano: a assinatura aparece ativa em GET /v1/me quando o backend confirma no Mercado Pago. */
function PlanConfirmation({
  since,
  firstChargeAt,
  onApproved,
  onRetry,
}: {
  since: number;
  /** Assinou de novo com o ciclo pago valendo: a primeira cobrança é no fim dele. */
  firstChargeAt: string | null;
  onApproved: () => void;
  onRetry: () => void;
}) {
  const queryClient = useQueryClient();
  const account = useAccount();
  const [late, setLate] = useState(false);
  const status = account.data?.subscription?.status;

  useEffect(() => {
    // Consulta só durante a espera: ativa, cancelada ou depois de 60 s, para.
    if (status === 'active' || status === 'cancelled' || late) return;
    const poll = setInterval(() => void queryClient.invalidateQueries({ queryKey: ['me'] }), 2000);
    const timeout = setTimeout(() => setLate(true), Math.max(0, since + PLAN_WAIT_MS - Date.now()));
    return () => {
      clearInterval(poll);
      clearTimeout(timeout);
    };
  }, [queryClient, since, status, late]);

  if (status === 'cancelled') {
    return <ErrorState message="Não conseguimos ativar o plano com este cartão. Tente outro cartão." onRetry={onRetry} />;
  }

  if (status === 'active') {
    const next = account.data?.subscription?.nextBillingAt;
    return (
      <section className={`${styles.card} ${styles.approved}`} role="status">
        <span className={styles.approvedTitle}>
          <CheckIcon size={18} color="#17603B" />
          Seu plano mensal está ativo
        </span>
        <span className="muted">
          {firstChargeAt
            ? `Seu plano volta a renovar em ${formatDay(firstChargeAt)}; as correções que você tem continuam valendo. A primeira cobrança de R$ 39,90 é nessa data.`
            : `As 12 correções entram no seu saldo assim que a primeira cobrança for aprovada${next ? `, e valem até ${formatDay(next)}` : ''}.`}
        </span>
        <Button className={styles.start} onClick={onApproved}>
          Continuar
        </Button>
      </section>
    );
  }
  if (late) {
    return (
      <section className={styles.card} role="status">
        <h2 className="h3">Ainda não recebemos a confirmação</h2>
        <span className="muted">O Mercado Pago pode levar alguns minutos. Confira a assinatura em Meu perfil daqui a pouco.</span>
        <Button className={styles.start} to="/perfil">
          Ir para o perfil
        </Button>
      </section>
    );
  }
  return <Confirming />;
}

function Approved({ onContinue }: { onContinue: () => void }) {
  return (
    <section className={`${styles.card} ${styles.approved}`} role="status">
      <span className={styles.approvedTitle}>
        <CheckIcon size={18} color="#17603B" />
        Pagamento aprovado
      </span>
      <span className="muted">As correções já estão no seu saldo.</span>
      <Button className={styles.start} onClick={onContinue}>
        Continuar
      </Button>
    </section>
  );
}

/**
 * Checkout transparente: plano mensal no cartão ou correção avulsa por Pix ou cartão, sem sair da plataforma. O cartão
 * é digitado no formulário do Mercado Pago dentro da página. Tela sem design; segue o design system.
 */
export function CheckoutPage() {
  const account = useAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const [product, setProduct] = useState<Product>('single');
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<Method>('pix');
  const [guardianAuthorized, setGuardianAuthorized] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: 'form' });

  const needsGuardian = account.data?.needsGuardianAuthorization ?? false;
  const hasPlan = account.data?.subscription?.status === 'active' || account.data?.subscription?.status === 'paused';
  // Correções do plano ainda valendo (plano cancelado no meio do ciclo): assinar de novo não cobra agora. A data que vale
  // é a que o backend devolve na assinatura; esta só avisa antes.
  const planCycleEnd = (account.data?.credits.buckets ?? [])
    .filter((bucket) => bucket.source === 'plan' && bucket.expiresAt)
    .map((bucket) => bucket.expiresAt!)
    .sort()
    .at(-1);
  // Uma chave por intenção de compra: repetir o clique (ou a tentativa) não cria um segundo pagamento.
  // Ela muda quando muda o que está sendo comprado, e a cada cartão enviado na avulsa (outro token, outra tentativa).
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  function change<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setIdempotencyKey(crypto.randomUUID());
  }

  function restart() {
    setIdempotencyKey(crypto.randomUUID());
    setStage({ kind: 'form' });
  }

  const pix = useMutation({
    mutationFn: () =>
      request<Payment>('POST', '/v1/checkout/single', { idempotencyKey, body: { quantity, method: 'pix', guardianAuthorized } }),
    onSuccess: (payment) => setStage({ kind: 'pix', payment }),
  });

  const card = useMutation({
    mutationFn: (input: CardInput): Promise<Payment | PlanCheckout> =>
      product === 'plan'
        ? request<PlanCheckout>('POST', '/v1/checkout/plan', { idempotencyKey, body: { guardianAuthorized, card: input } })
        : request<Payment>('POST', '/v1/checkout/single', {
            idempotencyKey,
            body: { quantity, method: 'card', guardianAuthorized, card: input },
          }),
    onError: (error) => {
      // Cartão recusado na avulsa: a compra daquela chave ficou recusada; o próximo cartão é outra compra. (No plano, a
      // mesma chave aceita o cartão novo.) Erros de rede mantêm a chave: a compra pode ter chegado ao Mercado Pago.
      if (product === 'single' && error instanceof ApiError && error.code === 'PAYMENT_FAILED') {
        setIdempotencyKey(crypto.randomUUID());
      }
    },
    onSuccess: (response) => {
      if ('subscriptionId' in response) {
        void queryClient.invalidateQueries({ queryKey: ['me'] });
        setStage({ kind: 'plan', since: Date.now(), firstChargeAt: response.firstChargeAt ?? null });
      } else {
        // O token do cartão só vale uma vez: a próxima tentativa é outra compra.
        setIdempotencyKey(crypto.randomUUID());
        setStage({ kind: 'card', paymentId: response.id });
      }
    },
  });

  async function finish() {
    await queryClient.invalidateQueries();
    if (params.get('voltar') === 'envio') {
      navigate(-1);
    } else {
      navigate('/painel');
    }
  }

  const total = product === 'plan' ? PLAN_CENTS : SINGLE_CENTS * quantity;
  const usesCard = product === 'plan' || method === 'card';
  const blocked = needsGuardian && !guardianAuthorized;
  const error = pix.error ?? card.error;

  return (
    <>
      <Nav />
      <main className={`container ${styles.page}`}>
        <div className={styles.intro}>
          <span className="eyebrow">Comprar correções</span>
          <h1 className="serif h1">Escolha como quer corrigir</h1>
        </div>

        {stage.kind === 'pix' ? (
          <PixPayment payment={stage.payment} onApproved={() => void finish()} onRetry={restart} />
        ) : stage.kind === 'card' ? (
          <CardPaymentStatus paymentId={stage.paymentId} onApproved={() => void finish()} onRetry={restart} />
        ) : stage.kind === 'plan' ? (
          <PlanConfirmation since={stage.since} firstChargeAt={stage.firstChargeAt} onApproved={() => void finish()} onRetry={restart} />
        ) : !account.data ? (
          account.error ? (
            <ErrorState message={errorMessage(account.error)} onRetry={() => void account.refetch()} />
          ) : (
            <Skeleton height={360} radius={18} />
          )
        ) : (
          // Sem <form> em volta: o formulário de cartão do Mercado Pago tem o dele.
          <div className={styles.layout}>
            <fieldset className={styles.options}>
              <legend className="visually-hidden">O que você quer comprar</legend>
              <label className={product === 'single' ? styles.optionOn : undefined}>
                <input type="radio" name="produto" checked={product === 'single'} onChange={() => change(setProduct, 'single')} />
                <span>
                  <span className={styles.strong}>Correção avulsa</span>
                  <span className="muted">R$ 16 por correção · Pix ou cartão · não vence</span>
                </span>
              </label>
              <label className={product === 'plan' ? styles.optionOn : undefined}>
                <input
                  type="radio"
                  name="produto"
                  checked={product === 'plan'}
                  disabled={hasPlan}
                  onChange={() => change(setProduct, 'plan')}
                />
                <span>
                  <span className={styles.strong}>Plano mensal{hasPlan ? ' · você já assina' : ''}</span>
                  <span className="muted">R$ 39,90/mês · 12 correções por mês · cartão de crédito</span>
                </span>
              </label>
            </fieldset>

            <section className={styles.card}>
              {product === 'single' ? (
                <>
                  <div className={styles.field}>
                    <label htmlFor="quantidade" className={styles.label}>
                      Quantidade
                    </label>
                    <select id="quantidade" value={quantity} onChange={(event) => change(setQuantity, Number(event.target.value))}>
                      {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                  <fieldset className={styles.methods}>
                    <legend className={styles.label}>Forma de pagamento</legend>
                    <label>
                      <input type="radio" name="metodo" checked={method === 'pix'} onChange={() => change(setMethod, 'pix')} />
                      Pix
                    </label>
                    <label>
                      <input type="radio" name="metodo" checked={method === 'card'} onChange={() => change(setMethod, 'card')} />
                      Cartão de crédito
                    </label>
                  </fieldset>
                </>
              ) : (
                <>
                  {planCycleEnd && (
                    <p className={styles.check} role="note">
                      Você ainda tem correções do plano até {formatDay(planCycleEnd)}. Ao assinar de novo, nada é cobrado agora: o
                      plano volta a renovar nessa data, e as correções que você tem continuam valendo.
                    </p>
                  )}
                  <p className="muted">
                    12 correções a cada cobrança aprovada, válidas até a cobrança seguinte. Na renovação, o saldo do plano volta
                    a 12; as correções que sobrarem não passam para o mês seguinte. A cobrança é mensal, no cartão de crédito,
                    com renovação automática.
                  </p>
                </>
              )}

              <div className={styles.total}>
                <span className="muted">Total</span>
                <span className={`serif ${styles.price}`}>
                  {formatMoney(total)}
                  {product === 'plan' && <span className={`muted ${styles.perMonth}`}> /mês</span>}
                </span>
              </div>

              {needsGuardian && (
                <label className={styles.check}>
                  <input type="checkbox" checked={guardianAuthorized} onChange={(event) => setGuardianAuthorized(event.target.checked)} />
                  <span>Meu responsável autorizou esta compra.</span>
                </label>
              )}

              <p className={`muted ${styles.refund}`}>
                Você pode desistir em até 7 dias e receber o valor das correções não usadas. Correções já entregues não
                são reembolsadas.
              </p>

              {error && <ErrorState message={errorMessage(error)} />}

              {!usesCard ? (
                <Button block disabled={pix.isPending || blocked} onClick={() => pix.mutate()}>
                  Gerar Pix
                </Button>
              ) : blocked ? (
                <span className="muted">Marque a autorização do responsável para preencher o cartão.</span>
              ) : (
                // Recriado quando muda o valor: o formulário do Mercado Pago mostra o total da compra.
                <CardForm key={`${product}-${total}`} amountCents={total} onSubmit={(input) => card.mutateAsync(input).then(() => undefined)} />
              )}
            </section>
          </div>
        )}
      </main>
    </>
  );
}
