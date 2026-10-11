import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './Button.module.css';

type Variant = 'primary' | 'ghost' | 'inverse' | 'danger';
type Size = 'xs' | 'sm' | 'md' | 'lg';

type Common = {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  className?: string;
  children: ReactNode;
};

type ButtonProps = Common & ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined };
type LinkProps = Common & { to: string };

function classes({ variant = 'primary', size = 'md', block, className }: Common) {
  return [styles.button, styles[variant], styles[size], block && styles.block, className].filter(Boolean).join(' ');
}

/** Botão em pílula. Com `to`, vira link: rota interna ou âncora (`/#nota`). */
export function Button(props: ButtonProps | LinkProps) {
  if (props.to !== undefined) {
    return (
      <Link className={classes(props)} to={props.to}>
        {props.children}
      </Link>
    );
  }

  const { variant, size, block, className, children, type = 'button', ...rest } = props;
  return (
    <button className={classes({ variant, size, block, className, children })} type={type} {...rest}>
      {children}
    </button>
  );
}
