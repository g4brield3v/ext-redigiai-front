import { Link } from 'react-router-dom';
import styles from './Logo.module.css';

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <rect width="30" height="30" rx="8" fill="#2346C9" />
      <path d="M8 11h14M8 15.5h14M8 20h8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <path d="M18.5 21.5c1.6-1.2 3.2-3 4.2-5" stroke="#FFB4A8" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link className={styles.logo} to="/">
      <LogoMark />
      RedigiAI
    </Link>
  );
}
