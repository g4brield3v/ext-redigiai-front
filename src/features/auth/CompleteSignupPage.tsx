import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { ErrorState, Field, Skeleton } from '../../components/primitives';
import { ApiError, api, unwrap } from '../../lib/api';
import { useAuthState } from './AuthContext';
import { useSignOut } from './useSignOut';
import { LoginShell, TermsNotice } from './LoginPage';
import styles from './LoginPage.module.css';
import { clearPendingSignup, maskBirthDate, parseBirthDate, readPendingSignup, safeNext } from './signup';

/**
 * Depois do login: se o usuário ainda não existe na plataforma, faz o primeiro acesso (POST /v1/me)
 * com a data de nascimento; depois volta para onde a pessoa estava.
 */
export function CompleteSignupPage() {
  const auth = useAuthState();
  const signOut = useSignOut();
  const queryClient = useQueryClient();
  const [pending] = useState(readPendingSignup);
  const [params] = useSearchParams();
  const [birth, setBirth] = useState('');
  const [birthError, setBirthError] = useState<string | null>(null);
  const autoSubmitted = useRef(false);

  const profile = useQuery({
    queryKey: ['me'],
    queryFn: () => unwrap(api.GET('/v1/me')),
    enabled: auth.isLoaded && auth.isSignedIn,
    retry: false,
  });

  const register = useMutation({
    mutationFn: (birthDate: string) =>
      unwrap(api.POST('/v1/me', { body: { birthDate, termsAccepted: true } })),
    onSuccess: (created) => queryClient.setQueryData(['me'], created),
  });
  const { mutate: registerUser } = register;

  const needsSignup = profile.error instanceof ApiError && profile.error.code === 'PROFILE_NOT_FOUND';
  const underAge =
    register.error instanceof ApiError && register.error.code === 'AGE_BELOW_MINIMUM' ? register.error : null;

  // A data já foi informada na tela de login: conclui o cadastro sem pedir de novo.
  useEffect(() => {
    if (needsSignup && pending.birthDate && !autoSubmitted.current) {
      autoSubmitted.current = true;
      registerUser(pending.birthDate);
    }
  }, [needsSignup, pending.birthDate, registerUser]);

  const done = profile.isSuccess || register.isSuccess;
  useEffect(() => {
    if (done) {
      clearPendingSignup();
    }
  }, [done]);

  if (auth.isLoaded && !auth.isSignedIn) {
    return <Navigate to="/entrar" replace />;
  }

  if (done) {
    // Para onde voltar: o que o login guardou ou, vindo de uma rota logada, o ?next= dela.
    return <Navigate to={safeNext(pending.next ?? params.get('next'))} replace />;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const birthDate = parseBirthDate(birth);
    if (!birthDate) {
      setBirthError('Informe a data no formato dd/mm/aaaa.');
      return;
    }
    setBirthError(null);
    registerUser(birthDate);
  }

  let content;
  if (underAge) {
    content = (
      <div className={styles.center}>
        <p className={styles.error} role="alert">
          {underAge.message}
        </p>
        <Button variant="ghost" block onClick={() => void signOut()}>
          Sair
        </Button>
      </div>
    );
  } else if (needsSignup && !(pending.birthDate && register.isPending)) {
    const serverError = register.error instanceof ApiError ? register.error.message : null;
    content = (
      <form className={styles.form} onSubmit={submit} noValidate>
        <Field
          label="Data de nascimento"
          type="text"
          inputMode="numeric"
          autoComplete="bday"
          placeholder="dd/mm/aaaa"
          required
          value={birth}
          onChange={(event) => setBirth(maskBirthDate(event.target.value))}
          hint="A plataforma é para quem tem 16 anos ou mais."
          error={birthError ?? serverError}
        />
        <Button type="submit" block disabled={register.isPending}>
          Continuar
        </Button>
        <TermsNotice />
      </form>
    );
  } else if (profile.error && !needsSignup) {
    content = (
      <ErrorState
        message={profile.error instanceof ApiError ? profile.error.message : 'Algo deu errado do nosso lado. Tente novamente em instantes.'}
        onRetry={() => void profile.refetch()}
      />
    );
    content = (
      <div className={styles.center}>
        {content}
        <Button variant="ghost" block onClick={() => void signOut()}>
          Sair
        </Button>
      </div>
    );
  } else {
    content = (
      <div className={styles.center} aria-busy="true" aria-label="Carregando a sua conta">
        <Skeleton height={48} radius={12} />
        <Skeleton height={48} radius={999} />
      </div>
    );
  }

  return (
    <LoginShell closeTo="/propostas">
      {content}
    </LoginShell>
  );
}
