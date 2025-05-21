'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeContext';

const Navbar: React.FC = () => {
  const { colors, theme, toggleTheme } = useTheme();

  return (
    <nav 
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl transition-colors duration-300" 
      style={{ 
        background: theme === 'light' 
          ? 'rgba(255, 255, 255, 0.8)'
          : 'rgba(17, 24, 39, 0.8)',
        borderBottom: `1px solid ${colors.border.light}` 
      }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <h1 
              className="text-xl font-bold transition-colors duration-300"
              style={{ color: colors.text.primary }}
            >
              Data Analyst
            </h1>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-8">
            <a 
              href="#" 
              className="text-sm font-medium transition-all duration-200 hover:opacity-80 border-b-2 border-transparent hover:border-current pb-0.5" 
              style={{ color: colors.text.secondary }}
            >
              Dashboard
            </a>
            <a 
              href="#" 
              className="text-sm font-medium transition-all duration-200 hover:opacity-80 border-b-2 border-transparent hover:border-current pb-0.5" 
              style={{ color: colors.text.secondary }}
            >
              Analysis
            </a>
            <a 
              href="#" 
              className="text-sm font-medium transition-all duration-200 hover:opacity-80 border-b-2 border-transparent hover:border-current pb-0.5" 
              style={{ color: colors.text.secondary }}
            >
              Reports
            </a>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2"
            style={{
              background: `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
              color: colors.text.primary,
            }}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;