import React, { createContext, useContext, useState, useEffect } from 'react';
import { FileMetadata } from '@/services/firestore';
import { useSearchParams, useRouter } from 'next/navigation';

interface FileContextType {
  selectedFile: FileMetadata | null;
  setSelectedFile: (file: FileMetadata | null) => void;
}

const FileContext = createContext<FileContextType>({
  selectedFile: null,
  setSelectedFile: () => {},
});

export const useFile = () => useContext(FileContext);

export const FileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Update URL when file is selected
  useEffect(() => {
    if (selectedFile) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('fileId', selectedFile.id!);
      router.push(`?${params.toString()}`);
    } else {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('fileId');
      router.push(`?${params.toString()}`);
    }
  }, [selectedFile, router, searchParams]);

  return (
    <FileContext.Provider value={{ selectedFile, setSelectedFile }}>
      {children}
    </FileContext.Provider>
  );
}; 