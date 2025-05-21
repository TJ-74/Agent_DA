export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
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
  primary: {
    from: string;
    to: string;
  };
}

export const getThemeColors = (mode: ThemeMode): ThemeColors => {
  if (mode === 'dark') {
    return {
      background: {
        primary: '#111827',
        card: '#1F2937',
        input: '#374151',
      },
      text: {
        primary: '#F9FAFB',
        secondary: '#D1D5DB',
        muted: '#9CA3AF',
      },
      border: {
        light: '#374151',
      },
      primary: {
        from: '#F59E0B',
        to: '#D97706',
      },
    };
  }

  // Light theme
  return {
    background: {
      primary: '#F9FAFB',
      card: '#FFFFFF',
      input: '#F3F4F6',
    },
    text: {
      primary: '#111827',
      secondary: '#4B5563',
      muted: '#6B7280',
    },
    border: {
      light: '#E5E7EB',
    },
    primary: {
      from: '#F59E0B',
      to: '#D97706',
    },
  };
}; 