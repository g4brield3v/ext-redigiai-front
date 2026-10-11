import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Account, Payment } from '../../api/mock-types';
import { Button } from '../../components/Button';
import { Nav } from '../../components/Nav';
import { ErrorState, Field, Modal, Skeleton } from '../../components/primitives';
import { errorMessage, request } from '../../lib/api';
import { formatDay, formatFullDate, formatMoney } from '../../lib/format';
import { useAccount, useExams, usePayments } from '../../lib/queries';
import { useAuthState } from '../auth/AuthContext';
import styles from './ProfilePage.module.css';

const sections = [
  { id: 'dados', label: 'Dados' },
  { id: 'creditos', label: 'Correções e compras' },
  { id: 'avisos', label: 'Avisos por e-mail' },
  { id: 'privacidade', label: 'Privacidade' },
];

const notices: { key: keyof Account['emailPreferences']; title: string; detail: string }[] = [
  { key: 'correctionReady', title: 'Correção pronta', detail: 'O e-mail traz um link para a correção na plataforma.' },
  {
    key: 'illegibleReminder',
    title: 'Palavras ilegíveis pendentes',
    detail: 'Um lembrete 12 horas depois do aviso, se você ainda não tiver preenchido.',
  },
  { key: 'newThemes', title: 'Novos temas', detail: 'Quando publicarmos temas novos para o seu vestibular.' },
];

function describe(payment: Payment) {
  const what = payment.kind === 'plan' ? 'Plano semanal' : payment.quantity > 1 ? `${payment.quantity} correções avulsas` : 'Correção avulsa';
  return `${what} · ${payment.method === 'pix' ? 'Pix' : 'cartão'}`;
}

function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: { name?: string; targetExamSlug?: string; emailPreferences?: Partial<Account['emailPreferences']> }) =>
      request<Account>('PATCH', '/v1/me', { body: changes }),
    onSuccess: (updated) => queryClient.setQueryData(['me'], updated),
  });
}

