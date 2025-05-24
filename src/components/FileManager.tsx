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
  const { colors, theme } = useTheme();
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
      className="rounded-xl lg:rounded-2xl shadow-lg lg:shadow-2xl p-4 lg:p-6 backdrop-blur-xl"
      style={{ background: colors.background.card, border: `1px solid ${colors.border.light}` }}
    >
      <h2 className="text-lg lg:text-xl font-semibold mb-3 lg:mb-4" style={{ color: colors.text.primary }}>
        Your Files
      </h2>
      
      {/* Error Message */}
      {error && (
        <div 
          className="mb-3 lg:mb-4 p-2 lg:p-3 rounded-lg text-sm"
          style={{ 
            background: 'rgba(255, 0, 0, 0.1)', 
            border: '1px solid rgba(255, 0, 0, 0.2)',
            color: colors.text.primary 
          }}
        >
          {error}
        </div>
      )}

      <div className="space-y-3 lg:space-y-4 max-h-[300px] lg:max-h-none overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
        {savedFiles.map((file) => {
          const isSelected = selectedFile?.id === file.id;
          const isFileDeleting = isDeleting === file.id;
          return (
            <div
              key={file.id}
              className={`p-3 lg:p-4 rounded-lg lg:rounded-xl transition-all duration-200 ${
                isSelected ? 'ring-2 transform scale-[1.02]' : 'hover:scale-[1.01]'
              }`}
              style={{ 
                background: colors.background.input,
                borderColor: isSelected ? colors.primary.from : 'transparent',
                opacity: isFileDeleting ? 0.5 : 1,
              }}
            >
              <div className="flex flex-col gap-2 lg:gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 
                      className="font-medium mb-1 cursor-pointer hover:underline text-sm lg:text-base"
                      style={{ color: colors.text.primary }}
                      onClick={() => handleSelect(file)}
                    >
                      {file.filename}
                    </h3>
                    <div className="grid grid-cols-2 gap-1.5 lg:gap-2 text-xs lg:text-sm">
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
                    className="p-1.5 lg:p-2 rounded-lg transition-all duration-200 hover:scale-110"
                    style={{ 
                      color: theme === 'light' ? '#ef4444' : colors.text.secondary,
                      opacity: isFileDeleting ? 0.5 : 1
                    }}
                    aria-label="Delete file"
                    disabled={isFileDeleting}
                  >
                    {isFileDeleting ? '⏳' : '🗑️'}
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => handleSelect(file)}
                    className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg transition-all duration-200 text-xs lg:text-sm ${
                      isSelected ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                    }`}
                    style={{
                      background: isSelected 
                        ? colors.background.card
                        : `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
                      color: isSelected ? colors.text.secondary : '#FFFFFF',
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