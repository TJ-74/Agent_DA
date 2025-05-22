'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  colors: {
    primary: {
      from: string;
      to: string;
    };
    background: {
      primary: string;
      card: string;
      input: string;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    border: {
      light: string;
    };
  };
}

const lightColors = {
  primary: {
    from: '#2563eb',
    to: '#4f46e5',
  },
  background: {
    primary: '#ffffff',
    card: 'rgba(255, 255, 255, 0.8)',
    input: '#f3f4f6',
  },
  text: {
    primary: '#111827',
    secondary: '#374151',
    muted: '#6B7280',
  },
  border: {
    light: '#e5e7eb',
  },
};

const darkColors = {
  primary: {
    from: '#4f46e5',
    to: '#2563eb',
  },
  background: {
    primary: '#111827',
    card: 'rgba(17, 24, 39, 0.8)',
    input: '#1f2937',
  },
  text: {
    primary: '#f3f4f6',
    secondary: '#d1d5db',
    muted: '#9CA3AF',
  },
  border: {
    light: '#374151',
  },
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
  colors: lightColors,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Check if theme preference exists in localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    // Save theme preference to localStorage
    localStorage.setItem('theme', theme);
    // Update document class for global styles
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}; 