function DataSection({ account }: { account: Account }) {
  const exams = useExams();
  const update = useUpdateAccount();
  const [name, setName] = useState(account.name ?? '');
  const [examSlug, setExamSlug] = useState(account.targetExamSlug ?? '');

  function submit(event: FormEvent) {
    event.preventDefault();
    update.mutate({ name, targetExamSlug: examSlug || undefined });
  }

  return (
    <section id="dados" className={styles.card}>
      <h2 className={`serif ${styles.h2}`}>Dados</h2>
      <form className={styles.form} onSubmit={submit}>
        <div className={styles.fields}>
          <Field label="Nome" type="text" autoComplete="name" maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
          <Field
            className={styles.readonly}
            label="E-mail"
            type="email"
            value={account.email}
            readOnly
            hint={account.loginProvider === 'google' ? 'Você entra com Google.' : 'Você entra com o link enviado por e-mail.'}
          />
          <div className={styles.select}>
            <label htmlFor="vestibular">Vestibular que você vai prestar</label>
            <select id="vestibular" value={examSlug} onChange={(event) => setExamSlug(event.target.value)}>
              {!examSlug && <option value="">Escolha</option>}
              {(exams.data ?? []).filter((exam) => exam.status === 'active').map((exam) => (
                <option key={exam.slug} value={exam.slug}>
                  {exam.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {update.error && <ErrorState message={errorMessage(update.error)} />}
        <div className={styles.saveRow}>
          <Button type="submit" disabled={update.isPending}>
            Salvar alterações
          </Button>
          {update.isSuccess && (
            <span className="muted" role="status">
              Alterações salvas.
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

function SubscriptionModal({ account, onClose }: { account: Account; onClose: () => void }) {
  const queryClient = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => request<Account>('POST', '/v1/subscription/cancel'),
    onSuccess: (updated) => {
      queryClient.setQueryData(['me'], updated);
      onClose();
    },
  });

  return (
    <Modal title="Plano semanal" closeButton onClose={onClose}>
      <p className={styles.modalText}>
        Ao cancelar a renovação, não há novas cobranças. As correções já concedidas continuam valendo até o dia 1º.
        {account.subscription?.cardLast4 && ` O plano é cobrado no cartão com final ${account.subscription.cardLast4}.`}
      </p>
      {cancel.error && <ErrorState message={errorMessage(cancel.error)} />}
      <div className={styles.modalActions}>
        <Button variant="ghost" onClick={onClose}>
          Manter o plano
        </Button>
        <Button variant="danger" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
          Cancelar a renovação
        </Button>
      </div>
    </Modal>
  );
}

function PurchasesSection({ account }: { account: Account }) {
  const payments = usePayments();
  const queryClient = useQueryClient();
  const [managing, setManaging] = useState(false);
  const refund = useMutation({
    mutationFn: (paymentId: string) => request<void>('POST', `/v1/payments/${paymentId}/refund-request`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments'] }),
  });
  const { subscription } = account;

  return (
    <section id="creditos" className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={`serif ${styles.h2}`}>Correções e compras</h2>
          <span>
            <strong>{account.credits.total}</strong>{' '}
            <span className="muted">{account.credits.total === 1 ? 'correção disponível' : 'correções disponíveis'}</span>
          </span>
        </div>
        <Button to="/comprar">Comprar correções</Button>
      </div>

      {subscription && subscription.status !== 'cancelled' && (
        <div className={styles.plan}>
          <span>
            <span className={styles.strong}>Plano semanal · {subscription.status === 'active' ? 'ativo' : 'pausado'}</span>
            <span className="muted">
              3 correções por semana. As não usadas vencem no dia 1º de cada mês.
              {subscription.nextBillingAt && ` Próxima cobrança em ${formatDay(subscription.nextBillingAt)}.`}
            </span>
          </span>
          <Button variant="ghost" onClick={() => setManaging(true)}>
            Gerenciar assinatura
          </Button>
        </div>
      )}

      {payments.error ? (
        <ErrorState message={errorMessage(payments.error)} onRetry={() => void payments.refetch()} />
      ) : !payments.data ? (
        <Skeleton height={96} />
      ) : (
        <ul className={styles.purchases} aria-label="Histórico de compras">
          {payments.data.map((payment) => (
            <li key={payment.id}>
              <span className={styles.date}>{formatFullDate(payment.createdAt)}</span>
              <span className={styles.what}>{describe(payment)}</span>
              <span className={`muted ${styles.amount}`}>{formatMoney(payment.amountCents)}</span>
              <span className={styles.links}>
                {payment.refundable && payment.status === 'approved' && (
                  <button type="button" className={styles.linkButton} disabled={refund.isPending} onClick={() => refund.mutate(payment.id)}>
                    Desistir da compra
                  </button>
                )}
                {payment.receiptUrl && <a href={payment.receiptUrl}>Recibo</a>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {refund.error && <ErrorState message={errorMessage(refund.error)} />}
      {refund.isSuccess && (
        <p className="muted" role="status">
          Pedido recebido. O valor das correções não usadas será devolvido.
        </p>
      )}

      {managing && <SubscriptionModal account={account} onClose={() => setManaging(false)} />}
    </section>
  );
}

function NoticesSection({ account }: { account: Account }) {
  const update = useUpdateAccount();

  return (
    <section id="avisos" className={`${styles.card} ${styles.notices}`}>
      <h2 className={`serif ${styles.h2}`}>Avisos por e-mail</h2>
      {notices.map((notice) => (
        <label key={notice.key}>
          <input
            type="checkbox"
            checked={account.emailPreferences[notice.key]}
            disabled={update.isPending}
            onChange={(event) => update.mutate({ emailPreferences: { [notice.key]: event.target.checked } })}
          />
          <span>
            <span className={styles.strong}>{notice.title}</span>
            <span className="muted">{notice.detail}</span>
          </span>
        </label>
      ))}
      {update.error && <ErrorState message={errorMessage(update.error)} />}
    </section>
  );
}

function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const auth = useAuthState();
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState('');
  const remove = useMutation({
    mutationFn: () => request<void>('DELETE', '/v1/me'),
    onSuccess: async () => {
      await auth.signOut();
      navigate('/');
    },
  });

  return (
    <Modal title="Excluir minha conta" closeButton onClose={onClose}>
      <p className={styles.modalText}>
        Apagamos seus dados pessoais e anonimizamos as redações. Correções não usadas são perdidas. Essa ação não pode
        ser desfeita.
      </p>
      <Field
        label='Digite "EXCLUIR" para confirmar'
        type="text"
        autoComplete="off"
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
      />
      {remove.error && <ErrorState message={errorMessage(remove.error)} />}
      <div className={styles.modalActions}>
        <Button variant="ghost" onClick={onClose}>
          Manter a conta
        </Button>
        <Button variant="danger" disabled={confirmation.trim() !== 'EXCLUIR' || remove.isPending} onClick={() => remove.mutate()}>
          Excluir conta
        </Button>
      </div>
    </Modal>
  );
}

function PrivacySection() {
  const [deleting, setDeleting] = useState(false);
  const exportData = useMutation({ mutationFn: () => request<void>('POST', '/v1/me/export') });

  return (
    <section id="privacidade" className={styles.card}>
      <h2 className={`serif ${styles.h2}`}>Privacidade</h2>
      <div className={styles.row}>
        <span>
          <span className={styles.strong}>Baixar meus dados</span>
          <span className="muted">Suas redações, correções e dados de cadastro em um arquivo.</span>
          {exportData.isSuccess && (
            <span role="status">Pedido recebido. Avisamos por e-mail quando o arquivo estiver pronto.</span>
          )}
          {exportData.error && <span role="alert">{errorMessage(exportData.error)}</span>}
        </span>
        <Button variant="ghost" disabled={exportData.isPending || exportData.isSuccess} onClick={() => exportData.mutate()}>
          Solicitar arquivo
        </Button>
      </div>
      <div className={styles.row}>
        <span>
          <span className={styles.strong}>Excluir minha conta</span>
          <span className="muted">
            Apagamos seus dados pessoais e anonimizamos as redações. Correções não usadas são perdidas. Contas sem
            assinatura ativa e sem uso por 3 meses são excluídas automaticamente, com aviso por e-mail 1 semana antes.
          </span>
        </span>
        <Button variant="danger" onClick={() => setDeleting(true)}>
          Excluir conta
        </Button>
      </div>
      {deleting && <DeleteAccountModal onClose={() => setDeleting(false)} />}
    </section>
  );
}

/** 10 · Meu perfil. */
export function ProfilePage() {
  const account = useAccount();
  const auth = useAuthState();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const current = sections.some((section) => `#${section.id}` === hash) ? hash.slice(1) : 'dados';

  return (
    <>
      <Nav />
      <main className={`container ${styles.page}`}>
        <h1 className="serif h1">Meu perfil</h1>
        <div className={styles.layout}>
          <nav className={styles.menu} aria-label="Seções">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className={section.id === current ? styles.menuOn : undefined}>
                {section.label}
              </a>
            ))}
          </nav>
          <div className={styles.content}>
            {account.error ? (
              <ErrorState message={errorMessage(account.error)} onRetry={() => void account.refetch()} />
            ) : !account.data ? (
              <div className={styles.content} aria-busy="true" aria-label="Carregando o seu perfil">
                <Skeleton height={320} radius={18} />
                <Skeleton height={320} radius={18} />
              </div>
            ) : (
              <>
                <DataSection account={account.data} />
                <PurchasesSection account={account.data} />
                <NoticesSection account={account.data} />
                <PrivacySection />
              </>
            )}
            <Button
              variant="ghost"
              className={styles.signOut}
              onClick={() => void auth.signOut().then(() => navigate('/'))}
            >
              Sair
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
