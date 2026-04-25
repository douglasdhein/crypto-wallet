import type { ButtonHTMLAttributes } from 'react';
import styles from './style.module.css';

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'secondary';
type ButtonSize = 'default' | 'sm' | 'icon';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: ButtonSize;
  variant?: ButtonVariant;
};

type ButtonVariantOptions = {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const sizeClassNames: Record<ButtonSize, string> = {
  default: styles.defaultSize,
  icon: styles.iconSize,
  sm: styles.smSize,
};

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

export function buttonVariants({
  className,
  size = 'default',
  variant = 'default',
}: ButtonVariantOptions = {}) {
  return joinClassNames(
    styles.button,
    styles[variant],
    sizeClassNames[size],
    className,
  );
}

export function Button({
  className,
  size,
  variant,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonVariants({ className, size, variant })}
      data-slot="button"
      {...props}
    />
  );
}
