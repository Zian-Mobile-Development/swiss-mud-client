// components/AliasView/index.tsx
// View for the aliases.

import React, { useCallback, useEffect, useState } from 'react';
import type { Alias, ListFolder } from '../../types';
import commonStyles from '../../styles/common.module.css';
import Editor from '@monaco-editor/react';
import { editorOptionsWithLabel } from '../../config/EditorOptions';
import { IconLabel } from '../icons/IconLabel';
import { Save, Trash2 } from 'lucide-react';
import { GroupedSidebar } from '../GroupedSidebar/GroupedSidebar';
import { FolderSelect } from '../FolderSelect';
import { createListItemId } from '../../utils/listFolders';

interface AliasViewProps {
  aliases: Alias[];
  folders: ListFolder[];
  onAliasesChange: (aliases: Alias[]) => void;
  onFoldersChange: (folders: ListFolder[]) => void;
  saveRef?: React.RefObject<{ save: () => void } | null>;
}

const createEmptyAlias = (): Alias => ({
  id: createListItemId(),
  name: '',
  pattern: '',
  command: '',
  enabled: true,
  folderId: null,
});

const AliasView: React.FC<AliasViewProps> = ({
  aliases,
  folders,
  onAliasesChange,
  onFoldersChange,
  saveRef,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(
    aliases[0]?.id ?? null
  );
  const [editBuffer, setEditBuffer] = useState<Alias | null>(null);
  const [localAliases, setLocalAliases] = useState<Alias[]>(aliases);
  const [localFolders, setLocalFolders] = useState<ListFolder[]>(folders);

  const saveAliases = useCallback(
    (updated: Alias[]) => {
      setLocalAliases(updated);
      onAliasesChange(updated);
    },
    [onAliasesChange]
  );

  const saveFolders = useCallback(
    (updated: ListFolder[]) => {
      setLocalFolders(updated);
      onFoldersChange(updated);
    },
    [onFoldersChange]
  );

  useEffect(() => {
    setLocalAliases(aliases);
  }, [aliases]);

  useEffect(() => {
    setLocalFolders(folders);
  }, [folders]);

  useEffect(() => {
    if (selectedId && !localAliases.some(alias => alias.id === selectedId)) {
      setSelectedId(localAliases[0]?.id ?? null);
    }
  }, [localAliases, selectedId]);

  useEffect(() => {
    const selected = localAliases.find(alias => alias.id === selectedId);
    setEditBuffer(selected ? { ...selected } : null);
  }, [selectedId, localAliases]);

  const handleAdd = () => {
    const alias = createEmptyAlias();
    const updated = [alias, ...localAliases];
    saveAliases(updated);
    setEditBuffer({ ...alias });
    setSelectedId(alias.id ?? null);
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
    saveAliases(
      localAliases.map(alias =>
        alias.id === selectedId ? { ...editBuffer } : alias
      )
    );
  }, [editBuffer, localAliases, saveAliases, selectedId]);

  useEffect(() => {
    if (saveRef) {
      saveRef.current = { save: handleSave };
    }
  }, [handleSave, saveRef]);

  const handleDelete = () => {
    if (!selectedId) return;
    if (!window.confirm('Delete this alias?')) return;
    const updated = localAliases.filter(alias => alias.id !== selectedId);
    saveAliases(updated);
    setSelectedId(updated[0]?.id ?? null);
  };

  const selected = localAliases.find(alias => alias.id === selectedId);
  const hasUnsaved =
    selected &&
    editBuffer &&
    JSON.stringify(editBuffer) !== JSON.stringify(selected);

  return (
    <div className={commonStyles.viewContainer}>
      <GroupedSidebar
        items={localAliases}
        folders={localFolders}
        selectedId={selectedId}
        onSelectId={setSelectedId}
        onItemsChange={saveAliases}
        onFoldersChange={saveFolders}
        onAddItem={handleAdd}
        listLabel='Aliases'
        addItemAriaLabel='Add alias'
        addFolderAriaLabel='Add alias folder'
        getItemLabel={alias => alias.name}
        renderItemExtra={(alias, updateItem) => (
          <input
            type='checkbox'
            checked={alias.enabled}
            aria-label={`Enable alias ${alias.name || 'unnamed'}`}
            onChange={e => {
              e.stopPropagation();
              updateItem({ enabled: e.target.checked });
            }}
            onClick={e => e.stopPropagation()}
          />
        )}
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
              Pattern
              <input
                type='text'
                name='pattern'
                value={editBuffer.pattern}
                onChange={handleFieldChange}
              />
            </label>
          </div>
          <div className={commonStyles.formGroup}>
            <label id='alias-command-label'>Command</label>
            <div
              className={commonStyles.editorContainer}
              aria-labelledby='alias-command-label'
            >
              <Editor
                defaultLanguage='javascript'
                value={editBuffer.command}
                onChange={value => {
                  setEditBuffer(current =>
                    current ? { ...current, command: value || '' } : current
                  );
                }}
                theme={editorOptionsWithLabel('Alias command editor').theme}
                options={editorOptionsWithLabel('Alias command editor')}
              />
            </div>
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

export default AliasView;
