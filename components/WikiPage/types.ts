import type React from 'react';

export type WikiEntry = {
  slug: string;
  label: string;
  navType: 'folder' | 'page';
  title: string;
  subtitle: string;
  bodyTitle: string;
  body: string;
  content?: React.ReactNode;
};
