'use client';

import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from '@/context/AuthContext';
import { FileProvider } from '@/context/FileContext';
import { MobileMenuProvider } from '@/context/MobileMenuContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FileProvider>
          <MobileMenuProvider>
            {children}
          </MobileMenuProvider>
        </FileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
} 