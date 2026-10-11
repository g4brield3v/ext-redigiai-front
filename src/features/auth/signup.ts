const STORAGE_KEY = 'redigiai.signup';

/**
 * O que precisa sobreviver à ida ao Google. Fica só nesta aba e some ao fechá-la: se o link do e-mail
 * abrir em outra aba, a data de nascimento é pedida de novo depois do login.
 */
export type PendingSignup = {
  /** Data de nascimento em ISO (aaaa-mm-dd), se já foi informada na tela de login. */
  birthDate?: string;
  /** Para onde voltar depois de entrar. */
  next?: string;
};

export function savePendingSignup(pending: PendingSignup) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // Sem armazenamento (modo privado): a data de nascimento é pedida de novo depois do login.
  }
}

export function readPendingSignup(): PendingSignup {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') {
      const { birthDate, next } = parsed as Record<string, unknown>;
      return {
        birthDate: typeof birthDate === 'string' ? birthDate : undefined,
        next: typeof next === 'string' ? safeNext(next) : undefined,
      };
    }
  } catch {
    // Conteúdo inválido: ignora.
  }
  return {};
}

export function clearPendingSignup() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nada a limpar.
  }
}

/** Só caminhos internos: impede que `?next=` leve para outro site. */
export function safeNext(next: string | null | undefined, fallback = '/temas') {
  // Barra invertida e caracteres de controle são reinterpretados ou removidos pelo navegador ao resolver a URL.
  // eslint-disable-next-line no-control-regex -- a intenção é exatamente barrar caracteres de controle
  if (!next || !next.startsWith('/') || /[\\\u0000-\u001f\u007f]/.test(next)) {
    return fallback;
  }

  try {
    const url = new URL(next, window.location.origin);
    return url.origin === window.location.origin ? url.pathname + url.search + url.hash : fallback;
  } catch {
    return fallback;
  }
}

/** Põe as barras enquanto a pessoa digita: 17052008 → 17/05/2008. */
export function maskBirthDate(input: string) {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('/');
}

/** dd/mm/aaaa → aaaa-mm-dd, ou null se não for uma data do calendário. Quem decide a idade é o backend. */
export function parseBirthDate(input: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input.trim());
  if (!match) {
    return null;
  }

  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid ? `${match[3]}-${match[2]}-${match[1]}` : null;
}
