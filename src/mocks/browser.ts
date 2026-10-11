import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** Liga os dados simulados (VITE_USE_MOCKS=true). O que não tiver resposta simulada segue para a rede. */
export async function startMocks() {
  await setupWorker(...handlers).start({ onUnhandledRequest: 'bypass', quiet: true });
}
