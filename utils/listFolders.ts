import type { ListFolder } from '../types';

export function createListItemId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `item-${Date.now()}-${Math.random()}`;
}

export function createListFolderId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `folder-${Date.now()}-${Math.random()}`
  );
}

export function normalizeListFolders(folders?: ListFolder[]): ListFolder[] {
  if (!Array.isArray(folders)) return [];
  return folders.map(folder => ({
    id: folder.id || createListFolderId(),
    name: folder.name || 'New folder',
    parentId: folder.parentId ?? null,
  }));
}

export function ensureListItemIds<T extends { id?: string }>(items: T[]): T[] {
  return items.map(item => ({
    ...item,
    id: item.id || createListItemId(),
  }));
}

export type FolderTreeNode<T> =
  | { type: 'folder'; folder: ListFolder; depth: number }
  | { type: 'item'; item: T; depth: number };

export function buildFolderTree<
  T extends { id?: string; folderId?: string | null; name: string },
>(
  folders: ListFolder[],
  items: T[],
  collapsedFolderIds: Set<string>
): FolderTreeNode<T>[] {
  const nodes: FolderTreeNode<T>[] = [];

  const visit = (parentId: string | null, depth: number) => {
    const childFolders = folders.filter(
      folder => (folder.parentId ?? null) === parentId
    );
    const childItems = items.filter(item => (item.folderId ?? null) === parentId);

    for (const folder of childFolders) {
      nodes.push({ type: 'folder', folder, depth });
      if (!collapsedFolderIds.has(folder.id)) {
        visit(folder.id, depth + 1);
      }
    }

    for (const item of childItems) {
      nodes.push({ type: 'item', item, depth });
    }
  };

  visit(null, 0);
  return nodes;
}

export function folderOptions(
  folders: ListFolder[],
  parentId: string | null = null,
  depth = 0
): { id: string; label: string }[] {
  const options: { id: string; label: string }[] = [];
  const prefix = depth > 0 ? `${'  '.repeat(depth)}` : '';

  for (const folder of folders.filter(
    folder => (folder.parentId ?? null) === parentId
  )) {
    options.push({ id: folder.id, label: `${prefix}${folder.name}` });
    options.push(...folderOptions(folders, folder.id, depth + 1));
  }

  return options;
}

export function removeFolderAndChildren(
  folders: ListFolder[],
  folderId: string
): ListFolder[] {
  const idsToRemove = new Set<string>([folderId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const folder of folders) {
      if (
        folder.parentId &&
        idsToRemove.has(folder.parentId) &&
        !idsToRemove.has(folder.id)
      ) {
        idsToRemove.add(folder.id);
        changed = true;
      }
    }
  }

  return folders.filter(folder => !idsToRemove.has(folder.id));
}

export function detachItemsFromFolders<T extends { folderId?: string | null }>(
  items: T[],
  folderIds: Set<string>
): T[] {
  return items.map(item =>
    item.folderId && folderIds.has(item.folderId)
      ? { ...item, folderId: null }
      : item
  );
}
