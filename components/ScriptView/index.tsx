// components/ScriptView/index.tsx
// View for the scripts.

import React, { useCallback, useEffect, useState } from 'react';
import type { ListFolder, Script } from '../../types';
import commonStyles from '../../styles/common.module.css';
import Editor from '@monaco-editor/react';
import { editorOptionsWithLabel } from '../../config/EditorOptions';
import { IconLabel } from '../icons/IconLabel';
import { Save, Trash2 } from 'lucide-react';
import { GroupedSidebar } from '../GroupedSidebar/GroupedSidebar';
import { FolderSelect } from '../FolderSelect';
import { createListItemId } from '../../utils/listFolders';

interface ScriptViewProps {
  scripts: Script[];
  folders: ListFolder[];
  onScriptsChange: (scripts: Script[]) => void;
  onFoldersChange: (folders: ListFolder[]) => void;
  saveRef?: React.RefObject<{ save: () => void } | null>;
}

const createEmptyScript = (): Script => ({
  id: createListItemId(),
  name: '',
  event: '',
  command: '',
  enabled: true,
  folderId: null,
});

const ScriptView: React.FC<ScriptViewProps> = ({
  scripts,
  folders,
  onScriptsChange,
  onFoldersChange,
  saveRef,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(
    scripts[0]?.id ?? null
  );
  const [editBuffer, setEditBuffer] = useState<Script | null>(null);
  const [localScripts, setLocalScripts] = useState<Script[]>(scripts);
  const [localFolders, setLocalFolders] = useState<ListFolder[]>(folders);

  const saveScripts = useCallback(
    (updated: Script[]) => {
      setLocalScripts(updated);
      onScriptsChange(updated);
    },
    [onScriptsChange]
  );

  const saveFolders = useCallback(
    (updated: ListFolder[]) => {
      setLocalFolders(updated);
      onFoldersChange(updated);
    },
    [onFoldersChange]
  );

  useEffect(() => {
    setLocalScripts(scripts);
  }, [scripts]);

  useEffect(() => {
    setLocalFolders(folders);
  }, [folders]);

  useEffect(() => {
    if (selectedId && !localScripts.some(script => script.id === selectedId)) {
      setSelectedId(localScripts[0]?.id ?? null);
    }
  }, [localScripts, selectedId]);

  useEffect(() => {
    const selected = localScripts.find(script => script.id === selectedId);
    setEditBuffer(selected ? { ...selected } : null);
  }, [selectedId, localScripts]);

  const handleAdd = () => {
    const script = createEmptyScript();
    const updated = [script, ...localScripts];
    saveScripts(updated);
    setEditBuffer({ ...script });
    setSelectedId(script.id ?? null);
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
    saveScripts(
      localScripts.map(script =>
        script.id === selectedId ? { ...editBuffer } : script
      )
    );
  }, [editBuffer, localScripts, saveScripts, selectedId]);

  useEffect(() => {
    if (saveRef) {
      saveRef.current = { save: handleSave };
    }
  }, [handleSave, saveRef]);

  const handleDelete = () => {
    if (!selectedId) return;
    if (!window.confirm('Delete this script?')) return;
    const updated = localScripts.filter(script => script.id !== selectedId);
    saveScripts(updated);
    setSelectedId(updated[0]?.id ?? null);
  };

  const selected = localScripts.find(script => script.id === selectedId);
  const hasUnsaved =
    selected &&
    editBuffer &&
    JSON.stringify(editBuffer) !== JSON.stringify(selected);

  return (
    <div className={commonStyles.viewContainer}>
      <GroupedSidebar
        items={localScripts}
        folders={localFolders}
        selectedId={selectedId}
        onSelectId={setSelectedId}
        onItemsChange={saveScripts}
        onFoldersChange={saveFolders}
        onAddItem={handleAdd}
        listLabel='Scripts'
        addItemAriaLabel='Add script'
        addFolderAriaLabel='Add script folder'
        getItemLabel={script => script.name}
        renderItemExtra={(script, updateItem) => (
          <input
            type='checkbox'
            checked={script.enabled}
            aria-label={`Enable script ${script.name || 'unnamed'}`}
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
              Event
              <input
                type='text'
                name='event'
                value={editBuffer.event}
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
                  value={editBuffer.command}
                  onChange={value => {
                    setEditBuffer(current =>
                      current ? { ...current, command: value || '' } : current
                    );
                  }}
                  theme={editorOptionsWithLabel('Script command editor').theme}
                  options={editorOptionsWithLabel('Script command editor')}
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

export default ScriptView;
