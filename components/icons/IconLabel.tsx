import React, { type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import classNames from 'classnames';
import commonStyles from '../../styles/common.module.css';

type IconLabelProps = {
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
  size?: number;
};

export function IconLabel({
  icon: Icon,
  children,
  className,
  size = 16,
}: IconLabelProps) {
  return (
    <span className={classNames(commonStyles.iconLabel, className)}>
      <Icon size={size} className={commonStyles.icon} aria-hidden />
      <span>{children}</span>
    </span>
  );
}
