import type { Page } from '@playwright/test';

// As telas aprovadas (docs/telas) e como chegar em cada uma com os dados simulados.

export const THEME_ID = '0198f0c0-0000-7000-8000-000000000101';

/** "Hoje" das telas aprovadas: 11/10/2026, 15h em Brasília. */
export const DESIGN_NOW = new Date('2026-10-11T18:00:00Z');

export const viewports = {
  desktop: { width: 1440, height: 900 },
  celular: { width: 390, height: 844 },
} as const;

export type Device = keyof typeof viewports;

export type Screen = {
  /** Nome do arquivo em docs/telas/png, sem o sufixo -desktop/-celular. */
  name: string;
  path: string;
  signedIn: boolean;
  devices?: Device[];
  /** Deixa a tela no mesmo estado da imagem aprovada. */
  prepare?: (page: Page) => Promise<void>;
};

async function choosePhoto(page: Page) {
  await page.getByRole('radio', { name: /Dissertação/ }).check();
  await page.getByLabel('Foto da folha').setInputFiles({
    name: 'foto-redacao.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.alloc(Math.round(2.4 * 1024 * 1024)),
  });
  await page.getByText('foto-redacao.jpg').waitFor();
}

async function fillWords(page: Page) {
  const fields = page.getByLabel('O que está escrito');
  await fields.nth(0).fill('controlam');
  await fields.nth(1).fill('recebe');
  await fields.nth(1).blur();
}

export const screens: Screen[] = [
  { name: '01-inicio', path: '/', signedIn: false },
  { name: '02-temas', path: '/temas', signedIn: false },
  { name: '03-tema-envio', path: `/temas/${THEME_ID}`, signedIn: false, prepare: choosePhoto },
  {
    name: '03b-modal-confirmar-envio',
    path: `/temas/${THEME_ID}`,
    signedIn: true,
    prepare: async (page) => {
      await choosePhoto(page);
      await page.getByRole('button', { name: 'Enviar para correção' }).click();
      await page.getByRole('dialog', { name: 'Confirme o envio' }).waitFor();
    },
  },
  {
    name: '04-login',
    path: `/temas/${THEME_ID}`,
    signedIn: false,
    prepare: async (page) => {
      await choosePhoto(page);
      await page.getByRole('button', { name: 'Enviar para correção' }).click();
      await page.getByRole('dialog', { name: 'Entre para enviar sua redação' }).waitFor();
      await page.getByText('A foto está guardada.').waitFor();
    },
  },
  { name: '05-camera-celular', path: `/enviar/foto?tema=${THEME_ID}`, signedIn: false, devices: ['celular'] },
  { name: '06-revisao-ilegiveis', path: '/redacoes/exemplo/revisao', signedIn: true, prepare: fillWords },
  {
    name: '06b-modal-confirmar-palavras',
    path: '/redacoes/exemplo/revisao',
    signedIn: true,
    prepare: async (page) => {
      await fillWords(page);
      await page.getByRole('button', { name: 'Enviar para correção' }).click();
      await page.getByRole('dialog', { name: 'Confira as palavras' }).waitFor();
    },
  },
  { name: '08-painel', path: '/painel', signedIn: true },
  { name: '09-correcao', path: '/redacoes/essay-v2', signedIn: true },
  { name: '10-perfil', path: '/perfil', signedIn: true },
];

/** Espera a aplicação montar e os dados chegarem (nenhum esqueleto de carregamento na tela). */
async function settle(page: Page) {
  await page.locator('#root header').first().waitFor();
  await page.waitForLoadState('networkidle');
  await page.locator('[aria-busy="true"]').first().waitFor({ state: 'detached' });
}

/** Abre a tela no estado da imagem aprovada, com o relógio parado no "hoje" das telas. */
export async function openScreen(page: Page, screen: Screen, device: Device) {
  await page.setViewportSize(viewports[device]);
  await page.clock.setFixedTime(DESIGN_NOW);
  await page.addInitScript((signedIn) => {
    if (signedIn) {
      sessionStorage.setItem('redigiai.mock.session', 'ana');
    }
  }, screen.signedIn);
  await page.goto(screen.path);
  await settle(page);
  await screen.prepare?.(page);
  await settle(page);
  await page.evaluate(() => document.fonts.ready);
}
