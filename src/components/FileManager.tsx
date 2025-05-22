'use client';

import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useFile } from '@/context/FileContext';
import { FileMetadata } from '@/services/firestore';
import { deleteFile } from '@/services/files';
import { formatFileSize, formatDate } from '@/utils/format';

interface FileManagerProps {
  savedFiles: FileMetadata[];
  onFileDelete: (fileId: string) => void;
  onFileSelect: (file: FileMetadata) => void;
}

const FileManager: React.FC<FileManagerProps> = ({
  savedFiles,
  onFileDelete,
  onFileSelect,
}) => {
  const { colors } = useTheme();
  const { selectedFile, setSelectedFile } = useFile();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (file: FileMetadata) => {
    try {
      setError(null);
      setIsDeleting(file.id!);
      await deleteFile(file);
      if (selectedFile?.id === file.id) {
        setSelectedFile(null);
      }
      onFileDelete(file.id!);
    } catch (error) {
      console.error('Error deleting file:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete file');
      // Auto-hide error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSelect = (file: FileMetadata) => {
    setSelectedFile(file);
    onFileSelect(file);
  };

  if (savedFiles.length === 0) {
    return null;
  }

  return (
    <div 
      className="rounded-2xl shadow-2xl p-6 backdrop-blur-xl"
      style={{ background: colors.background.card, border: `1px solid ${colors.border.light}` }}
    >
      <h2 className="text-xl font-semibold mb-4" style={{ color: colors.text.primary }}>
        Your Files
      </h2>
      
      {/* Error Message */}
      {error && (
        <div 
          className="mb-4 p-3 rounded-lg"
          style={{ 
            background: 'rgba(255, 0, 0, 0.1)', 
            border: '1px solid rgba(255, 0, 0, 0.2)',
            color: colors.text.primary 
          }}
        >
          {error}
        </div>
      )}

      <div className="space-y-4">
        {savedFiles.map((file) => {
          const isSelected = selectedFile?.id === file.id;
          const isFileDeleting = isDeleting === file.id;
          return (
            <div
              key={file.id}
              className={`p-4 rounded-xl transition-all duration-200 ${
                isSelected ? 'ring-2 transform scale-[1.02]' : 'hover:scale-[1.01]'
              }`}
              style={{ 
                background: colors.background.input,
                borderColor: isSelected ? colors.primary.from : 'transparent',
                opacity: isFileDeleting ? 0.5 : 1,
              }}
            >
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 
                      className="font-medium mb-1 cursor-pointer hover:underline"
                      style={{ color: colors.text.primary }}
                      onClick={() => handleSelect(file)}
                    >
                      {file.filename}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div style={{ color: colors.text.secondary }}>
                        Size: {formatFileSize(file.size)}
                      </div>
                      <div style={{ color: colors.text.secondary }}>
                        Uploaded: {formatDate(file.uploadedAt)}
                      </div>
                      <div style={{ color: colors.text.secondary }}>
                        Rows: {file.totalRows}
                      </div>
                      <div style={{ color: colors.text.secondary }}>
                        Columns: {file.totalColumns}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(file)}
                    className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
                    style={{ color: colors.text.secondary }}
                    aria-label="Delete file"
                    disabled={isFileDeleting}
                  >
                    {isFileDeleting ? '⏳' : '🗑️'}
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => handleSelect(file)}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm ${
                      isSelected ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                    }`}
                    style={{
                      background: isSelected 
                        ? colors.background.card
                        : `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
                      color: colors.text.primary,
                    }}
                    disabled={isSelected || isFileDeleting}
                  >
                    {isSelected ? 'Currently Selected' : 'Use in Chat'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FileManager; 