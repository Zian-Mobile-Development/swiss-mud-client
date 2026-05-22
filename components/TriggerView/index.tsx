// components/TriggerView/index.tsx
// View for the triggers.

import React, { useCallback, useEffect, useState } from 'react';
import type { ListFolder, Trigger } from '../../types';
import commonStyles from '../../styles/common.module.css';
import Editor from '@monaco-editor/react';
import { editorOptionsWithLabel } from '../../config/EditorOptions';
import { IconLabel } from '../icons/IconLabel';
import { Save, Trash2 } from 'lucide-react';
import { GroupedSidebar } from '../GroupedSidebar/GroupedSidebar';
import { FolderSelect } from '../FolderSelect';
import { createListItemId } from '../../utils/listFolders';

interface TriggerViewProps {
  triggers: Trigger[];
  folders: ListFolder[];
  onTriggersChange: (triggers: Trigger[]) => void;
  onFoldersChange: (folders: ListFolder[]) => void;
  saveRef?: React.RefObject<{ save: () => void } | null>;
}

const createEmptyTrigger = (): Trigger => ({
  id: createListItemId(),
  name: '',
  pattern: '',
  command: '',
  enabled: true,
  folderId: null,
});

const TriggerView: React.FC<TriggerViewProps> = ({
  triggers,
  folders,
  onTriggersChange,
  onFoldersChange,
  saveRef,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(
    triggers[0]?.id ?? null
  );
  const [editBuffer, setEditBuffer] = useState<Trigger | null>(null);
  const [localTriggers, setLocalTriggers] = useState<Trigger[]>(triggers);
  const [localFolders, setLocalFolders] = useState<ListFolder[]>(folders);

  const saveTriggers = useCallback(
    (updated: Trigger[]) => {
      setLocalTriggers(updated);
      onTriggersChange(updated);
    },
    [onTriggersChange]
  );

  const saveFolders = useCallback(
    (updated: ListFolder[]) => {
      setLocalFolders(updated);
      onFoldersChange(updated);
    },
    [onFoldersChange]
  );

  useEffect(() => {
    setLocalTriggers(triggers);
  }, [triggers]);

  useEffect(() => {
    setLocalFolders(folders);
  }, [folders]);

  useEffect(() => {
    if (selectedId && !localTriggers.some(trigger => trigger.id === selectedId)) {
      setSelectedId(localTriggers[0]?.id ?? null);
    }
  }, [localTriggers, selectedId]);

  useEffect(() => {
    const selected = localTriggers.find(trigger => trigger.id === selectedId);
    setEditBuffer(selected ? { ...selected } : null);
  }, [selectedId, localTriggers]);

  const handleAdd = () => {
    const trigger = createEmptyTrigger();
    const updated = [trigger, ...localTriggers];
    saveTriggers(updated);
    setEditBuffer({ ...trigger });
    setSelectedId(trigger.id ?? null);
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
    saveTriggers(
      localTriggers.map(trigger =>
        trigger.id === selectedId ? { ...editBuffer } : trigger
      )
    );
  }, [editBuffer, localTriggers, saveTriggers, selectedId]);

  useEffect(() => {
    if (saveRef) {
      saveRef.current = { save: handleSave };
    }
  }, [handleSave, saveRef]);

  const handleDelete = () => {
    if (!selectedId) return;
    if (!window.confirm('Delete this trigger?')) return;
    const updated = localTriggers.filter(trigger => trigger.id !== selectedId);
    saveTriggers(updated);
    setSelectedId(updated[0]?.id ?? null);
  };

  const selected = localTriggers.find(trigger => trigger.id === selectedId);
  const hasUnsaved =
    selected &&
    editBuffer &&
    JSON.stringify(editBuffer) !== JSON.stringify(selected);

  return (
    <div className={commonStyles.viewContainer}>
      <GroupedSidebar
        items={localTriggers}
        folders={localFolders}
        selectedId={selectedId}
        onSelectId={setSelectedId}
        onItemsChange={saveTriggers}
        onFoldersChange={saveFolders}
        onAddItem={handleAdd}
        listLabel='Triggers'
        addItemAriaLabel='Add trigger'
        addFolderAriaLabel='Add trigger folder'
        getItemLabel={trigger => trigger.name}
        renderItemExtra={(trigger, updateItem) => (
          <input
            type='checkbox'
            checked={trigger.enabled}
            aria-label={`Enable trigger ${trigger.name || 'unnamed'}`}
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
