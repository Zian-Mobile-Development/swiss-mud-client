// components/DataView/index.tsx
// View for the data.

import React, { useState } from 'react';
import styles from './styles.module.css';
import commonStyles from '../../styles/common.module.css';
import { DataManager, type MudData } from '../../managers/DataManager';

interface DataViewProps {
  onImport: (data: MudData) => void;
}

const DataView: React.FC<DataViewProps> = ({ onImport }) => {
  const [importText, setImportText] = useState('');
  const [status, setStatus] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  const handleExportToFile = async () => {
    try {
      await DataManager.exportToFile();
    } catch (err) {
      console.error('Failed to export to file:', err);
      alert('Failed to export data to file');
    }
  };

  const handleExportToClipboard = async () => {
    try {
      await DataManager.exportToClipboard();
      alert('Data copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy data to clipboard');
    }
  };

  const handleImportFromFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await DataManager.importFromFile(file);
      onImport(data);
      alert('Data imported successfully!');
    } catch (err) {
      console.error('Failed to import from file:', err);
      alert(
        err instanceof Error ? err.message : 'Failed to import data from file'
      );
    }
  };

  const handleImportFromText = () => {
    try {
      const data = DataManager.importFromText(importText);
      onImport(data);
      setImportText('');
      setStatus({ type: 'success', message: 'Data imported successfully!' });
    } catch (err) {
      console.error('Failed to import from text:', err);
      setStatus({ type: 'error', message: 'Invalid JSON data' });
    }
  };

  return (
    <div className={styles.dataView}>
      <div className={styles.dataSection}>
        <h3>Export Data</h3>
        <div className={commonStyles.actions}>
          <button onClick={handleExportToFile}>Export to File</button>
          <button onClick={handleExportToClipboard}>Export to Clipboard</button>
        </div>
      </div>

      <div className={styles.dataSection}>
        <h3>Import Data</h3>

        <label className={styles.fileInputLabel}>
          <input
            type='file'
            accept='.json'
            onChange={handleImportFromFile}
            style={{ display: 'none' }}
          />
          Import from File
        </label>
        {status && (
          <div
            role='status'
            aria-live='polite'
            className={`${commonStyles.statusMessage} ${
              commonStyles[status.type]
            }`}
          >
            {status.message}
          </div>
        )}
        <div className={styles.importSection}>
          <label className={styles.jsonLabel}>
            Paste your JSON data below to import aliases, triggers, variables
            and settings.
          </label>
          <textarea
            className={commonStyles.textarea}
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder='Paste your JSON data here...'
            rows={10}
          />
          <div className={styles.importButtonRow}>
            <button
              className={commonStyles.actions}
              onClick={handleImportFromText}
              disabled={!importText.trim()}
            >
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataView;
