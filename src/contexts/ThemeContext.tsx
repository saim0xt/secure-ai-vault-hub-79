
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    loadThemeSettings();
  }, []);

  useEffect(() => {
    applyTheme();
  }, [theme]);

  const loadThemeSettings = async () => {
    try {
      const themeResult = await Preferences.get({ key: 'vaultix_theme' });
      if (themeResult.value && (themeResult.value === 'light' || themeResult.value === 'dark')) {
        setThemeState(themeResult.value as Theme);
      }
    } catch (error) {
      console.error('Error loading theme settings:', error);
    }
  };

  const setTheme = async (newTheme: Theme) => {
    try {
      await Preferences.set({ key: 'vaultix_theme', value: newTheme });
      setThemeState(newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const applyTheme = () => {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
