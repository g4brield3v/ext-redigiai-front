import type { Page } from '@playwright/test';

// Sessão dos testes de telas logadas: o próprio teste injeta a sessão (src/features/auth/E2eAuthProvider.tsx, só no
// build --mode e2e) e responde o perfil. Nenhuma chamada vai ao Clerk nem a um backend real.

const profile = {
  id: 'u-e2e',
  email: 'aluna@example.com',
  name: 'Ana',
  isAdmin: false,
  termsAcceptanceRequired: false,
  aiNoticeAccepted: true,
  emailPreferences: { correctionReady: true, illegibleReminder: true, newThemes: false },
  credits: { total: 3, buckets: [] },
  subscription: null,
  needsGuardianAuthorization: false,
  planResumesAt: null,
};

/** Entra como uma aluna cadastrada, antes de a página carregar. */
export async function signIn(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__redigiaiE2eSession = { initial: 'A' };
  });
  await page.route('**/v1/me', (route) => route.fulfill({ json: profile }));
}
