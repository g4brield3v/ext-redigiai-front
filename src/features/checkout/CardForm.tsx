import { useEffect, useId, useRef, useState } from 'react';
import { ErrorState, Skeleton } from '../../components/primitives';
import { createCardBrick, mercadoPagoPublicKey, toCardInput } from '../../lib/mercadopago';
import type { CardInput } from '../../lib/mercadopago';

/**
 * Formulário de cartão do Mercado Pago, dentro da nossa página (checkout transparente). Os dados do cartão ficam nos
 * campos do Mercado Pago; aqui chega só o token, que vai para a API em `onSubmit`.
 */
export function CardForm({ amountCents, onSubmit }: { amountCents: number; onSubmit: (card: CardInput) => Promise<void> }) {
  // O SDK acha o contêiner pelo id: só letras, números e hífen.
  const containerId = `cartao-${useId().replace(/[^A-Za-z0-9-]/g, '')}`;
  const submit = useRef(onSubmit);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>(mercadoPagoPublicKey() ? 'loading' : 'unavailable');

  useEffect(() => {
    submit.current = onSubmit;
  }, [onSubmit]);

  useEffect(() => {
    if (!mercadoPagoPublicKey()) {
      return;
    }
    let cancelled = false;
    let controller: { unmount: () => void } | null = null;
    // Uma montagem por vez no contêiner: a seguinte (o modo estrito do React monta duas vezes) espera a anterior
    // terminar e sair dele; desmontar uma no meio da criação da outra apaga o que o SDK está montando.
    const creation = queue.current.then(async () => {
      if (cancelled) return;
      try {
        const created = await createCardBrick(containerId, amountCents, {
          onReady: () => {
            if (!cancelled) setState('ready');
          },
          onSubmit: (data) => submit.current(toCardInput(data)),
          onError: () => {
            // Erros de digitação o próprio formulário mostra; aqui só importa se ele não carregou.
          },
        });
        if (cancelled) {
          created.unmount();
        } else {
          controller = created;
        }
      } catch (error) {
        // Só em desenvolvimento: o motivo de o formulário não montar (não há dado de cartão aqui).
        if (import.meta.env.DEV) console.error('Mercado Pago: o formulário de cartão não montou', error);
        if (!cancelled) setState('unavailable');
      }
    });
    queue.current = creation;
    return () => {
      cancelled = true;
      queue.current = creation.then(() => controller?.unmount());
    };
  }, [containerId, amountCents]);

  if (state === 'unavailable') {
    return <ErrorState message="O pagamento com cartão está indisponível agora. Tente novamente em instantes." />;
  }

  return (
    <div aria-busy={state === 'loading'}>
      {state === 'loading' && <Skeleton height={320} radius={12} />}
      <div id={containerId} />
    </div>
  );
}
