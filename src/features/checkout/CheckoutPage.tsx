import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { CheckoutResponse, Payment, PixCheckout } from '../../api/mock-types';
import { Button } from '../../components/Button';
import { Nav } from '../../components/Nav';
import { CheckIcon, ErrorState, Skeleton } from '../../components/primitives';
import { errorMessage, request } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import { useAccount } from '../../lib/queries';
import styles from './CheckoutPage.module.css';

// Preços exibidos na tela; o valor cobrado é sempre o que o backend calcula.
const PLAN_CENTS = 3990;
const SINGLE_CENTS = 1600;

type Product = 'plan' | 'single';
type Method = 'pix' | 'card';

/** O checkout do cartão é do Mercado Pago; qualquer outro destino é recusado. */
function isCheckoutUrl(url: string) {
  try {
    const target = new URL(url, window.location.origin);
    return (
      target.origin === window.location.origin ||
      (target.protocol === 'https:' && /(^|\.)mercadopago\.com(\.br)?$/.test(target.hostname))
    );
  } catch {
    return false;
  }
}

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

/** Volta do checkout do cartão: mostra o resultado que o backend confirmar. */
function ReturnedPayment({ paymentId, onApproved }: { paymentId: string; onApproved: () => void }) {
  const payment = usePaymentStatus(paymentId);

  if (payment.error) {
    return <ErrorState message={errorMessage(payment.error)} onRetry={() => void payment.refetch()} />;
  }
  if (payment.data?.status === 'approved') {
    return <Approved onContinue={onApproved} />;
  }
  if (payment.data && payment.data.status !== 'pending') {
    return <ErrorState message="O pagamento não foi aprovado. Tente outro meio de pagamento." />;
  }
  return (
    <section className={styles.card} aria-live="polite" aria-busy="true">
      <h2 className="h3">Confirmando o pagamento</h2>
      <span className="muted">Isso leva alguns segundos. A página avisa assim que o pagamento for aprovado.</span>
    </section>
  );
}

/** Pix: QR code e copia-e-cola vindos da API. */
function PixPayment({ pix, onApproved }: { pix: PixCheckout; onApproved: () => void }) {
  const [copied, setCopied] = useState(false);
  const payment = usePaymentStatus(pix.paymentId);

  if (payment.data?.status === 'approved') {
    return <Approved onContinue={onApproved} />;
  }
  if (payment.data?.status === 'rejected') {
    return <ErrorState message="O pagamento não foi aprovado. Tente outro meio de pagamento." />;
  }

  return (
    <section className={styles.card} aria-live="polite">
      <h2 className="h3">Pague com Pix</h2>
      <div className={styles.pix}>
        <div className={styles.qr} role="img" aria-label="QR code do Pix">
          {pix.qrCode.startsWith('data:') ? <img src={pix.qrCode} alt="" /> : <span className="muted">QR code</span>}
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

/** Checkout: plano semanal no cartão ou correção avulsa por Pix ou cartão. Tela sem design; segue o design system. */
export function CheckoutPage() {
  const account = useAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const [product, setProduct] = useState<Product>('single');
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<Method>('pix');
  const [guardianAuthorized, setGuardianAuthorized] = useState(false);

  const needsGuardian = account.data?.needsGuardianAuthorization ?? false;
  const hasPlan = account.data?.subscription?.status === 'active';
  const returnedPaymentId = params.get('pagamento');
  // Uma chave por intenção de compra: repetir o clique (ou a tentativa) não cria um segundo pagamento.
  // Ela só muda quando muda o que está sendo comprado.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [redirectError, setRedirectError] = useState(false);

  function change<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setIdempotencyKey(crypto.randomUUID());
  }

  const checkout = useMutation({
    mutationFn: () =>
      product === 'plan'
        ? request<CheckoutResponse>('POST', '/v1/checkout/plan', { idempotencyKey, body: { guardianAuthorized } })
        : request<CheckoutResponse>('POST', '/v1/checkout/single', {
            idempotencyKey,
            body: { quantity, method, guardianAuthorized },
          }),
    onSuccess: (response) => {
      // Cartão: o pagamento acontece na página do Mercado Pago; o número do cartão nunca passa por aqui.
      if (response.method === 'card') {
        if (isCheckoutUrl(response.checkoutUrl)) {
          window.location.assign(response.checkoutUrl);
        } else {
          setRedirectError(true);
        }
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
  const pix = checkout.data?.method === 'pix' ? checkout.data : null;

  return (
    <>
      <Nav />
      <main className={`container ${styles.page}`}>
        <div className={styles.intro}>
          <span className="eyebrow">Comprar correções</span>
          <h1 className="serif h1">Escolha como quer corrigir</h1>
        </div>

        {returnedPaymentId ? (
          <ReturnedPayment paymentId={returnedPaymentId} onApproved={() => void finish()} />
        ) : pix ? (
          <PixPayment pix={pix} onApproved={() => void finish()} />
        ) : !account.data ? (
          account.error ? (
            <ErrorState message={errorMessage(account.error)} onRetry={() => void account.refetch()} />
          ) : (
            <Skeleton height={360} radius={18} />
          )
        ) : (
          <form
            className={styles.layout}
            onSubmit={(event) => {
              event.preventDefault();
              checkout.mutate();
            }}
          >
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
                  <span className={styles.strong}>Plano semanal{hasPlan ? ' · você já assina' : ''}</span>
                  <span className="muted">R$ 39,90/mês · 3 correções por semana · cartão de crédito</span>
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
                <p className="muted">
                  3 correções toda segunda-feira. As não usadas acumulam e vencem no dia 1º de cada mês. A cobrança é
                  mensal, no cartão de crédito, com renovação automática.
                </p>
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

              {checkout.error && <ErrorState message={errorMessage(checkout.error)} />}
              {redirectError && <ErrorState message="Algo deu errado do nosso lado. Tente novamente em instantes." />}

              <Button type="submit" block disabled={checkout.isPending || (needsGuardian && !guardianAuthorized)}>
                {product === 'plan' ? 'Assinar o plano semanal' : method === 'pix' ? 'Gerar Pix' : 'Pagar com cartão'}
              </Button>
            </section>
          </form>
        )}
      </main>
    </>
  );
}
