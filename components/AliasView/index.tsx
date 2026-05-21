// components/AliasView/index.tsx
// View for the aliases.

import React, { useCallback, useState, useEffect } from 'react';
import type { Alias } from '../../types';
import commonStyles from '../../styles/common.module.css';
import Editor from '@monaco-editor/react';
import { editorOptionsWithLabel } from '../../config/EditorOptions';
import { IconLabel } from '../icons/IconLabel';
import { GripVertical, Plus, Save, Trash2 } from 'lucide-react';

interface AliasViewProps {
  aliases: Alias[];
  onChange: (aliases: Alias[]) => void;
  saveRef?: React.RefObject<{ save: () => void } | null>;
}

const emptyAlias: Alias = { name: '', pattern: '', command: '', enabled: true };

const AliasView: React.FC<AliasViewProps> = ({
  aliases,
  onChange,
  saveRef,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(
    aliases.length > 0 ? 0 : null
  );
  const [editBuffer, setEditBuffer] = useState<Alias | null>(null);

  // Helper function to save aliases
  const saveAliases = useCallback((updated: Alias[]) => {
    onChange(updated);
  }, [onChange]);

  // When selectedIdx changes, update editBuffer
  useEffect(() => {
    if (selectedIdx !== null && aliases[selectedIdx]) {
      setEditBuffer({ ...aliases[selectedIdx] });
    } else {
      setEditBuffer(null);
    }
  }, [selectedIdx, aliases]);

  // Add new alias and select it
  const handleAdd = () => {
    const newAliases = [{ ...emptyAlias }, ...aliases];
    saveAliases(newAliases);
    setEditBuffer({ ...emptyAlias });
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

  // Save changes to selected alias
  const handleSave = useCallback(() => {
    if (selectedIdx === null || !editBuffer) return;
    const updated = aliases.map((alias, idx) =>
      idx === selectedIdx ? { ...editBuffer } : alias
    );
    saveAliases(updated);
  }, [aliases, editBuffer, saveAliases, selectedIdx]);

  // Expose save method to parent via ref
  useEffect(() => {
    if (saveRef) {
      saveRef.current = { save: handleSave };
    }
  }, [handleSave, saveRef]);

  // Delete selected alias
  const handleDelete = () => {
    if (selectedIdx === null) return;
    if (!window.confirm('Delete this alias?')) return;
    const newAliases = aliases.filter((_, idx) => idx !== selectedIdx);
    saveAliases(newAliases);
    setSelectedIdx(newAliases.length > 0 ? 0 : null);
  };

  // Select alias
  const handleSelect = (idx: number) => {
    setSelectedIdx(idx);
  };

  // Check if there are unsaved changes
  const hasUnsaved =
    selectedIdx !== null &&
    editBuffer &&
    JSON.stringify(editBuffer) !== JSON.stringify(aliases[selectedIdx]);

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

    const updated = [...aliases];
    const [movedItem] = updated.splice(sourceIdx, 1);
    updated.splice(targetIdx, 0, movedItem);

    saveAliases(updated);
    setSelectedIdx(targetIdx);
  };

  return (
    <div className={commonStyles.viewContainer}>
      <div className={commonStyles.sidebar}>
        <button
          type='button'
          className={commonStyles.sidebarToolbarButton}
          onClick={handleAdd}
          aria-label='Add alias'
        >
          <Plus size={20} aria-hidden />
        </button>
        <div className={commonStyles.sidebarList}>
          <ul role='list' aria-label='Aliases'>
          {aliases.map((alias, index) => (
            <li
              key={index}
              draggable
              onDragStart={e => handleDragStart(e, index)}
              onDragOver={e => handleDragOver(e)}
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
                  <GripVertical
                    size={14}
                    className={commonStyles.dragHandle}
                    aria-hidden
                  />
                  <input
                    type='checkbox'
                    checked={alias.enabled}
                    aria-label={`Enable alias ${alias.name || 'unnamed'}`}
                    onChange={e => {
                    e.stopPropagation();
                    const updated = aliases.map((a, i) =>
                      i === index ? { ...a, enabled: e.target.checked } : a
                    );
                    saveAliases(updated);
                  }}
                  onClick={e => e.stopPropagation()}
                />
                  <span>{alias.name}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        </div>
      </div>
      {selected && (
        <div className={commonStyles.detailsPanel}>
          <label>
            Name
            <input
              type='text'
              value={selected.name}
              onChange={handleFieldChange}
              name='name'
            />
          </label>
          <label>
            Pattern
            <input
              type='text'
              value={selected.pattern}
              onChange={handleFieldChange}
              name='pattern'
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
                theme={editorOptionsWithLabel('Alias command editor').theme}
                options={editorOptionsWithLabel('Alias command editor')}
              />
            </div>
          </label>
          <div className={commonStyles.actions}>
            <button onClick={handleSave} disabled={!hasUnsaved}>
              <IconLabel icon={Save}>Save</IconLabel>
            </button>
            <button
              onClick={handleDelete}
              className={commonStyles.deleteAction}
            >
              <IconLabel icon={Trash2}>Delete</IconLabel>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AliasView;
