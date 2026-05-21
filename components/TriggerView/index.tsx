// components/TriggerView/index.tsx
// View for the triggers.

import React, { useCallback, useState, useEffect } from 'react';
import type { Trigger } from '../../types';
import commonStyles from '../../styles/common.module.css';
import Editor from '@monaco-editor/react';
import { editorOptionsWithLabel } from '../../config/EditorOptions';
import { IconLabel } from '../icons/IconLabel';
import { GripVertical, Plus, Save, Trash2 } from 'lucide-react';

interface TriggerViewProps {
  triggers: Trigger[];
  onChange: (triggers: Trigger[]) => void;
  saveRef?: React.RefObject<{ save: () => void } | null>;
}

const emptyTrigger: Trigger = {
  name: '',
  pattern: '',
  command: '',
  enabled: true,
};

const TriggerView: React.FC<TriggerViewProps> = ({
  triggers,
  onChange,
  saveRef,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(
    triggers.length > 0 ? 0 : null
  );
  const [editBuffer, setEditBuffer] = useState<Trigger | null>(null);
  const [localTriggers, setLocalTriggers] = useState<Trigger[]>(triggers);

  // Helper function to save triggers
  const saveTriggers = useCallback((updated: Trigger[]) => {
    setLocalTriggers(updated);
    onChange(updated);
  }, [onChange]);

  useEffect(() => {
    setLocalTriggers(triggers);
  }, [triggers]);

  // When selectedIdx changes, update editBuffer
  useEffect(() => {
    if (selectedIdx !== null && localTriggers[selectedIdx]) {
      setEditBuffer({ ...localTriggers[selectedIdx] });
    } else {
      setEditBuffer(null);
    }
  }, [selectedIdx, localTriggers]);

  // Add new trigger and select it
  const handleAdd = () => {
    const newTriggers = [{ ...emptyTrigger }, ...localTriggers];
    setLocalTriggers(newTriggers);
    setEditBuffer({ ...emptyTrigger });
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

  // Save changes to selected trigger
  const handleSave = useCallback(() => {
    if (selectedIdx === null || !editBuffer) return;
    const updated = localTriggers.map((trigger, idx) =>
      idx === selectedIdx ? { ...editBuffer } : trigger
    );
    saveTriggers(updated);
  }, [editBuffer, localTriggers, saveTriggers, selectedIdx]);

  // Expose save method to parent via ref
  useEffect(() => {
    if (saveRef) {
      saveRef.current = { save: handleSave };
    }
  }, [handleSave, saveRef]);

  // Delete selected trigger
  const handleDelete = () => {
    if (selectedIdx === null) return;
    if (!window.confirm('Delete this trigger?')) return;
    const newTriggers = localTriggers.filter((_, idx) => idx !== selectedIdx);
    saveTriggers(newTriggers);
    setSelectedIdx(newTriggers.length > 0 ? 0 : null);
  };

  // Select trigger
  const handleSelect = (idx: number) => {
    setSelectedIdx(idx);
  };

  // Check if there are unsaved changes
  const hasUnsaved =
    selectedIdx !== null &&
    editBuffer &&
    JSON.stringify(editBuffer) !== JSON.stringify(localTriggers[selectedIdx]);

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

    const updated = [...localTriggers];
    const [movedItem] = updated.splice(sourceIdx, 1);
    updated.splice(targetIdx, 0, movedItem);

    saveTriggers(updated);
    setSelectedIdx(targetIdx);
  };

  return (
    <div className={commonStyles.viewContainer}>
      <div className={commonStyles.sidebar}>
        <button
          type='button'
          className={commonStyles.sidebarToolbarButton}
          onClick={handleAdd}
          aria-label='Add trigger'
        >
          <Plus size={20} aria-hidden />
        </button>
        <div className={commonStyles.sidebarList}>
          <ul role='list' aria-label='Triggers'>
          {localTriggers.map((trigger, index) => (
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
                  <GripVertical
                    size={14}
                    className={commonStyles.dragHandle}
                    aria-hidden
                  />
                  <input
                    type='checkbox'
                    checked={trigger.enabled}
                    aria-label={`Enable trigger ${trigger.name || 'unnamed'}`}
                    onChange={e => {
                    e.stopPropagation();
                    const updated = localTriggers.map((t, i) =>
                      i === index ? { ...t, enabled: e.target.checked } : t
                    );
                    saveTriggers(updated);
                  }}
                  onClick={e => e.stopPropagation()}
                />
                  <span>{trigger.name}</span>
                </span>
              </button>
            </li>
          ))}
          </ul>
        </div>
      </div>
      {selected && (
        <div className={commonStyles.detailsPanel}>
          <div className={commonStyles.formGroup}>
            <label>
              Name
              <input
                type='text'
                name='name'
                value={selected.name}
                onChange={handleFieldChange}
              />
            </label>
          </div>
          <div className={commonStyles.formGroup}>
            <label>
              Pattern
              <input
                type='text'
                name='pattern'
                value={selected.pattern}
                onChange={handleFieldChange}
              />
            </label>
          </div>
          <div className={commonStyles.formGroup}>
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
                  theme={editorOptionsWithLabel('Trigger command editor').theme}
                  options={editorOptionsWithLabel('Trigger command editor')}
                />
              </div>
            </label>
          </div>
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

export default TriggerView;
