// config/EditorOptions.ts
// Options for the Monaco Editor.

import { editor } from 'monaco-editor';

const EditorOptions: editor.IStandaloneEditorConstructionOptions = {
  theme: 'vs-dark',
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbers: 'off',
  wordWrap: 'on',
  lineHeight: 20,
  automaticLayout: true,
  scrollBeyondLastLine: false,
  inlayHints: { enabled: 'off' },
  lineDecorationsWidth: 0,
  ariaLabel: 'Code editor',
};

export function editorOptionsWithLabel(
  label: string
): editor.IStandaloneEditorConstructionOptions {
  return { ...EditorOptions, ariaLabel: label };
}
