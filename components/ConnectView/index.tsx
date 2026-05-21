// components/ConnectView/index.tsx
// View for the connect.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import commonStyles from '../../styles/common.module.css';
import classNames from 'classnames';
import type { MudProfile } from '../../types';
import { createProfileId, saveProfiles } from '../../utils/ProfileDataStore';

interface ConnectViewProps {
  profiles: MudProfile[];
  onConnect: (profile: MudProfile) => void;
  onProfilesChange: (profiles: MudProfile[]) => void;
  saveRef?: React.RefObject<{ save: () => void } | null>;
}

const ENCODINGS = [
  { value: 'utf8', label: 'UTF-8 (default)' },
  { value: 'ascii', label: 'ASCII' },
  { value: 'gbk', label: 'GBK' },
  { value: 'big5', label: 'Big5' },
];
const emptyProfile: MudProfile = {
  id: '',
  name: '',
  address: '',
  port: 23,
  encoding: 'utf8',
};

export default function ConnectView({
  profiles,
  onConnect,
  onProfilesChange,
  saveRef,
}: ConnectViewProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [editBuffer, setEditBuffer] = useState<MudProfile | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profiles.length > 0 && selectedIdx === null) {
      setSelectedIdx(0);
    }
    if (profiles.length === 0) {
      setSelectedIdx(null);
    }
  }, [profiles.length, selectedIdx]);

  // When selectedIdx changes, update editBuffer
  useEffect(() => {
    if (selectedIdx !== null && profiles[selectedIdx]) {
      setEditBuffer({ ...profiles[selectedIdx] });
    } else {
      setEditBuffer(null);
    }
  }, [selectedIdx, profiles]);

  // Action Handlers
  const handleSelect = (idx: number) => {
    setSelectedIdx(idx);
  };

  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (!editBuffer) return;
    const { name, value } = e.target;
    setEditBuffer({
      ...editBuffer,
      [name]: name === 'port' ? parseInt(value) || 23 : value,
    });
  };

  const handleAdd = () => {
    const newProfile = { ...emptyProfile, id: createProfileId() };
    const newProfiles = [...profiles, newProfile];
    onProfilesChange(newProfiles);
    setEditBuffer({ ...newProfile });
    setSelectedIdx(newProfiles.length - 1);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const handleDelete = () => {
    if (selectedIdx === null) return;
    if (!window.confirm('Delete this profile?')) return;
    const newProfiles = profiles.filter((_, idx) => idx !== selectedIdx);
    saveProfiles(newProfiles);
    onProfilesChange(newProfiles);
    setSelectedIdx(newProfiles.length > 0 ? 0 : null);
  };

  const handleSave = useCallback(() => {
    if (selectedIdx === null || !editBuffer) return;
    if (
      !editBuffer.name.trim() ||
      !editBuffer.address.trim() ||
      !editBuffer.port.toString().trim()
    )
      return;

    //Save profile
    const updated = profiles.map((profile, idx) =>
      idx === selectedIdx ? { ...editBuffer } : profile
    );
    saveProfiles(updated);
    onProfilesChange(updated);
  }, [editBuffer, onProfilesChange, profiles, selectedIdx]);

  const handleConnect = () => {
    if (selectedIdx === null || !editBuffer) return;
    if (
      !editBuffer.name.trim() ||
      !editBuffer.address.trim() ||
      !editBuffer.port.toString().trim()
    )
      return;

    const connectedProfile = { ...editBuffer };
    const updated = [
      connectedProfile,
      ...profiles.filter((_, idx) => idx !== selectedIdx),
    ];

    setSelectedIdx(0);
    saveProfiles(updated);
    onProfilesChange(updated);
    onConnect(connectedProfile);
  };

  // Check if there are unsaved changes
  const hasUnsaved =
    selectedIdx !== null &&
    editBuffer &&
    JSON.stringify(editBuffer) !== JSON.stringify(profiles[selectedIdx]);

  // Expose save method to parent via ref
  useEffect(() => {
    if (saveRef) {
      saveRef.current = { save: handleSave };
    }
  }, [handleSave, saveRef]);

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

    const updated = [...profiles];
    const [movedItem] = updated.splice(sourceIdx, 1);
    updated.splice(targetIdx, 0, movedItem);

    saveProfiles(updated);
    onProfilesChange(updated);
    setSelectedIdx(targetIdx);
  };

  return (
    <div className={commonStyles.viewContainer}>
      <div className={commonStyles.sidebar}>
        <button type='button' onClick={handleAdd} aria-label='Add profile'>
          +
        </button>
        <ul role='list' aria-label='MUD profiles'>
          {profiles.length === 0 ? (
            <li role='status' style={{ color: '#aaa', padding: '8px 16px' }}>
              No profiles
            </li>
          ) : (
            profiles.map((profile, idx) => (
              <li
                key={idx}
                className={classNames({
                  [commonStyles.dragging]: false,
                  [commonStyles.dragOver]: false,
                })}
                draggable
                onDragStart={e => handleDragStart(e, idx)}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                onDragLeave={handleDragLeave}
              >
                <button
                  type='button'
                  className={commonStyles.listRowButton}
                  onClick={() => handleSelect(idx)}
                  aria-current={selectedIdx === idx ? 'true' : undefined}
                >
                  <span className={commonStyles.itemContent}>
                    <span className={commonStyles.dragHandle} aria-hidden='true'>
                      ⋮
                    </span>
                    {profile.name || (
                      <span style={{ color: '#aaa' }}>(unnamed)</span>
                    )}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
      <div className={commonStyles.detailsPanel}>
        {editBuffer ? (
          <>
            <div className={commonStyles.formGroup}>
              <label>
                Profile Name
                <input
                  ref={nameInputRef}
                  type='text'
                  name='name'
                  value={editBuffer.name}
                  onChange={handleFieldChange}
                  placeholder='My MUD Profile'
                  required
                  aria-required='true'
                />
              </label>
            </div>
            <div className={commonStyles.formGroup}>
              <label>
                Host
                <input
                  type='text'
                  name='address'
                  value={editBuffer.address}
                  onChange={handleFieldChange}
                  placeholder='mud.example.com'
                  required
                  aria-required='true'
                />
              </label>
            </div>
            <div className={commonStyles.formGroup}>
              <label>
                Port
                <input
                  type='text'
                  name='port'
                  value={editBuffer.port}
                  onChange={handleFieldChange}
                  placeholder='23'
                  required
                  aria-required='true'
                />
              </label>
            </div>
            <div className={commonStyles.formGroup}>
              <label>
                Encoding
                <select
                  name='encoding'
                  value={editBuffer.encoding}
                  onChange={handleFieldChange}
                >
                  {ENCODINGS.map(encoding => (
                    <option key={encoding.value} value={encoding.value}>
                      {encoding.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={commonStyles.actions}>
              <button
                className={commonStyles.confirmAction}
                type='button'
                onClick={handleConnect}
                disabled={!editBuffer.name || !editBuffer.address}
              >
                Connect
              </button>
              <button
                className={commonStyles.deleteAction}
                type='button'
                onClick={handleDelete}
                disabled={selectedIdx === null}
              >
                Delete
              </button>
              <button type='button' onClick={handleSave} disabled={!hasUnsaved}>
                Save
              </button>
            </div>
          </>
        ) : (
          <div style={{ color: '#aaa' }}>Select or create a profile</div>
        )}
      </div>
    </div>
  );
}
