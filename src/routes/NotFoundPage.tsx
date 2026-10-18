import { Button } from '../components/Button';
import { Nav } from '../components/Nav';

/** Endereço que não existe. A área de administração mostra esta mesma página para quem não é administrador. */
export function NotFoundPage() {
  return (
    <>
      <Nav />
      <main className="container" style={{ paddingTop: 72, paddingBottom: 96, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-start' }}>
        <h1 className="serif h1">Não encontramos essa página.</h1>
        <Button to="/propostas">Ver as propostas</Button>
      </main>
    </>
  );
}
