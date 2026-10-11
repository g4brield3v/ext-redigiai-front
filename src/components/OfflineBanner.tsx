import { useSyncExternalStore } from 'react';
import styles from './OfflineBanner.module.css';

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/** Aviso discreto no topo enquanto o navegador estiver sem conexão. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) {
    return null;
  }

  return (
    <div className={styles.banner} role="status">
      Você está sem conexão. As informações podem estar desatualizadas.
    </div>
  );
}
