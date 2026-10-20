// SDK do Mercado Pago no navegador, para o formulário de cartão (Card Payment Brick).
// O número, a validade e o código do cartão são digitados em campos do próprio Mercado Pago, dentro de iframes; a
// nossa página só recebe o token de uso único que o formulário gera. O script vem do domínio oficial, como o Mercado
// Pago exige (ele não publica versões fixas), sem pacote npm; a política de segurança (Caddyfile) libera só os
// domínios dele.

const SDK_URL = 'https://sdk.mercadopago.com/js/v2';

/** O que o formulário devolve ao enviar. Nunca o número do cartão. */
export type BrickCardData = {
  token: string;
  payment_method_id: string;
  issuer_id?: string | number | null;
  payer?: { identification?: { type?: string | null; number?: string | null } | null } | null;
};

/** O cartão no formato da API (`CardPaymentRequest`). */
export type CardInput = {
  token: string;
  paymentMethodId: string;
  issuerId: string | null;
  identificationType: string | null;
  identificationNumber: string | null;
};

export type BrickController = { unmount: () => void };

type BrickSettings = {
  initialization: { amount: number };
  customization: { paymentMethods: { maxInstallments: number; minInstallments: number } };
  locale: string;
  callbacks: {
    onReady: () => void;
    onSubmit: (data: BrickCardData) => Promise<void>;
    onError: (error: unknown) => void;
  };
};

type MercadoPagoInstance = {
  bricks: () => { create: (kind: 'cardPayment', containerId: string, settings: BrickSettings) => Promise<BrickController> };
};

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => MercadoPagoInstance;
  }
}

let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.MercadoPago) {
    return Promise.resolve();
  }
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error('mercadopago sdk'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** A chave pública do Mercado Pago (não é segredo). Sem ela, o cartão fica indisponível. */
export function mercadoPagoPublicKey(): string | null {
  const key = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY as string | undefined;
  return key ? key : null;
}

/** Monta o formulário de cartão no elemento `containerId`. Uma parcela só: o valor é o da compra. */
export async function createCardBrick(
  containerId: string,
  amountCents: number,
  callbacks: BrickSettings['callbacks'],
): Promise<BrickController> {
  const publicKey = mercadoPagoPublicKey();
  if (!publicKey) {
    throw new Error('mercadopago public key');
  }
  await loadScript();
  const MercadoPago = window.MercadoPago;
  if (!MercadoPago) {
    throw new Error('mercadopago sdk');
  }
  const mp = new MercadoPago(publicKey, { locale: 'pt-BR' });
  return mp.bricks().create('cardPayment', containerId, {
    initialization: { amount: amountCents / 100 },
    customization: { paymentMethods: { maxInstallments: 1, minInstallments: 1 } },
    locale: 'pt-BR',
    callbacks,
  });
}

/** Do formulário para a API: só os campos que o backend aceita, como texto. */
export function toCardInput(data: BrickCardData): CardInput {
  const text = (value: string | number | null | undefined) => (value === null || value === undefined || value === '' ? null : String(value));
  return {
    token: data.token,
    paymentMethodId: data.payment_method_id,
    issuerId: text(data.issuer_id),
    identificationType: text(data.payer?.identification?.type),
    identificationNumber: text(data.payer?.identification?.number),
  };
}
