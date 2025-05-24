'use client';

import React, { useEffect } from 'react';
import { useMobileMenu } from '@/context/MobileMenuContext';
import { useTheme } from '@/context/ThemeContext';
import DataUpload from './DataUpload';
import { IoClose } from 'react-icons/io5';

interface MobileMenuProps {
  onFileUpload: (analysis: any) => void;
  onDatabaseConnect: (connectionString: string) => void;
  onApiImport: (apiUrl: string) => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({
  onFileUpload,
  onDatabaseConnect,
  onApiImport,
}) => {
  const { isOpen, closeMenu } = useMobileMenu();
  const { colors } = useTheme();

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 z-40 lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMenu}
      />

      {/* Sliding Menu */}
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-[400px] transform transition-transform duration-300 ease-in-out z-50 lg:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ background: colors.background.primary }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colors.border.light }}>
          <h2 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
            Data Management
          </h2>
          <button
            onClick={closeMenu}
            className="p-2 rounded-lg hover:bg-black/10 transition-colors"
            style={{ color: colors.text.primary }}
          >
            <IoClose size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-64px)] overflow-y-auto p-4">
          <DataUpload
            onFileUpload={onFileUpload}
            onDatabaseConnect={onDatabaseConnect}
            onApiImport={onApiImport}
          />
        </div>
      </div>
    </>
  );
};

export default MobileMenu; 