// components/VariableView/index.tsx
// View for the variables.

import React, { useCallback, useState, useEffect } from 'react';
import commonStyles from '../../styles/common.module.css';
import type { Variable } from '../../types';

const emptyVariable: Variable = { name: '', value: '' };

export default function VariableView({
  variables,
  onChange,
  saveRef,
}: {
  variables: Variable[];
  onChange: (variables: Variable[]) => void;
  saveRef?: React.RefObject<{ save: () => void } | null>;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(
    variables.length > 0 ? 0 : null
  );
  const [editBuffer, setEditBuffer] = useState<Variable | null>(null);
  const [localVariables, setLocalVariables] = useState<Variable[]>(variables);

  // Helper function to save variables
  const saveVariables = useCallback((updated: Variable[]) => {
    setLocalVariables(updated);
    onChange(updated);
  }, [onChange]);

  useEffect(() => {
    setLocalVariables(variables);
  }, [variables]);

  // When selectedIdx changes, update editBuffer
  useEffect(() => {
    if (selectedIdx !== null && localVariables[selectedIdx]) {
      setEditBuffer({ ...localVariables[selectedIdx] });
    } else {
      setEditBuffer(null);
    }
  }, [selectedIdx, localVariables]);

  // Add new variable and select it
  const handleAdd = () => {
    const newVariables = [{ ...emptyVariable }, ...localVariables];
    setLocalVariables(newVariables);
    setEditBuffer({ ...emptyVariable });
    setSelectedIdx(0);
  };

  // Sort variables alphabetically by name
  const handleSort = () => {
    const sorted = [...localVariables].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    saveVariables(sorted);
    // Maintain selection if possible
    if (selectedIdx !== null) {
      const selectedVar = localVariables[selectedIdx];
      const newIndex = sorted.findIndex(v => v.name === selectedVar.name);
      setSelectedIdx(newIndex);
    }
  };

  // Update edit buffer inline
  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!editBuffer) return;
    const { name, value } = e.target;
    setEditBuffer({ ...editBuffer, [name]: value });
  };

  // Save changes to selected variable
  const handleSave = useCallback(() => {
    if (selectedIdx === null || !editBuffer) return;
    const updated = localVariables.map((variable, idx) =>
      idx === selectedIdx ? { ...editBuffer } : variable
    );
    saveVariables(updated);
  }, [editBuffer, localVariables, saveVariables, selectedIdx]);

  // Expose save method to parent via ref
  useEffect(() => {
    if (saveRef) {
      saveRef.current = { save: handleSave };
    }
  }, [handleSave, saveRef]);

  // Delete selected variable
  const handleDelete = () => {
    if (selectedIdx === null) return;
    if (!window.confirm('Delete this variable?')) return;
    const newVariables = localVariables.filter((_, idx) => idx !== selectedIdx);
    saveVariables(newVariables);
    setSelectedIdx(newVariables.length > 0 ? 0 : null);
  };

  // Select variable
  const handleSelect = (idx: number) => {
    setSelectedIdx(idx);
  };

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

  const handleDrop = (e: React.DragEvent<HTMLLIElement>, targetIdx: number) => {
    e.preventDefault();
    e.currentTarget.classList.remove(commonStyles.dragOver);

    const sourceIdx = parseInt(e.dataTransfer.getData('text/plain'));
    if (sourceIdx === targetIdx) return;

    const updated = [...localVariables];
    const [movedItem] = updated.splice(sourceIdx, 1);
    updated.splice(targetIdx, 0, movedItem);

    saveVariables(updated);
    setSelectedIdx(targetIdx);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLIElement>) => {
    e.currentTarget.classList.remove(commonStyles.dragOver);
  };

  // Check if there are unsaved changes
  const hasUnsaved =
    selectedIdx !== null &&
    editBuffer &&
    JSON.stringify(editBuffer) !== JSON.stringify(localVariables[selectedIdx]);

  const selected = editBuffer;

  return (
    <div className={commonStyles.viewContainer}>
      <div className={commonStyles.sidebar}>
        <div className={commonStyles.buttonGroup}>
          <button type='button' onClick={handleAdd} aria-label='Add variable'>
            +
          </button>
          <button
            type='button'
            onClick={handleSort}
            aria-label='Sort variables alphabetically'
          >
            ⇅
          </button>
        </div>
        <ul role='list' aria-label='Variables'>
          {localVariables.map((variable, index) => (
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
                  <span>{variable.name}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
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
              Value
              <input
                type='text'
                name='value'
                value={selected.value}
                onChange={handleFieldChange}
              />
            </label>
          </div>
          <div className={commonStyles.actions}>
            <button onClick={handleSave} disabled={!hasUnsaved}>
              Save
            </button>
            <button
              onClick={handleDelete}
              className={commonStyles.deleteButton}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
