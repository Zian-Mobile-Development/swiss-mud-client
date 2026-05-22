import React, { useEffect, useMemo, useState } from 'react';
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

const dragSourceIsButton = (event: React.DragEvent<HTMLElement>) =>
  event.target instanceof HTMLElement && Boolean(event.target.closest('button'));

const dragSourceIsFormControl = (event: React.DragEvent<HTMLElement>) =>
  event.target instanceof HTMLElement &&
  Boolean(event.target.closest('input, select, textarea'));

const ITEM_IDS_DATA_TYPE = 'application/x-swiss-list-item-ids';
const ITEM_ID_DATA_TYPE = 'application/x-swiss-list-item-id';
const FOLDER_ID_DATA_TYPE = 'application/x-swiss-list-folder-id';

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
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    () => new Set(selectedId ? [selectedId] : [])
  );
  const [lastSelectedItemId, setLastSelectedItemId] = useState<string | null>(
    selectedId
  );

  const tree = useMemo(
    () => buildFolderTree(folders, items, collapsedFolderIds),
    [folders, items, collapsedFolderIds]
  );
  const visibleItemIds = useMemo(
    () => {
      const ids: string[] = [];
      for (const node of tree) {
        if (node.type === 'item' && node.item.id) {
          ids.push(node.item.id);
        }
      }
      return ids;
    },
    [tree]
  );

  useEffect(() => {
    const availableIds = new Set(items.map(item => item.id).filter(Boolean));
    setSelectedItemIds(prev => {
      const next = new Set(
        [...prev].filter(itemId => availableIds.has(itemId))
      );
      if (next.size === 0 && selectedId && availableIds.has(selectedId)) {
        next.add(selectedId);
      }
      return next;
    });
    if (lastSelectedItemId && !availableIds.has(lastSelectedItemId)) {
      setLastSelectedItemId(selectedId ?? null);
    }
  }, [items, lastSelectedItemId, selectedId]);

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

  const childFolderIdsOf = (folderId: string) => {
    const childFolderIds = new Set<string>([folderId]);
    let scanning = true;

    while (scanning) {
      scanning = false;
      for (const folder of folders) {
        if (
          folder.parentId &&
          childFolderIds.has(folder.parentId) &&
          !childFolderIds.has(folder.id)
        ) {
          childFolderIds.add(folder.id);
          scanning = true;
        }
      }
    }

    return childFolderIds;
  };

  const moveFolder = (draggedFolderId: string, targetFolderId: string) => {
    if (draggedFolderId === targetFolderId) return;

    const draggedFolder = folders.find(folder => folder.id === draggedFolderId);
    const targetFolder = folders.find(folder => folder.id === targetFolderId);
    if (!draggedFolder || !targetFolder) return;

    if (childFolderIdsOf(draggedFolderId).has(targetFolderId)) return;

    const remainingFolders = folders.filter(
      folder => folder.id !== draggedFolderId
    );
    const targetIndex = remainingFolders.findIndex(
      folder => folder.id === targetFolderId
    );
    if (targetIndex < 0) return;

    const movedFolder = {
      ...draggedFolder,
      parentId: targetFolder.parentId ?? null,
    };
    const updated = [...remainingFolders];
    updated.splice(targetIndex, 0, movedFolder);
    onFoldersChange(updated);
  };

  const moveItems = (
    draggedItemIds: string[],
    target:
      | { type: 'folder'; folderId: string | null }
      | { type: 'item'; itemId: string }
  ) => {
    const draggedIds = new Set(draggedItemIds);
    const movedItems = items.filter(
      item => item.id && draggedIds.has(item.id)
    );
    if (movedItems.length === 0) return;

    const remainingItems = items.filter(
      item => !item.id || !draggedIds.has(item.id)
    );

    if (target.type === 'item') {
      if (draggedIds.has(target.itemId)) return;

      const targetItem = items.find(item => item.id === target.itemId);
      const targetIndex = remainingItems.findIndex(
        item => item.id === target.itemId
      );
      if (!targetItem || targetIndex < 0) return;

      const updatedMovedItems = movedItems.map(item => ({
        ...item,
        folderId: targetItem.folderId ?? null,
      }));
      const updated = [...remainingItems];
      updated.splice(targetIndex, 0, ...updatedMovedItems);
      onItemsChange(updated);
      onSelectId(movedItems[0].id ?? null);
      setSelectedItemIds(new Set(movedItems.map(item => item.id!)));
      return;
    }

    const updatedMovedItems = movedItems.map(item => ({
      ...item,
      folderId: target.folderId,
    }));
    const lastSiblingIndex = remainingItems.reduce(
      (lastIndex, item, index) =>
        (item.folderId ?? null) === target.folderId ? index : lastIndex,
      -1
    );
    const updated = [...remainingItems];
    updated.splice(lastSiblingIndex + 1, 0, ...updatedMovedItems);
    onItemsChange(updated);
    onSelectId(movedItems[0].id ?? null);
    setSelectedItemIds(new Set(movedItems.map(item => item.id!)));
  };

  const handleItemSelect = (
    event: React.MouseEvent<HTMLButtonElement>,
    itemId: string
  ) => {
    onSelectId(itemId);

    if (event.shiftKey && lastSelectedItemId) {
      const anchorIndex = visibleItemIds.indexOf(lastSelectedItemId);
      const currentIndex = visibleItemIds.indexOf(itemId);
      if (anchorIndex >= 0 && currentIndex >= 0) {
        const [start, end] =
          anchorIndex < currentIndex
            ? [anchorIndex, currentIndex]
            : [currentIndex, anchorIndex];
        setSelectedItemIds(new Set(visibleItemIds.slice(start, end + 1)));
        return;
      }
    }

    setSelectedItemIds(new Set([itemId]));
    setLastSelectedItemId(itemId);
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLLIElement>,
    itemId: string
  ) => {
    if (dragSourceIsFormControl(event)) {
      event.preventDefault();
      return;
    }

    const draggedItemIds =
      selectedItemIds.has(itemId) && selectedItemIds.size > 1
        ? [...selectedItemIds]
        : [itemId];

    if (!selectedItemIds.has(itemId)) {
      setSelectedItemIds(new Set([itemId]));
      setLastSelectedItemId(itemId);
      onSelectId(itemId);
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(ITEM_IDS_DATA_TYPE, JSON.stringify(draggedItemIds));
    event.dataTransfer.setData(ITEM_ID_DATA_TYPE, itemId);
    event.dataTransfer.setData('text/plain', itemId);
    event.currentTarget.classList.add(commonStyles.dragging);
  };

  const handleFolderDragStart = (
    event: React.DragEvent<HTMLLIElement>,
    folderId: string
  ) => {
    if (dragSourceIsButton(event)) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(FOLDER_ID_DATA_TYPE, folderId);
    event.dataTransfer.setData('text/plain', folderId);
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

  const draggedItemIdsFrom = (event: React.DragEvent<HTMLElement>) => {
    const itemIds = event.dataTransfer.getData(ITEM_IDS_DATA_TYPE);
    if (itemIds) {
      try {
        const parsed = JSON.parse(itemIds);
        if (Array.isArray(parsed)) {
          return parsed.filter((id): id is string => typeof id === 'string');
        }
      } catch {
        return [];
      }
    }

    const itemId =
      event.dataTransfer.getData(ITEM_ID_DATA_TYPE) ||
      event.dataTransfer.getData('text/plain');
    return itemId ? [itemId] : [];
  };

  const draggedFolderIdFrom = (event: React.DragEvent<HTMLElement>) =>
    event.dataTransfer.getData(FOLDER_ID_DATA_TYPE);

  const handleDropOnFolder = (
    event: React.DragEvent<HTMLLIElement>,
    folderId: string | null
  ) => {
    event.preventDefault();
    const draggedFolderId = draggedFolderIdFrom(event);
    if (folderId && draggedFolderId) {
      setDragOverTarget(null);
      moveFolder(draggedFolderId, folderId);
      return;
    }

    const draggedItemIds = draggedItemIdsFrom(event);
    setDragOverTarget(null);
    if (draggedItemIds.length === 0) return;
    moveItems(draggedItemIds, { type: 'folder', folderId });
  };

  const handleDropOnItem = (
    event: React.DragEvent<HTMLLIElement>,
    itemId: string
  ) => {
    event.preventDefault();
    const draggedItemIds = draggedItemIdsFrom(event);
    setDragOverTarget(null);
    if (draggedItemIds.length === 0) return;
    moveItems(draggedItemIds, { type: 'item', itemId });
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
                      [styles.folderDragOver]:
                        dragOverTarget === `folder:${folder.id}`,
                    })}
                    style={indentStyle(depth)}
                    draggable
                    onDragStart={event =>
                      handleFolderDragStart(event, folder.id)
                    }
                    onDragOver={event =>
                      handleDragOver(event, `folder:${folder.id}`)
                    }
                    onDrop={event => handleDropOnFolder(event, folder.id)}
                    onDragEnd={handleDragEnd}
                    onDragLeave={event =>
                      handleDragLeave(event, `folder:${folder.id}`)
                    }
                  >
                    <div
                      className={classNames(
                        styles.folderRow,
                        styles.itemIndent
                      )}
                      onClick={() => toggleFolder(folder.id)}
                      role='button'
                      tabIndex={0}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleFolder(folder.id);
                        }
                      }}
                      aria-expanded={!isCollapsed}
                    >
                      <button
                        type='button'
                        className={styles.folderToggle}
                        onClick={event => {
                          event.stopPropagation();
                          toggleFolder(folder.id);
                        }}
                        tabIndex={-1}
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
                          onClick={event => {
                            event.stopPropagation();
                            handleRenameFolder(folder);
                          }}
                          aria-label={`Rename ${folder.name}`}
                        >
                          <Pencil size={14} aria-hidden />
                        </button>
                        <button
                          type='button'
                          className={styles.folderActionButton}
                          onClick={event => {
                            event.stopPropagation();
                            handleDeleteFolder(folder);
                          }}
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

              return (
                <li
                  key={itemId}
                  className={classNames(styles.itemRow, {
                    [commonStyles.dragOver]:
                      dragOverTarget === `item:${itemId}`,
                    [styles.multiSelectedItem]: selectedItemIds.has(itemId)
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
                    onClick={event => handleItemSelect(event, itemId)}
                    aria-current={selectedId === itemId ? 'true' : undefined}
                    aria-selected={selectedItemIds.has(itemId)}
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
