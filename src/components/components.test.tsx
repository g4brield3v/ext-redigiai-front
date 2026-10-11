import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { exampleLines } from '../features/home/example';
import { renderApp } from '../test/helpers';
import { Button } from './Button';
import { EssaySheet } from './EssaySheet';
import { Nav } from './Nav';
import { ErrorState, Field } from './primitives';

describe('EssaySheet', () => {
  it('mostra cada linha com o número e o texto exatamente como transcrito', () => {
    const { container } = render(<EssaySheet lines={exampleLines} withMargin />);

    expect(screen.getByText('08')).toBeInTheDocument();
    expect(screen.getByText('16')).toBeInTheDocument();
    expect(container.textContent).toContain('À partir desse controle, cabe perguntar');
  });

  it('põe o comentário e o selo do critério na linha da marca', () => {
    render(<EssaySheet lines={exampleLines} withMargin />);

    const marked = screen.getByText('À partir');
    expect(marked).toHaveClass('circle');
    // Margem (telas largas) e logo abaixo da linha (telas estreitas).
    const notes = screen.getAllByText('"A partir", sem crase');
    expect(notes).toHaveLength(2);
    expect(notes[0]).toHaveTextContent('4');
  });

  it('sem margem, não mostra comentários', () => {
    render(<EssaySheet lines={exampleLines} />);

    expect(screen.queryByText('sem dado novo')).not.toBeInTheDocument();
  });

  it('como ilustração, vira uma imagem com descrição', () => {
    render(<EssaySheet lines={exampleLines} label="Linhas 8 a 16 da redação" />);

    expect(screen.getByRole('img', { name: 'Linhas 8 a 16 da redação' })).toBeInTheDocument();
  });
});

describe('Button', () => {
  it('é um botão que não envia formulário por padrão', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Confirmar envio</Button>);

    const button = screen.getByRole('button', { name: 'Confirmar envio' });
    expect(button).toHaveAttribute('type', 'button');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('com destino, é um link', () => {
    renderApp(<Button to="/temas">Ver os temas</Button>);

    expect(screen.getByRole('link', { name: 'Ver os temas' })).toHaveAttribute('href', '/temas');
  });
});

describe('Field', () => {
  it('liga rótulo, dica e erro ao campo', () => {
    render(<Field label="Data de nascimento" hint="A plataforma é para quem tem 16 anos ou mais." error="Informe a data." />);

    const input = screen.getByLabelText('Data de nascimento');
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription('A plataforma é para quem tem 16 anos ou mais. Informe a data.');
  });
});

describe('ErrorState', () => {
  it('só oferece tentar de novo quando há o que repetir', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<ErrorState message="Algo deu errado." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    rerender(<ErrorState message="Algo deu errado." onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe('Nav', () => {
  it('deslogado, na página inicial, mostra as seções, Entrar e Corrigir redação', () => {
    renderApp(<Nav variant="home" />);

    expect(screen.getByRole('link', { name: 'Como é a nota' })).toHaveAttribute('href', '/#nota');
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar');
    expect(screen.getByRole('link', { name: 'Corrigir redação' })).toHaveAttribute('href', '/temas');
  });

  it('marca a página atual', () => {
    renderApp(<Nav />, { route: '/temas' });

    expect(screen.getByRole('link', { name: 'Temas' })).toHaveAttribute('aria-current', 'page');
  });

  it('logado, mostra a inicial e Sair', async () => {
    const signOut = vi.fn(async () => {});
    renderApp(<Nav />, { auth: { enabled: true, isLoaded: true, isSignedIn: true, initial: 'A', signOut } });

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(signOut).toHaveBeenCalledOnce();
  });
});
