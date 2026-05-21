import React from 'react';
import type { WikiEntry } from './types';
import { AliasesGuide } from './pages/AliasesGuide';
import { ScriptsGuide } from './pages/ScriptsGuide';
import { TriggersGuide } from './pages/TriggersGuide';
import { VariablesGuide } from './pages/VariablesGuide';

export const wikiEntries: WikiEntry[] = [
  {
    slug: 'getting-started',
    label: 'Getting Started',
    navType: 'page',
    title: 'Getting Started',
    subtitle:
      'Learn how to write aliases, triggers, and variables for Swiss Mud Client.',
    bodyTitle: 'Swiss Mud Client Wiki',
    body:
      'This wiki will collect practical examples and reference notes for automating your MUD workflow. We will build it one topic at a time.',
  },
  {
    slug: 'aliases',
    label: 'Aliases',
    navType: 'folder',
    title: 'Aliases',
    subtitle: 'Create shortcuts that expand typed input into MUD commands.',
    bodyTitle: 'Writing Aliases',
    body: 'Alias documentation will be added here.',
    content: <AliasesGuide />,
  },
  {
    slug: 'triggers',
    label: 'Triggers',
    navType: 'folder',
    title: 'Triggers',
    subtitle: 'React to incoming game text with automated commands.',
    bodyTitle: 'Writing Triggers',
    body: 'Trigger documentation will be added here.',
    content: <TriggersGuide />,
  },
  {
    slug: 'variables',
    label: 'Variables',
    navType: 'folder',
    title: 'Variables',
    subtitle: 'Save reusable values for aliases, triggers, and scripts.',
    bodyTitle: 'Using Variables',
    body: 'Variable documentation will be added here.',
    content: <VariablesGuide />,
  },
  {
    slug: 'scripts',
    label: 'Scripts',
    navType: 'folder',
    title: 'Scripts',
    subtitle: 'Use event-based JavaScript snippets for advanced flows.',
    bodyTitle: 'Scripts',
    body: 'Script documentation will be added here.',
    content: <ScriptsGuide />,
  },
  {
    slug: 'command-helpers',
    label: 'Command Helpers',
    navType: 'page',
    title: 'Command Helpers',
    subtitle: 'Reference helper functions available to aliases and triggers.',
    bodyTitle: 'Command Helpers',
    body: 'Command helper documentation will be added here.',
  },
  {
    slug: 'examples',
    label: 'Examples',
    navType: 'page',
    title: 'Examples',
    subtitle: 'Copyable recipes for common MUD client automation.',
    bodyTitle: 'Examples',
    body: 'Example recipes will be added here.',
  },
];

export const guideLinks = wikiEntries.filter(entry =>
  ['aliases', 'triggers', 'variables'].includes(entry.slug)
);

export const additionalLinks = wikiEntries.filter(entry =>
  ['scripts', 'command-helpers', 'examples'].includes(entry.slug)
);

export function getActiveEntry(path: string): WikiEntry {
  const slug = path.replace(/^\/wiki\/?/, '') || 'getting-started';
  return wikiEntries.find(entry => entry.slug === slug) ?? wikiEntries[0];
}

export function wikiPath(slug: string): string {
  return slug === 'getting-started' ? '/wiki' : `/wiki/${slug}`;
}
