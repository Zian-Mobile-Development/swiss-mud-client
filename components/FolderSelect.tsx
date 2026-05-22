import React from 'react';
import type { ListFolder } from '../types';
import { folderOptions } from '../utils/listFolders';
import commonStyles from '../styles/common.module.css';

type FolderSelectProps = {
  folders: ListFolder[];
  value: string | null | undefined;
  onChange: (folderId: string | null) => void;
};

export function FolderSelect({ folders, value, onChange }: FolderSelectProps) {
  const options = folderOptions(folders);

  return (
    <div className={commonStyles.formGroup}>
      <label>
        Folder
        <select
          value={value ?? ''}
          onChange={e => onChange(e.target.value ? e.target.value : null)}
        >
          <option value=''>Uncategorized</option>
          {options.map(option => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
