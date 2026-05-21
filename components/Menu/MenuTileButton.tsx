import type { ButtonHTMLAttributes } from 'react';
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import classNames from 'classnames';
import styles from './styles.module.css';

type MenuTileButtonProps = {
  icon: LucideIcon;
  label: string;
  iconSize?: number;
  variant: 'menu' | 'popup';
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function MenuTileButton({
  icon: Icon,
  label,
  iconSize = 20,
  variant,
  className,
  ...props
}: MenuTileButtonProps) {
  return (
    <button
      type='button'
      className={classNames(
        styles.tileButton,
        className
      )}
      {...props}
    >
      <Icon className={styles.tileIcon} size={iconSize} aria-hidden />
      <span className={styles.tileLabel}>{label}</span>
    </button>
  );
}
