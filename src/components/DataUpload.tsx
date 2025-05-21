'use client';

import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { uploadCSV, AnalysisResult } from '@/services/api';
import FileManager from './FileManager';

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
  const { colors } = useTheme();

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
      const analysis = await uploadCSV(file);
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

  const handleDeleteFile = (fileKey: string) => {
    setCurrentFile(null);
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
    <div className="space-y-6">
      <div className="rounded-2xl shadow-2xl p-6 backdrop-blur-xl" 
        style={{ background: colors.background.card, border: `1px solid ${colors.border.light}` }}
      >
        <div className="flex space-x-2 mb-6 rounded-xl p-1" style={{ background: colors.background.input }}>
          <button
            className="flex-1 px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer"
            style={{
              background: activeTab === 'file' ? `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})` : 'transparent',
              color: activeTab === 'file' ? colors.text.primary : colors.text.secondary,
            }}
            onClick={() => setActiveTab('file')}
          >
            Upload File
          </button>
          <button
            className="flex-1 px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer"
            style={{
              background: activeTab === 'database' ? `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})` : 'transparent',
              color: activeTab === 'database' ? colors.text.primary : colors.text.secondary,
            }}
            onClick={() => setActiveTab('database')}
          >
            Database
          </button>
          <button
            className="flex-1 px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer"
            style={{
              background: activeTab === 'api' ? `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})` : 'transparent',
              color: activeTab === 'api' ? colors.text.primary : colors.text.secondary,
            }}
            onClick={() => setActiveTab('api')}
          >
            API
          </button>
        </div>

        {activeTab === 'file' && (
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
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
              className={`cursor-pointer px-6 py-3 rounded-xl inline-block transition-all duration-200 transform hover:scale-105 hover:shadow-lg ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              style={{
                background: `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
                color: colors.text.primary,
              }}
            >
              {isLoading ? 'Uploading...' : 'Choose File'}
            </label>
            <p className="mt-4 text-sm" style={{ color: colors.text.secondary }}>
              {isLoading ? 'Processing your file...' : 'Drag and drop your CSV file here or click to browse'}
            </p>
            <p className="text-xs mt-2" style={{ color: colors.text.muted }}>
              Supported format: CSV
            </p>
            {error && (
              <p className="mt-4 text-sm text-red-500">
                {error}
              </p>
            )}
          </div>
        )}

        {activeTab === 'database' && (
          <form onSubmit={handleDatabaseConnect} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.text.secondary }}>
                Connection String
              </label>
              <input
                type="text"
                value={connectionString}
                onChange={(e) => setConnectionString(e.target.value)}
                className="w-full rounded-xl px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-200"
                style={{
                  background: colors.background.input,
                  color: '#FFFFFF',
                  border: `1px solid ${colors.border.light}`,
                }}
                placeholder="postgresql://user:password@localhost:5432/dbname"
              />
            </div>
            <button
              type="submit"
              className="w-full px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2"
              style={{
                background: `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
                color: colors.text.primary,
              }}
            >
              Connect
            </button>
          </form>
        )}

        {activeTab === 'api' && (
          <form onSubmit={handleApiImport} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.text.secondary }}>
                API Endpoint
              </label>
              <input
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full rounded-xl px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-200"
                style={{
                  background: colors.background.input,
                  color: '#FFFFFF',
                  border: `1px solid ${colors.border.light}`,
                }}
                placeholder="https://api.example.com/data"
              />
            </div>
            <button
              type="submit"
              className="w-full px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2"
              style={{
                background: `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
                color: colors.text.primary,
              }}
            >
              Import
            </button>
          </form>
        )}
      </div>

      <FileManager 
        currentFile={currentFile}
        onDeleteFile={handleDeleteFile}
      />
    </div>
  );
};

export default DataUpload; 