import React, { useMemo, useState } from 'react';
import type { ListFolder } from '../../types';
import commonStyles from '../../styles/common.module.css';
import styles from './styles.module.css';
import {
  buildFolderTree,
  createListFolderId,
  detachItemsFromFolders,
  removeFolderAndChildren,
  type FolderTreeNode,
} from '../../utils/listFolders';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import classNames from 'classnames';

type GroupedItem = {
  id?: string;
  name: string;
  folderId?: string | null;
};

type GroupedSidebarProps<T extends GroupedItem> = {
  items: T[];
  folders: ListFolder[];
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  onItemsChange: (items: T[]) => void;
  onFoldersChange: (folders: ListFolder[]) => void;
  onAddItem: () => void;
  listLabel: string;
  addItemAriaLabel: string;
  addFolderAriaLabel: string;
  getItemLabel?: (item: T) => string;
  renderItemExtra?: (
    item: T,
    updateItem: (patch: Partial<T>) => void
  ) => React.ReactNode;
  toolbarExtra?: React.ReactNode;
};

const indentStyle = (depth: number): React.CSSProperties => ({
  '--indent': `${8 + depth * 20}px`,
} as React.CSSProperties);

const hasFolderBeforeIndex = (
  nodes: FolderTreeNode<GroupedItem>[],
  index: number
) => nodes.slice(0, index).some(node => node.type === 'folder');

const hasRootItemBeforeIndex = (
  nodes: FolderTreeNode<GroupedItem>[],
  index: number
) =>
  nodes
    .slice(0, index)
    .some(node => node.type === 'item' && node.depth === 0);

