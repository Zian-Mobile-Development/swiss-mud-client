// components/ScriptView/index.tsx
// View for the scripts.

import React, { useCallback, useState, useEffect } from 'react';
import type { Script } from '../../types';
import commonStyles from '../../styles/common.module.css';
import Editor from '@monaco-editor/react';
import { editorOptionsWithLabel } from '../../config/EditorOptions';

interface ScriptViewProps {
  scripts: Script[];
  onChange: (scripts: Script[]) => void;
  saveRef?: React.RefObject<{ save: () => void } | null>;
}

const emptyScript: Script = { name: '', event: '', command: '', enabled: true };

const ScriptView: React.FC<ScriptViewProps> = ({
  scripts,
  onChange,
  saveRef,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(
    scripts.length > 0 ? 0 : null
  );
  const [editBuffer, setEditBuffer] = useState<Script | null>(null);
  const [localScripts, setLocalScripts] = useState<Script[]>(scripts);

  // Helper function to save scripts
  const saveScripts = useCallback((updated: Script[]) => {
    setLocalScripts(updated);
    onChange(updated);
  }, [onChange]);

  useEffect(() => {
    setLocalScripts(scripts);
  }, [scripts]);

  // When selectedIdx changes, update editBuffer
  useEffect(() => {
    if (selectedIdx !== null && localScripts[selectedIdx]) {
      setEditBuffer({ ...localScripts[selectedIdx] });
    } else {
      setEditBuffer(null);
    }
  }, [selectedIdx, localScripts]);

  // Add new script and select it
  const handleAdd = () => {
    const newScripts = [{ ...emptyScript }, ...localScripts];
    setLocalScripts(newScripts);
    setEditBuffer({ ...emptyScript });
    setSelectedIdx(0);
  };

  // Update edit buffer inline
  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!editBuffer) return;
    const { name, value } = e.target;
    setEditBuffer({ ...editBuffer, [name]: value });
  };

  // Save changes to selected script
  const handleSave = useCallback(() => {
    if (selectedIdx === null || !editBuffer) return;
    const updated = localScripts.map((script, idx) =>
      idx === selectedIdx ? { ...editBuffer } : script
    );
    saveScripts(updated);
  }, [editBuffer, localScripts, saveScripts, selectedIdx]);

  // Expose save method to parent via ref
  useEffect(() => {
    if (saveRef) {
      saveRef.current = { save: handleSave };
    }
  }, [handleSave, saveRef]);

  // Delete selected script
  const handleDelete = () => {
    if (selectedIdx === null) return;
    if (!window.confirm('Delete this script?')) return;
    const newScripts = localScripts.filter((_, idx) => idx !== selectedIdx);
    saveScripts(newScripts);
    setSelectedIdx(newScripts.length > 0 ? 0 : null);
  };

  // Select script
  const handleSelect = (idx: number) => {
    setSelectedIdx(idx);
  };

  // Check if there are unsaved changes
  const hasUnsaved =
    selectedIdx !== null &&
    editBuffer &&
    JSON.stringify(editBuffer) !== JSON.stringify(localScripts[selectedIdx]);

  const selected = editBuffer;

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, idx: number) => {
    e.dataTransfer.setData('text/plain', idx.toString());
    e.currentTarget.classList.add(commonStyles.dragging);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLLIElement>) => {
    e.currentTarget.classList.remove(commonStyles.dragging);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add(commonStyles.dragOver);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLIElement>) => {
    e.currentTarget.classList.remove(commonStyles.dragOver);
  };

  const handleDrop = (e: React.DragEvent<HTMLLIElement>, targetIdx: number) => {
    e.preventDefault();
    e.currentTarget.classList.remove(commonStyles.dragOver);

    const sourceIdx = parseInt(e.dataTransfer.getData('text/plain'));
    if (sourceIdx === targetIdx) return;

    const updated = [...localScripts];
    const [movedItem] = updated.splice(sourceIdx, 1);
    updated.splice(targetIdx, 0, movedItem);

    saveScripts(updated);
    setSelectedIdx(targetIdx);
  };

  return (
    <div className={commonStyles.viewContainer}>
      <div className={commonStyles.sidebar}>
        <button type='button' onClick={handleAdd} aria-label='Add script'>
          +
        </button>
        <ul role='list' aria-label='Scripts'>
          {localScripts.map((script, index) => (
            <li
              key={index}
              draggable
              onDragStart={e => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onDragLeave={handleDragLeave}
            >
              <button
                type='button'
                className={commonStyles.listRowButton}
                onClick={() => handleSelect(index)}
                aria-current={selectedIdx === index ? 'true' : undefined}
              >
                <span className={commonStyles.itemContent}>
                  <span className={commonStyles.dragHandle} aria-hidden='true'>
                    ⋮
                  </span>
                  <input
                    type='checkbox'
                    checked={script.enabled}
                    aria-label={`Enable script ${script.name || 'unnamed'}`}
                    onChange={e => {
                    e.stopPropagation();
                    const updated = localScripts.map((s, i) =>
                      i === index ? { ...s, enabled: e.target.checked } : s
                    );
                    saveScripts(updated);
                  }}
                  onClick={e => e.stopPropagation()}
                />
                  <span>{script.name}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {selected && (
        <div className={commonStyles.detailsPanel}>
          <label>
            Name
            <input
              type='text'
              name='name'
              value={selected.name}
              onChange={handleFieldChange}
            />
          </label>
          <label>
            Event
            <input
              type='text'
              name='event'
              value={selected.event}
              onChange={handleFieldChange}
            />
          </label>
          <label>
            Command
            <div className={commonStyles.editorContainer}>
              <Editor
                defaultLanguage='javascript'
                value={selected.command}
                onChange={value => {
                  if (editBuffer) {
                    setEditBuffer({ ...editBuffer, command: value || '' });
                  }
                }}
                theme={editorOptionsWithLabel('Script command editor').theme}
                options={editorOptionsWithLabel('Script command editor')}
              />
            </div>
          </label>
          <div className={commonStyles.actions}>
            <button
              onClick={handleSave}
              disabled={!hasUnsaved}
              style={{ background: hasUnsaved ? '#1976d2' : '#aaa' }}
            >
              Save
            </button>
            <button onClick={handleDelete} style={{ background: '#c62828' }}>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScriptView;
