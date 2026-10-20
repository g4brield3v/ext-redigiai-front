import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/Button';
import { Nav } from '../../components/Nav';
import { ErrorState } from '../../components/primitives';
import { errorMessage, request } from '../../lib/api';
import type { Schemas } from '../../lib/api';
import { TermsNotice } from './LoginPage';

/**
 * Os Termos ou a Política mudaram desde o aceite (`termsAcceptanceRequired` no perfil): antes de qualquer tela logada,
 * o aluno aceita a versão vigente. A API recusa o envio de redação até lá.
 */
export function TermsUpdate() {
  const queryClient = useQueryClient();
  const accept = useMutation({
    mutationFn: () => request<Schemas['ProfileDto']>('POST', '/v1/me/terms'),
    onSuccess: (profile) => queryClient.setQueryData(['me'], profile),
  });

  return (
    <>
      <Nav />
      <main className="container" style={{ maxWidth: 560, paddingBlock: 48, display: 'grid', gap: 16 }}>
        <h1 className="serif h2">Termos de uso e Política de privacidade</h1>
        <TermsNotice />
        {accept.error && <ErrorState message={errorMessage(accept.error)} />}
        <Button disabled={accept.isPending} onClick={() => accept.mutate()}>
          Continuar
        </Button>
      </main>
    </>
  );
}