export function GroupedSidebar<T extends GroupedItem>({
  items,
  folders,
  selectedId,
  onSelectId,
  onItemsChange,
  onFoldersChange,
  onAddItem,
  listLabel,
  addItemAriaLabel,
  addFolderAriaLabel,
  getItemLabel = item => item.name,
  renderItemExtra,
  toolbarExtra,
}: GroupedSidebarProps<T>) {
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(
    () => new Set()
  );
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  const tree = useMemo(
    () => buildFolderTree(folders, items, collapsedFolderIds),
    [folders, items, collapsedFolderIds]
  );

  const toggleFolder = (folderId: string) => {
    setCollapsedFolderIds(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleAddFolder = () => {
    const name = window.prompt('Folder name');
    if (!name?.trim()) return;

    const folder: ListFolder = {
      id: createListFolderId(),
      name: name.trim(),
      parentId: null,
    };
    onFoldersChange([...folders, folder]);
  };

  const handleRenameFolder = (folder: ListFolder) => {
    const name = window.prompt('Rename folder', folder.name);
    if (!name?.trim() || name.trim() === folder.name) return;

    onFoldersChange(
      folders.map(entry =>
        entry.id === folder.id ? { ...entry, name: name.trim() } : entry
      )
    );
  };

  const handleDeleteFolder = (folder: ListFolder) => {
    const childFolderIds = new Set<string>([folder.id]);
    let scanning = true;

    while (scanning) {
      scanning = false;
      for (const entry of folders) {
        if (
          entry.parentId &&
          childFolderIds.has(entry.parentId) &&
          !childFolderIds.has(entry.id)
        ) {
          childFolderIds.add(entry.id);
          scanning = true;
        }
      }
    }

    if (
      !window.confirm(
        `Delete folder "${folder.name}" and move its items to the root?`
      )
    ) {
      return;
    }

    onFoldersChange(removeFolderAndChildren(folders, folder.id));
    onItemsChange(detachItemsFromFolders(items, childFolderIds));
  };

  const updateItem = (itemId: string, patch: Partial<T>) => {
    onItemsChange(
      items.map(item => (item.id === itemId ? { ...item, ...patch } : item))
    );
  };

  const moveItem = (
    draggedItemId: string,
    target:
      | { type: 'folder'; folderId: string | null }
      | { type: 'item'; itemId: string }
  ) => {
    const draggedItem = items.find(item => item.id === draggedItemId);
    if (!draggedItem) return;

    const remainingItems = items.filter(item => item.id !== draggedItemId);

    if (target.type === 'item') {
      if (target.itemId === draggedItemId) return;

      const targetItem = items.find(item => item.id === target.itemId);
      const targetIndex = remainingItems.findIndex(
        item => item.id === target.itemId
      );
      if (!targetItem || targetIndex < 0) return;

      const movedItem = {
        ...draggedItem,
        folderId: targetItem.folderId ?? null,
      };
      const updated = [...remainingItems];
      updated.splice(targetIndex, 0, movedItem);
      onItemsChange(updated);
      onSelectId(draggedItemId);
      return;
    }

    const movedItem = { ...draggedItem, folderId: target.folderId };
    const lastSiblingIndex = remainingItems.reduce(
      (lastIndex, item, index) =>
        (item.folderId ?? null) === target.folderId ? index : lastIndex,
      -1
    );
    const updated = [...remainingItems];
    updated.splice(lastSiblingIndex + 1, 0, movedItem);
    onItemsChange(updated);
    onSelectId(draggedItemId);
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLLIElement>,
    itemId: string
  ) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-swiss-list-item-id', itemId);
    event.dataTransfer.setData('text/plain', itemId);
    event.currentTarget.classList.add(commonStyles.dragging);
  };

  const handleDragEnd = (event: React.DragEvent<HTMLLIElement>) => {
    event.currentTarget.classList.remove(commonStyles.dragging);
    setDragOverTarget(null);
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLElement>,
    targetKey: string
  ) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverTarget(targetKey);
  };

  const handleDragLeave = (
    event: React.DragEvent<HTMLElement>,
    targetKey: string
  ) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    setDragOverTarget(current => (current === targetKey ? null : current));
  };

  const draggedItemIdFrom = (event: React.DragEvent<HTMLElement>) =>
    event.dataTransfer.getData('application/x-swiss-list-item-id') ||
    event.dataTransfer.getData('text/plain');

  const handleDropOnFolder = (
    event: React.DragEvent<HTMLLIElement>,
    folderId: string | null
  ) => {
    event.preventDefault();
    const draggedItemId = draggedItemIdFrom(event);
    setDragOverTarget(null);
    if (!draggedItemId) return;
    moveItem(draggedItemId, { type: 'folder', folderId });
  };

  const handleDropOnItem = (
    event: React.DragEvent<HTMLLIElement>,
    itemId: string
  ) => {
    event.preventDefault();
    const draggedItemId = draggedItemIdFrom(event);
    setDragOverTarget(null);
    if (!draggedItemId) return;
    moveItem(draggedItemId, { type: 'item', itemId });
  };

  return (
    <div className={commonStyles.sidebar}>
      <div className={classNames(commonStyles.buttonGroup, styles.toolbar)}>
        <button
          type='button'
          className={commonStyles.sidebarToolbarButton}
          onClick={onAddItem}
          aria-label={addItemAriaLabel}
        >
          <Plus size={20} aria-hidden />
        </button>
        <button
          type='button'
          className={commonStyles.sidebarToolbarButton}
          onClick={handleAddFolder}
          aria-label={addFolderAriaLabel}
        >
          <FolderPlus size={20} aria-hidden />
        </button>
        {toolbarExtra}
      </div>

      <div className={commonStyles.sidebarList}>
        <ul role='list' aria-label={listLabel}>
          {tree.length === 0 ? (
            <li role='status' style={{ color: '#aaa', padding: '8px' }}>
              No items yet
            </li>
          ) : (
            tree.map((node, index) => {
              if (node.type === 'folder') {
                const { folder, depth } = node;
                const isCollapsed = collapsedFolderIds.has(folder.id);

                return (
                  <li
                    key={folder.id}
                    className={classNames(styles.itemRow, {
                      [commonStyles.dragOver]:
                        dragOverTarget === `folder:${folder.id}`,
                    })}
                    style={indentStyle(depth)}
                    onDragOver={event =>
                      handleDragOver(event, `folder:${folder.id}`)
                    }
                    onDrop={event => handleDropOnFolder(event, folder.id)}
                    onDragLeave={event =>
                      handleDragLeave(event, `folder:${folder.id}`)
                    }
                  >
                    <div
                      className={classNames(
                        styles.folderRow,
                        styles.itemIndent
                      )}
                    >
                      <button
                        type='button'
                        className={styles.folderToggle}
                        onClick={() => toggleFolder(folder.id)}
                        aria-expanded={!isCollapsed}
                        aria-label={
                          isCollapsed
                            ? `Expand ${folder.name}`
                            : `Collapse ${folder.name}`
                        }
                      >
                        {isCollapsed ? (
                          <ChevronRight size={16} aria-hidden />
                        ) : (
                          <ChevronDown size={16} aria-hidden />
                        )}
                      </button>
                      <Folder size={14} aria-hidden />
                      <span className={styles.folderLabel}>{folder.name}</span>
                      <span className={styles.folderActions}>
                        <button
                          type='button'
                          className={styles.folderActionButton}
                          onClick={() => handleRenameFolder(folder)}
                          aria-label={`Rename ${folder.name}`}
                        >
                          <Pencil size={14} aria-hidden />
                        </button>
                        <button
                          type='button'
                          className={styles.folderActionButton}
                          onClick={() => handleDeleteFolder(folder)}
                          aria-label={`Delete ${folder.name}`}
                        >
                          <Trash2 size={14} aria-hidden />
                        </button>
                      </span>
                    </div>
                  </li>
                );
              }

              const { item, depth } = node;
              const label = getItemLabel(item) || '(unnamed)';
              const itemId = item.id!;
              const showRootSeparator =
                depth === 0 &&
                index > 0 &&
                hasFolderBeforeIndex(tree, index) &&
                !hasRootItemBeforeIndex(tree, index);

              return (
                <li
                  key={itemId}
                  className={classNames(styles.itemRow, {
                    [commonStyles.dragOver]:
                      dragOverTarget === `item:${itemId}`,
                    [styles.rootItemSeparator]: showRootSeparator,
                  })}
                  style={indentStyle(depth)}
                  draggable
                  onDragStart={event => handleDragStart(event, itemId)}
                  onDragOver={event => handleDragOver(event, `item:${itemId}`)}
                  onDrop={event => handleDropOnItem(event, itemId)}
                  onDragEnd={handleDragEnd}
                  onDragLeave={event => handleDragLeave(event, `item:${itemId}`)}
                >
                  <button
                    type='button'
                    className={classNames(
                      commonStyles.listRowButton,
                      styles.itemIndent
                    )}
                    onClick={() => onSelectId(itemId)}
                    aria-current={selectedId === itemId ? 'true' : undefined}
                  >
                    <span className={commonStyles.itemContent}>
                      {renderItemExtra?.(item, patch =>
                        updateItem(itemId, patch)
                      )}
                      <span>{label}</span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
