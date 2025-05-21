'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { AnalysisResult, getFileDownloadUrl, analyzeStoredFile, deleteStoredFile } from '@/services/api';

interface FileManagerProps {
  currentFile: AnalysisResult | null;
  onDeleteFile: (fileKey: string) => void;
}

const FileManager: React.FC<FileManagerProps> = ({ currentFile, onDeleteFile }) => {
  const { colors } = useTheme();
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentFile?.file_key) {
      fetchDownloadUrl(currentFile.file_key);
    }
  }, [currentFile]);

  const fetchDownloadUrl = async (fileKey: string) => {
    try {
      const url = await getFileDownloadUrl(fileKey);
      setDownloadUrl(url);
    } catch (error) {
      console.error('Failed to get download URL:', error);
    }
  };

  const handleDelete = async () => {
    if (!currentFile?.file_key) return;
    
    setIsLoading(true);
    try {
      await deleteStoredFile(currentFile.file_key);
      onDeleteFile(currentFile.file_key);
    } catch (error) {
      console.error('Failed to delete file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReanalyze = async () => {
    if (!currentFile?.file_key) return;
    
    setIsLoading(true);
    try {
      const result = await analyzeStoredFile(currentFile.file_key);
      // Handle the new analysis result
      console.log('New analysis:', result);
    } catch (error) {
      console.error('Failed to reanalyze file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentFile) return null;

  return (
    <div 
      className="mt-6 p-6 rounded-xl"
      style={{ background: colors.background.card, border: `1px solid ${colors.border.light}` }}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold" style={{ color: colors.text.primary }}>
          Current File
        </h3>
        <div className="flex space-x-2">
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg transition-all duration-200"
              style={{
                background: `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
                color: colors.text.primary,
              }}
            >
              Download
            </a>
          )}
          <button
            onClick={handleReanalyze}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg transition-all duration-200"
            style={{
              background: colors.background.input,
              color: colors.text.primary,
              border: `1px solid ${colors.border.light}`,
            }}
          >
            Reanalyze
          </button>
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg transition-all duration-200"
            style={{
              background: '#dc2626',
              color: colors.text.primary,
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: colors.border.light }}>
          <span style={{ color: colors.text.secondary }}>Filename:</span>
          <span style={{ color: colors.text.primary }}>{currentFile.filename}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: colors.border.light }}>
          <span style={{ color: colors.text.secondary }}>File ID:</span>
          <span style={{ color: colors.text.primary }}>{currentFile.file_key}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: colors.border.light }}>
          <span style={{ color: colors.text.secondary }}>Total Rows:</span>
          <span style={{ color: colors.text.primary }}>{currentFile.total_rows}</span>
        </div>
        <div className="flex justify-between items-center py-2" style={{ borderColor: colors.border.light }}>
          <span style={{ color: colors.text.secondary }}>Total Columns:</span>
          <span style={{ color: colors.text.primary }}>{currentFile.total_columns}</span>
        </div>
      </div>
    </div>
  );
};

export default FileManager; 