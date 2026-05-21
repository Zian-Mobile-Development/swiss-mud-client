import type { LucideIcon } from 'lucide-react';
import {
  Database,
  PenLine,
  Plug,
  ScrollText,
  Settings,
  Variable,
  Zap,
} from 'lucide-react';

export type MenuItemId =
  | 'connect'
  | 'triggers'
  | 'alias'
  | 'scripts'
  | 'variables'
  | 'data'
  | 'settings';

export type MenuItem = {
  id: MenuItemId;
  label: string;
  icon: LucideIcon;
};

export const MENU_ITEMS: MenuItem[] = [
  { id: 'connect', label: 'Connect', icon: Plug },
  { id: 'triggers', label: 'Triggers', icon: Zap },
  { id: 'alias', label: 'Alias', icon: PenLine },
  { id: 'scripts', label: 'Scripts', icon: ScrollText },
  { id: 'variables', label: 'Variables', icon: Variable },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'settings', label: 'Settings', icon: Settings },
];
