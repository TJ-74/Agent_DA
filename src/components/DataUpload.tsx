'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { uploadCSV, AnalysisResult } from '@/services/api';
import { saveFileMetadata, getUserFiles, FileMetadata, deleteFileMetadata } from '@/services/firestore';
import { deleteFile } from '@/services/files';
import FileManager from './FileManager';
import { useFile } from '@/context/FileContext';

interface DataUploadProps {
  onFileUpload: (analysis: AnalysisResult) => void;
  onDatabaseConnect: (connectionString: string) => void;
  onApiImport: (apiUrl: string) => void;
}

const DataUpload: React.FC<DataUploadProps> = ({
  onFileUpload,
  onDatabaseConnect,
  onApiImport,
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'database' | 'api'>('file');
  const [connectionString, setConnectionString] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<AnalysisResult | null>(null);
  const [savedFiles, setSavedFiles] = useState<FileMetadata[]>([]);
  const { colors, theme } = useTheme();
  const { user } = useAuth();
  const { selectedFile, setSelectedFile } = useFile();

  useEffect(() => {
    if (user) {
      loadSavedFiles();
    }
  }, [user]);

  const loadSavedFiles = async () => {
    try {
      const files = await getUserFiles();
      setSavedFiles(files);
    } catch (err) {
      console.error('Error loading saved files:', err);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      // Upload to R2 and get analysis
      const analysis = await uploadCSV(file);
      
      // Save metadata to Firestore
      const metadata: Omit<FileMetadata, 'id' | 'userId' | 'uploadedAt'> = {
        filename: file.name,
        r2Key: analysis.file_key!, // This should be the key returned from R2 upload
        fileType: file.type,
        size: file.size,
        totalRows: analysis.total_rows,
        totalColumns: analysis.total_columns,
        numericColumns: Object.keys(analysis.numeric_columns || {}),
        categoricalColumns: Object.keys(analysis.categorical_columns || {}),
      };

      await saveFileMetadata(metadata);
      await loadSavedFiles(); // Refresh the file list

      setCurrentFile(analysis);
      onFileUpload(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDatabaseConnect = (e: React.FormEvent) => {
    e.preventDefault();
    onDatabaseConnect(connectionString);
  };

  const handleApiImport = (e: React.FormEvent) => {
    e.preventDefault();
    onApiImport(apiUrl);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const fileToDelete = savedFiles.find(f => f.id === fileId);
      if (!fileToDelete) {
        throw new Error('File not found');
      }
      
      await deleteFile(fileToDelete);
      await loadSavedFiles();
      setCurrentFile(null);
    } catch (error) {
      console.error('Error deleting file:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete file');
    }
  };

  const handleFileSelect = async (file: FileMetadata) => {
    try {
      setIsLoading(true);
      // Here you would fetch the file from R2 using the r2Key
      // and perform analysis again if needed
      // For now, we'll just update the UI
      setCurrentFile({
        filename: file.filename,
        total_rows: file.totalRows,
        total_columns: file.totalColumns,
        numeric_columns: file.numericColumns.reduce((acc, col) => ({ ...acc, [col]: true }), {}),
        categorical_columns: file.categoricalColumns.reduce((acc, col) => ({ ...acc, [col]: true }), {}),
      });
    } catch (error) {
      console.error('Error selecting file:', error);
      setError('Failed to load file');
    } finally {
      setIsLoading(false);
    }
  };

  const renderFileDetails = () => {
    if (!currentFile) return null;

    return (
      <div className="mt-6 p-4 rounded-xl" style={{ background: colors.background.input }}>
        <h3 className="text-lg font-semibold mb-3" style={{ color: colors.text.primary }}>
          Uploaded File Details
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: colors.border.light }}>
            <span style={{ color: colors.text.secondary }}>Filename:</span>
            <span style={{ color: colors.text.primary }}>{currentFile.filename}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: colors.border.light }}>
            <span style={{ color: colors.text.secondary }}>Total Rows:</span>
            <span style={{ color: colors.text.primary }}>{currentFile.total_rows}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: colors.border.light }}>
            <span style={{ color: colors.text.secondary }}>Total Columns:</span>
            <span style={{ color: colors.text.primary }}>{currentFile.total_columns}</span>
          </div>
          <div className="py-2">
            <div className="mb-2" style={{ color: colors.text.secondary }}>Column Types:</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded" style={{ background: colors.background.card }}>
                <span style={{ color: colors.text.secondary }}>Numeric:</span>
                <span className="ml-2" style={{ color: colors.text.primary }}>
                  {Object.keys(currentFile.numeric_columns || {}).length}
                </span>
              </div>
              <div className="p-2 rounded" style={{ background: colors.background.card }}>
                <span style={{ color: colors.text.secondary }}>Categorical:</span>
                <span className="ml-2" style={{ color: colors.text.primary }}>
                  {Object.keys(currentFile.categorical_columns || {}).length}
                </span>
              </div>
            </div>
          </div>
          {currentFile?.correlations?.top_correlations && currentFile.correlations.top_correlations.length > 0 && (
            <div className="py-2">
              <div className="mb-2" style={{ color: colors.text.secondary }}>Top Correlation:</div>
              <div className="p-2 rounded" style={{ background: colors.background.card }}>
                <div style={{ color: colors.text.primary }}>
                  {currentFile.correlations.top_correlations[0].column1} ↔ {currentFile.correlations.top_correlations[0].column2}
                </div>
                <div style={{ color: colors.text.secondary }}>
                  Correlation: {currentFile.correlations.top_correlations[0].correlation.toFixed(3)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {selectedFile && (
        <div className="p-3 lg:p-4 rounded-lg border" style={{ borderColor: colors.border.light }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm lg:text-base font-medium" style={{ color: colors.text.primary }}>
              Selected File
            </h3>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-xs lg:text-sm px-2 lg:px-3 py-1 rounded-lg transition-all duration-200 hover:scale-105 cursor-pointer"
              style={{
                background: colors.background.input,
                border: `1px solid ${colors.border.light}`,
                color: colors.text.primary,
              }}
            >
              Unselect
            </button>
          </div>
          <p className="text-xs lg:text-sm" style={{ color: colors.text.secondary }}>
            {selectedFile.filename}
          </p>
        </div>
      )}

      <div className="rounded-xl lg:rounded-2xl shadow-lg lg:shadow-2xl p-4 lg:p-6 backdrop-blur-xl" 
        style={{ background: colors.background.card, border: `1px solid ${colors.border.light}` }}
      >
        <div className="flex space-x-1 lg:space-x-2 mb-4 lg:mb-6 rounded-xl p-1" style={{ background: colors.background.input }}>
          <button
            className="flex-1 px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg transition-all duration-200 cursor-pointer text-xs lg:text-sm"
            style={{
              background: activeTab === 'file' ? `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})` : 'transparent',
              color: activeTab === 'file' ? '#FFFFFF' : colors.text.secondary,
            }}
            onClick={() => setActiveTab('file')}
          >
            Upload
          </button>
          <button
            className="flex-1 px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg transition-all duration-200 cursor-pointer text-xs lg:text-sm"
            style={{
              background: activeTab === 'database' ? `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})` : 'transparent',
              color: activeTab === 'database' ? '#FFFFFF' : colors.text.secondary,
            }}
            onClick={() => setActiveTab('database')}
          >
            Database
          </button>
          <button
            className="flex-1 px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg transition-all duration-200 cursor-pointer text-xs lg:text-sm"
            style={{
              background: activeTab === 'api' ? `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})` : 'transparent',
              color: activeTab === 'api' ? '#FFFFFF' : colors.text.secondary,
            }}
            onClick={() => setActiveTab('api')}
          >
            API
          </button>
        </div>

        {activeTab === 'file' && (
          <div
            className={`border-2 border-dashed rounded-lg lg:rounded-xl p-6 lg:p-8 text-center transition-all duration-200 cursor-pointer ${
              isLoading ? 'opacity-50 pointer-events-none' : ''
            }`}
            style={{
              borderColor: isDragging ? colors.primary.from : colors.border.light,
              background: isDragging ? `${colors.primary.from}10` : 'transparent',
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              disabled={isLoading}
            />
            <label
              htmlFor="file-upload"
              className={`cursor-pointer px-4 lg:px-6 py-2 lg:py-3 rounded-lg lg:rounded-xl inline-block transition-all duration-200 transform hover:scale-105 hover:shadow-lg text-sm lg:text-base ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              style={{
                background: `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
                color: '#FFFFFF',
              }}
            >
              {isLoading ? 'Uploading...' : 'Choose File'}
            </label>
            <p className="mt-3 lg:mt-4 text-xs lg:text-sm" style={{ color: colors.text.secondary }}>
              {isLoading ? 'Processing your file...' : 'Drag and drop your CSV file here or click to browse'}
            </p>
            <p className="text-[10px] lg:text-xs mt-2" style={{ color: colors.text.muted }}>
              Supported format: CSV
            </p>
            {error && (
              <p className="mt-3 lg:mt-4 text-xs lg:text-sm text-red-500">
                {error}
              </p>
            )}
          </div>
        )}

        {activeTab === 'database' && (
          <form onSubmit={handleDatabaseConnect} className="space-y-3 lg:space-y-4">
            <div>
              <label className="block text-xs lg:text-sm font-medium mb-1.5 lg:mb-2" style={{ color: colors.text.secondary }}>
                Connection String
              </label>
              <input
                type="text"
                value={connectionString}
                onChange={(e) => setConnectionString(e.target.value)}
                className={`w-full rounded-lg lg:rounded-xl px-3 lg:px-4 py-2 lg:py-3 focus:outline-none focus:ring-2 transition-all duration-200 text-xs lg:text-sm ${
                  theme === 'light' 
                    ? 'placeholder:text-gray-500' 
                    : 'placeholder:text-gray-400'
                }`}
                style={{
                  background: colors.background.input,
                  color: colors.text.primary,
                  border: `1px solid ${colors.border.light}`,
                }}
                placeholder="postgresql://user:password@localhost:5432/dbname"
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 lg:px-6 py-2 lg:py-3 rounded-lg lg:rounded-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 text-sm lg:text-base"
              style={{
                background: `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
                color: '#FFFFFF',
              }}
            >
              Connect
            </button>
          </form>
        )}

        {activeTab === 'api' && (
          <form onSubmit={handleApiImport} className="space-y-3 lg:space-y-4">
            <div>
              <label className="block text-xs lg:text-sm font-medium mb-1.5 lg:mb-2" style={{ color: colors.text.secondary }}>
                API Endpoint
              </label>
              <input
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className={`w-full rounded-lg lg:rounded-xl px-3 lg:px-4 py-2 lg:py-3 focus:outline-none focus:ring-2 transition-all duration-200 text-xs lg:text-sm ${
                  theme === 'light' 
                    ? 'placeholder:text-gray-500' 
                    : 'placeholder:text-gray-400'
                }`}
                style={{
                  background: colors.background.input,
                  color: colors.text.primary,
                  border: `1px solid ${colors.border.light}`,
                }}
                placeholder="https://api.example.com/data"
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 lg:px-6 py-2 lg:py-3 rounded-lg lg:rounded-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 text-sm lg:text-base"
              style={{
                background: `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
                color: '#FFFFFF',
              }}
            >
              Import
            </button>
          </form>
        )}
      </div>

      <FileManager 
        savedFiles={savedFiles}
        onFileDelete={handleDeleteFile}
        onFileSelect={handleFileSelect}
      />

      {currentFile && renderFileDetails()}
    </div>
  );
};

export default DataUpload; 