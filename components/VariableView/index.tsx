// components/VariableView/index.tsx
// View for the variables.

import React, { useCallback, useRef, useState, useEffect } from 'react';
import commonStyles from '../../styles/common.module.css';
import type { ListFolder, Variable } from '../../types';
import { IconLabel } from '../icons/IconLabel';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  GripVertical,
  Save,
  Trash2,
} from 'lucide-react';
import { GroupedSidebar } from '../GroupedSidebar/GroupedSidebar';
import { FolderSelect } from '../FolderSelect';
import { createListItemId } from '../../utils/listFolders';

type SortOrder = null | 'asc' | 'desc';

const createEmptyVariable = (): Variable => ({
  id: createListItemId(),
  name: '',
  value: '',
  folderId: null,
});

export default function VariableView({
  variables,
  folders,
  onVariablesChange,
  onFoldersChange,
  saveRef,
}: {
  variables: Variable[];
  folders: ListFolder[];
  onVariablesChange: (variables: Variable[]) => void;
  onFoldersChange: (folders: ListFolder[]) => void;
  saveRef?: React.RefObject<{ save: () => void } | null>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    variables[0]?.id ?? null
  );
  const [editBuffer, setEditBuffer] = useState<Variable | null>(null);
  const [localVariables, setLocalVariables] = useState<Variable[]>(variables);
  const [localFolders, setLocalFolders] = useState<ListFolder[]>(folders);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const preSortOrderRef = useRef<Variable[] | null>(null);

  const saveVariables = useCallback(
    (updated: Variable[]) => {
      setLocalVariables(updated);
      onVariablesChange(updated);
    },
    [onVariablesChange]
  );

  const saveFolders = useCallback(
    (updated: ListFolder[]) => {
      setLocalFolders(updated);
      onFoldersChange(updated);
    },
    [onFoldersChange]
  );

  useEffect(() => {
    setLocalVariables(variables);
  }, [variables]);

  useEffect(() => {
    setLocalFolders(folders);
  }, [folders]);

  useEffect(() => {
    if (
      selectedId &&
      !localVariables.some(variable => variable.id === selectedId)
    ) {
      setSelectedId(localVariables[0]?.id ?? null);
    }
  }, [localVariables, selectedId]);

  useEffect(() => {
    const selected = localVariables.find(variable => variable.id === selectedId);
    setEditBuffer(selected ? { ...selected } : null);
  }, [selectedId, localVariables]);

  const clearSortState = () => {
    setSortOrder(null);
    preSortOrderRef.current = null;
  };

  const reorderVariables = (reordered: Variable[]) => {
    saveVariables(reordered);
    if (selectedId) {
      const stillSelected = reordered.some(variable => variable.id === selectedId);
      if (!stillSelected) {
        setSelectedId(reordered[0]?.id ?? null);
      }
    }
  };

  const handleSort = () => {
    if (sortOrder === null) {
      preSortOrderRef.current = [...localVariables];
      const sorted = [...localVariables].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setSortOrder('asc');
      reorderVariables(sorted);
      return;
    }

    if (sortOrder === 'asc') {
      const sorted = [...localVariables].sort((a, b) =>
        b.name.localeCompare(a.name)
      );
      setSortOrder('desc');
      reorderVariables(sorted);
      return;
    }

    const restored = preSortOrderRef.current ?? localVariables;
    clearSortState();
    reorderVariables(restored);
  };

  const handleAdd = () => {
    clearSortState();
    const variable = createEmptyVariable();
    const updated = [variable, ...localVariables];
    saveVariables(updated);
    setEditBuffer({ ...variable });
    setSelectedId(variable.id ?? null);
  };

  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!editBuffer) return;
    const { name, value } = e.target;
    setEditBuffer({ ...editBuffer, [name]: value });
  };

  const handleSave = useCallback(() => {
    if (!selectedId || !editBuffer) return;
    saveVariables(
      localVariables.map(variable =>
        variable.id === selectedId ? { ...editBuffer } : variable
      )
    );
  }, [editBuffer, localVariables, saveVariables, selectedId]);

  useEffect(() => {
    if (saveRef) {
      saveRef.current = { save: handleSave };
    }
  }, [handleSave, saveRef]);

  const handleDelete = () => {
    if (!selectedId) return;
    if (!window.confirm('Delete this variable?')) return;
    const updated = localVariables.filter(variable => variable.id !== selectedId);
    saveVariables(updated);
    setSelectedId(updated[0]?.id ?? null);
  };

  const selected = localVariables.find(variable => variable.id === selectedId);
  const hasUnsaved =
    selected &&
    editBuffer &&
    JSON.stringify(editBuffer) !== JSON.stringify(selected);

  return (
    <div className={commonStyles.viewContainer}>
      <GroupedSidebar
        items={localVariables}
        folders={localFolders}
        selectedId={selectedId}
        onSelectId={setSelectedId}
        onItemsChange={updated => {
          clearSortState();
          saveVariables(updated);
        }}
        onFoldersChange={saveFolders}
        onAddItem={handleAdd}
        listLabel='Variables'
        addItemAriaLabel='Add variable'
        addFolderAriaLabel='Add variable folder'
        getItemLabel={variable => variable.name}
        renderItemExtra={() => (
          <GripVertical
            size={14}
            className={commonStyles.dragHandle}
            aria-hidden
          />
        )}
        toolbarExtra={
          <button
            type='button'
            className={commonStyles.sidebarToolbarButton}
            onClick={handleSort}
            aria-pressed={sortOrder !== null}
            aria-label={
              sortOrder === null
                ? 'Sort variables A to Z'
                : sortOrder === 'asc'
                  ? 'Sort variables Z to A'
                  : 'Clear sort and restore original order'
            }
          >
            {sortOrder === 'asc' ? (
              <ArrowUp size={20} aria-hidden />
            ) : sortOrder === 'desc' ? (
              <ArrowDown size={20} aria-hidden />
            ) : (
              <ArrowUpDown size={20} aria-hidden />
            )}
          </button>
        }
      />

      {editBuffer && (
        <div className={commonStyles.detailsPanel}>
          <FolderSelect
            folders={localFolders}
            value={editBuffer.folderId}
            onChange={folderId => setEditBuffer({ ...editBuffer, folderId })}
          />
          <div className={commonStyles.formGroup}>
            <label>
              Name
              <input
                type='text'
                name='name'
                value={editBuffer.name}
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
                value={editBuffer.value}
                onChange={handleFieldChange}
              />
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
}
