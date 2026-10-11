// Formatação para exibição. Datas sempre no horário de Brasília; os valores vêm prontos da API.

const ZONE = 'America/Sao_Paulo';

const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const dayMonth = new Intl.DateTimeFormat('pt-BR', { timeZone: ZONE, day: '2-digit', month: '2-digit' });
const fullDate = new Intl.DateTimeFormat('pt-BR', { timeZone: ZONE, day: '2-digit', month: '2-digit', year: 'numeric' });
const time = new Intl.DateTimeFormat('pt-BR', { timeZone: ZONE, hour: '2-digit', minute: '2-digit' });
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Diferença em dias de calendário (Brasília) entre a data e agora: 0 = hoje, 1 = amanhã, −1 = ontem. */
function daysFromToday(date: Date, now: Date) {
  const toUtc = (value: Date) => Date.parse(`${dayKey.format(value)}T00:00:00Z`);
  return Math.round((toUtc(date) - toUtc(now)) / 86_400_000);
}

/** 10/10 */
export function formatDay(iso: string) {
  return dayMonth.format(new Date(iso));
}

/** 28/09/2026 */
export function formatFullDate(iso: string) {
  return fullDate.format(new Date(iso));
}

/** "Hoje, 09:12" no dia do envio; depois, "10/10". */
export function formatSentAt(iso: string, now = new Date()) {
  const date = new Date(iso);
  return daysFromToday(date, now) === 0 ? `Hoje, ${time.format(date)}` : dayMonth.format(date);
}

/** "amanhã, 09:12", "hoje, 09:12" ou "12/10, 09:12". */
export function formatDeadline(iso: string, now = new Date()) {
  const date = new Date(iso);
  const days = daysFromToday(date, now);
  const day = days === 0 ? 'hoje' : days === 1 ? 'amanhã' : dayMonth.format(date);
  return `${day}, ${time.format(date)}`;
}

/** R$ 39,90 */
export function formatMoney(cents: number) {
  return money.format(cents / 100).replace(/\u00a0/g, ' ');
}

/** "1 correção", "2 correções" */
export function corrections(count: number) {
  return `${count} ${count === 1 ? 'correção' : 'correções'}`;
}

/** "2,4 MB" */
export function formatSize(bytes: number) {
  const megabytes = bytes / (1024 * 1024);
  return megabytes >= 0.1
    ? `${megabytes.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
