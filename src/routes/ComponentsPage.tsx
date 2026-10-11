import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../components/Button';
import { CriterionCard, ScoreSummary } from '../components/CriterionCard';
import { EssaySheet } from '../components/EssaySheet';
import { Footer } from '../components/Footer';
import { LogoMark } from '../components/Logo';
import { Nav } from '../components/Nav';
import { Card, Chip, Dots, ErrorState, Field, Modal, Notice, SheetThumb, Skeleton, StepBar, Window } from '../components/primitives';
import { toSheetLines } from '../features/correcao/sheet';
import { exampleCorrection as correction, exampleIllegibleWords as illegibleWords } from '../features/correcao/example';

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2 className="h3">{title}</h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
    </section>
  );
}

/** Mostruário dos componentes do design system. Só existe em desenvolvimento (/_componentes). */
export default function ComponentsPage() {
  const [modal, setModal] = useState(false);

  return (
    <>
      <Nav />
      <main className="container" style={{ paddingTop: 44, paddingBottom: 96, display: 'flex', flexDirection: 'column', gap: 40 }}>
        <h1 className="serif h1">Componentes</h1>

        <Block title="Logo">
          <LogoMark />
          <LogoMark size={48} />
        </Block>

        <Block title="Button">
          <Button>Principal</Button>
          <Button variant="ghost">Secundário</Button>
          <Button variant="danger">Excluir conta</Button>
          <Button disabled>Desabilitado</Button>
          <Button size="lg">Grande</Button>
          <Button size="sm">Navegação</Button>
          <Button size="xs">Tabela</Button>
          <span style={{ background: '#2346C9', padding: 12, borderRadius: 16 }}>
            <Button variant="inverse">Sobre azul</Button>
          </span>
        </Block>

        <Block title="Chip">
          <Chip tone="ok">Corrigida</Chip>
          <Chip tone="review">Precisa de você</Chip>
          <Chip tone="running">Em correção</Chip>
          <Chip tone="queued">Na fila</Chip>
          <Chip tone="error">Não corrigida · crédito devolvido</Chip>
          <Chip>Dissertação</Chip>
        </Block>

        <Block title="StepBar">
          <StepBar current={2} />
        </Block>

        <Block title="Field">
          <Field label="Seu e-mail" type="email" placeholder="voce@email.com" />
          <Field label="Data de nascimento" placeholder="dd/mm/aaaa" hint="A plataforma é para quem tem 16 anos ou mais." />
          <Field label="Com erro" defaultValue="31/02" error="Informe a data no formato dd/mm/aaaa." />
        </Block>

        <Block title="Card, Window, Notice, miniatura, níveis">
          <Card style={{ padding: 24 }}>Cartão</Card>
          <Window style={{ padding: 24 }}>Janela</Window>
          <Notice>Depois de confirmar, não é possível trocar a foto nem cancelar o envio.</Notice>
          <SheetThumb />
          <SheetThumb size="sm" />
          <Dots level={1} />
          <Dots level={2} />
          <Dots level={3} />
        </Block>

        <Block title="Estados">
          <Skeleton width={220} height={24} />
          <ErrorState message="Algo deu errado do nosso lado. Tente novamente em instantes." onRetry={() => {}} />
        </Block>

        <Block title="Modal">
          <Button variant="ghost" onClick={() => setModal(true)}>
            Abrir modal
          </Button>
          {modal && (
            <Modal title="Confirme o envio" subtitle="Fuvest – Dissertação – Algoritmos e o debate público" closeButton onClose={() => setModal(false)}>
              <Notice>Conteúdo do diálogo.</Notice>
            </Modal>
          )}
        </Block>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 className="h3">ScoreSummary</h2>
          <ScoreSummary score={23} maxScore={30} delta="+2 desde a 1ª versão" strengths={correction.strengths} mainIssue={correction.mainIssue} />
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 className="h3">EssaySheet (correção)</h2>
            <Window>
              <EssaySheet lines={toSheetLines(correction.lines, { marks: correction.marks })} withMargin />
            </Window>
            <h2 className="h3">EssaySheet (palavras ilegíveis)</h2>
            <Window>
              <EssaySheet lines={toSheetLines(correction.lines.slice(0, 7), { illegible: illegibleWords })} />
            </Window>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 className="h3">CriterionCard</h2>
            {correction.criteria.map((criterion) => (
              <CriterionCard key={criterion.position} criterion={criterion} flagged={criterion.position >= 3} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
