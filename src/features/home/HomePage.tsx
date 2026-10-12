import { Link } from 'react-router-dom';
import { Button } from '../../components/Button';
import { EssaySheet } from '../../components/EssaySheet';
import { Footer } from '../../components/Footer';
import { Nav } from '../../components/Nav';
import { Dots } from '../../components/primitives';
import { exampleCriteria, exampleLines, exampleMaxLevel, exampleMaxScore, exampleScore, exampleTitle, faq } from './example';
import styles from './HomePage.module.css';
import { ScoreSection } from './ScoreSection';

function Check({ size = 18, color = '#2346C9' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={size === 18 ? 2.6 : 2.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function Hero() {
  return (
    <section className={`container ${styles.hero}`}>
      <div className={styles.heroText}>
        <span className="eyebrow">Correção de redação para vestibular</span>
        <h1 className={`serif ${styles.h1}`}>
          Uma correção que mostra <em>onde</em> e <em>como</em> melhorar.
        </h1>
        <p className={`muted ${styles.lead}`}>
          Escolha o vestibular, um dos nossos temas e o tipo de redação. Escreva à mão, envie a foto da folha e receba a
          nota de cada critério, com as linhas que pesaram e o que corrigir.
        </p>
        <div className={styles.heroActions}>
          <Button to="/temas" size="lg">
            Ver os temas
          </Button>
          <Button to="/#nota" size="lg" variant="ghost">
            Como a nota é calculada
          </Button>
        </div>
        <p className={`muted ${styles.small}`}>Você só cria conta na hora de enviar.</p>
      </div>

      <figure className={styles.window} aria-label="Exemplo de redação corrigida">
        <div className={styles.windowHeader}>
          <span className={styles.windowTitle}>{exampleTitle}</span>
          <span className={styles.corrected}>
            <span />
            Corrigida
          </span>
        </div>
        <EssaySheet lines={exampleLines} withMargin compact label="Linhas 8 a 16 da redação com marcações do corretor" />
        <div className={styles.criteriaRow}>
          {exampleCriteria.map((criterion) => (
            <div key={criterion.position} className={criterion.lostPoints ? styles.lost : undefined}>
              <span className={criterion.lostPoints ? styles.lostLabel : 'muted'}>
                {criterion.position} · {criterion.shortName}
              </span>
              <Dots level={criterion.level} max={exampleMaxLevel} />
              <span className={styles.strong}>
                {criterion.points} / {criterion.maxPoints}
              </span>
            </div>
          ))}
        </div>
        <figcaption className={styles.caption}>
          <span>
            <strong>O que corrigir primeiro:</strong> substitua o parágrafo das linhas 11 a 13 por um argumento novo,
            apoiado em um dado da coletânea.
          </span>
          <span className={styles.captionScore}>
            <span className="serif">{exampleScore}</span>
            <span className="muted"> / {exampleMaxScore}</span>
          </span>
        </figcaption>
      </figure>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="como" className={styles.band}>
      <div className={`container ${styles.stack48}`}>
        <div className={`${styles.heading} ${styles.headingNarrow}`}>
          <span className="eyebrow">Como funciona</span>
          <h2 className={`serif ${styles.h2}`}>Quatro escolhas e a sua redação está na fila de correção.</h2>
        </div>
        <div className={styles.four}>
          <article className={styles.step}>
            <div className={styles.mock} aria-hidden="true">
              <div className={`${styles.option} ${styles.optionOn}`}>
                <span>Fuvest</span>
                <span className={styles.radio} />
              </div>
              <div className={styles.option}>
                <span>Unicamp</span>
                <span className={styles.soon}>em breve</span>
              </div>
              <div className={styles.option}>
                <span>Enem</span>
                <span className={styles.soon}>em breve</span>
              </div>
            </div>
            <div className={styles.stepTitle}>
              <span className={styles.stepNumber}>1</span>
              <h3 className={styles.h3}>Escolha o vestibular</h3>
            </div>
            <p className="muted">Cada vestibular tem sua própria grade de correção, critérios e pesos.</p>
          </article>

          <article className={styles.step}>
            <div className={styles.mock} aria-hidden="true">
              <span className={`muted ${styles.mockLabel}`}>TEMAS DA FUVEST</span>
              <div className={`${styles.option} ${styles.optionOn}`}>
                <span>Algoritmos e o debate público</span>
                <span className={styles.radio} />
              </div>
              <div className={styles.option}>
                <span>[Tema]</span>
                <span className={styles.radio} />
              </div>
              <div className={styles.option}>
                <span>[Tema]</span>
                <span className={styles.radio} />
              </div>
            </div>
            <div className={styles.stepTitle}>
              <span className={styles.stepNumber}>2</span>
              <h3 className={styles.h3}>Escolha o tema</h3>
            </div>
            <p className="muted">Leia o enunciado e a coletânea do tema antes de escrever.</p>
          </article>

          <article className={styles.step}>
            <div className={styles.mock} aria-hidden="true">
              <span className={`muted ${styles.mockLabel}`}>TIPO DE REDAÇÃO</span>
              <div className={`${styles.option} ${styles.optionOn} ${styles.optionColumn}`}>
                <span>Dissertação</span>
                <span className={`muted ${styles.optionDetail}`}>Dissertativo-argumentativo</span>
              </div>
              <div className={`${styles.option} ${styles.optionColumn}`}>
                <span>Narrativa</span>
                <span className={`muted ${styles.optionDetail}`}>Narrativo com reflexão</span>
              </div>
            </div>
            <div className={styles.stepTitle}>
              <span className={styles.stepNumber}>3</span>
              <h3 className={styles.h3}>Escolha o tipo</h3>
            </div>
            <p className="muted">Mostramos só os tipos que o tema aceita. A correção avalia o gênero escolhido.</p>
          </article>

          <article className={styles.step}>
            <div className={styles.mock} aria-hidden="true">
              <span className={`muted ${styles.mockLabel}`}>FOTO DA FOLHA</span>
              <div className={styles.dropzone}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2346C9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
                <span>Tire a foto ou arraste o arquivo</span>
              </div>
            </div>
            <div className={styles.stepTitle}>
              <span className={styles.stepNumber}>4</span>
              <h3 className={styles.h3}>Envie a redação</h3>
            </div>
            <p className="muted">
              Fotografe a folha escrita à mão e confirme o envio. Se uma palavra ficar ilegível, pedimos só aquela
              palavra.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

function CorrectionSection() {
  return (
    <section id="carta" className={styles.section}>
      <div className={`container ${styles.split}`}>
        <div className={styles.stack22}>
          <span className="eyebrow">A correção</span>
          <h2 className={`serif ${styles.h2}`}>No seu texto, linha por linha, como um bom professor corrigiria.</h2>
          <p className={`muted ${styles.lead18}`}>
            Cada marca na redação leva ao critério que ela afeta. Você vê o que funcionou, o que tirou pontos e o que
            corrigir primeiro.
          </p>
          <ul className={styles.ticks}>
            <li>
              <Check />
              <span>
                <strong>Nível de 1 a {exampleMaxLevel} em cada critério</strong>, com o descritor oficial e a justificativa.
              </span>
            </li>
            <li>
              <Check />
              <span>
                <strong>Orientação direta do que corrigir</strong>, apontando as linhas.
              </span>
            </li>
            <li>
              <Check />
              <span>
                <strong>Erros de escrita agrupados pela regra</strong>, para você aprender a regra e não só a palavra.
              </span>
            </li>
          </ul>
          <Link className={styles.more} to="/exemplo">
            Abrir uma correção completa →
          </Link>
        </div>

        <div className={`${styles.window} ${styles.criterionCard}`}>
          <span className={`muted ${styles.small13}`}>{exampleTitle}</span>
          <div className={styles.criterionHeader}>
            <span className={styles.criterionName}>
              <span className={styles.criterionBadge}>3</span>
              <span className={styles.h3}>Coesão, coerência e progressão</span>
            </span>
            <span className={styles.strong}>
              6 <span className={`muted ${styles.regular}`}>/ 12</span>
            </span>
          </div>
          <div className={styles.criterionLevel}>
            <Dots level={2} max={exampleMaxLevel} />
            <span className={`muted ${styles.small}`}>Nível 2 de {exampleMaxLevel} · peso 3</span>
          </div>
          <p className={`muted ${styles.descriptor}`}>“Satisfatória articulação formal e de sentido, com poucos recursos linguísticos (coesão e coerência) e algumas falhas na composição textual.”</p>
          <p>
            Os conectivos funcionam, mas o parágrafo das linhas 11 a 13 repete a ideia das linhas 8 a 10: os dois dizem
            que os algoritmos escolhem o conteúdo pelo engajamento.
          </p>
          <div className={styles.guidance}>
            <span>Para chegar ao nível 3</span>
            <span>
              Troque o parágrafo das linhas 11 a 13 por uma consequência que ainda não apareceu, como o efeito dessa
              seleção sobre o voto, sustentada pelo dado do texto 2 da coletânea.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="precos" className={styles.section}>
      <div className={`container ${styles.stack48}`}>
        <div className={`${styles.heading} ${styles.centered}`}>
          <span className="eyebrow">Preços</span>
          <h2 className={`serif ${styles.h2}`}>Comece com uma correção grátis.</h2>
          <p className={`muted ${styles.lead18}`}>
            O plano é cobrado no cartão de crédito. Correções avulsas aceitam Pix ou cartão. Se a correção falhar, o
            crédito volta para a sua conta.
          </p>
        </div>
        <div className={styles.prices}>
          <article className={styles.plan}>
            <div className={styles.planHeader}>
              <h3 className={styles.h3}>Teste grátis</h3>
              <span className="muted">Para conhecer a correção.</span>
            </div>
            <span className={`serif ${styles.price}`}>R$ 0</span>
            <span className={`muted ${styles.small}`}>1 correção, uma vez por conta</span>
            <ul className={styles.ticks}>
              <li>
                <Check size={16} />
                Correção completa nos 4 critérios
              </li>
              <li>
                <Check size={16} />
                Redação marcada linha a linha
              </li>
            </ul>
            <Button to="/temas" size="lg" variant="ghost" className={styles.planAction}>
              Fazer o teste
            </Button>
          </article>

          <article className={`${styles.plan} ${styles.featured}`}>
            <span className={styles.ribbon}>Para quem treina toda semana</span>
            <div className={styles.planHeader}>
              <h3 className={styles.h3}>Plano semanal</h3>
              <span>Escreva, corrija e reescreva com frequência.</span>
            </div>
            <span>
              <span className={`serif ${styles.price}`}>R$ 39,90</span>
              <span className={styles.featuredSoft}> /mês</span>
            </span>
            <span className={`${styles.small} ${styles.featuredSoft}`}>3 correções por semana · cartão de crédito</span>
            <ul className={styles.ticks}>
              <li>
                <Check size={16} color="#FFFFFF" />
                Evolução da nota entre versões
              </li>
              <li>
                <Check size={16} color="#FFFFFF" />
                Envio de várias redações de uma vez
              </li>
              <li>
                <Check size={16} color="#FFFFFF" />
                Correções não usadas acumulam até o fim do mês
              </li>
              <li>
                <Check size={16} color="#FFFFFF" />
                Reescritas contam como correção
              </li>
            </ul>
            <Button to="/temas" size="lg" variant="inverse" className={styles.planAction}>
              Assinar o plano semanal
            </Button>
          </article>

          <article className={styles.plan}>
            <div className={styles.planHeader}>
              <h3 className={styles.h3}>Correção avulsa</h3>
              <span className="muted">Para corrigir além do plano.</span>
            </div>
            <span className={`serif ${styles.price}`}>R$ 16</span>
            <span className={`muted ${styles.small}`}>por correção · Pix ou cartão</span>
            <ul className={styles.ticks}>
              <li>
                <Check size={16} />
                Mesma correção do plano
              </li>
              <li>
                <Check size={16} />
                Compre só quando precisar
              </li>
            </ul>
            <Button to="/temas" size="lg" variant="ghost" className={styles.planAction}>
              Comprar avulsa
            </Button>
          </article>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="duvidas" className={`${styles.band} ${styles.faqBand}`}>
      <div className={`container ${styles.split} ${styles.faqSplit}`}>
        <div className={styles.heading}>
          <span className="eyebrow">Dúvidas</span>
          <h2 className={`serif ${styles.h2}`}>Perguntas frequentes</h2>
        </div>
        <div className={styles.questions}>
          {faq.map((item, index) => (
            <details key={item.question} className={styles.question} open={index === 0}>
              <summary>
                {item.question}
                <span className={styles.plus} aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCall() {
  return (
    <section className={styles.finalBand}>
      <div className="container">
        <div className={styles.final}>
          <h2 className={`serif ${styles.h2}`}>Escolha um tema e escreva a sua próxima redação.</h2>
          <p>Cada tema traz o enunciado e a coletânea de textos, no formato da prova.</p>
          <Button to="/temas" size="lg" variant="inverse">
            Ver os temas
          </Button>
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  return (
    <>
      <Nav variant="home" />
      <main>
        <Hero />
        <HowItWorks />
        <CorrectionSection />
        <ScoreSection />
        <Pricing />
        <Faq />
        <FinalCall />
      </main>
      <Footer />
    </>
  );
}
