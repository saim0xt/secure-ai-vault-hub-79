
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';

export type Theme = 'light' | 'dark' | 'amoled' | 'custom';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  customColors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
  };
  setCustomColors: (colors: Partial<ThemeContextType['customColors']>) => void;
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
  const [customColors, setCustomColorsState] = useState({
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    background: '#000000',
    surface: '#1F1F1F',
    text: '#FFFFFF',
  });

  useEffect(() => {
    loadThemeSettings();
  }, []);

  useEffect(() => {
    applyTheme();
  }, [theme, customColors]);

  const loadThemeSettings = async () => {
    try {
      const [themeResult, colorsResult] = await Promise.all([
        Preferences.get({ key: 'vaultix_theme' }),
        Preferences.get({ key: 'vaultix_custom_colors' })
      ]);

      if (themeResult.value) {
        setThemeState(themeResult.value as Theme);
      }

      if (colorsResult.value) {
        setCustomColorsState(JSON.parse(colorsResult.value));
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

  const setCustomColors = async (colors: Partial<ThemeContextType['customColors']>) => {
    try {
      const newColors = { ...customColors, ...colors };
      await Preferences.set({ key: 'vaultix_custom_colors', value: JSON.stringify(newColors) });
      setCustomColorsState(newColors);
    } catch (error) {
      console.error('Error saving custom colors:', error);
    }
  };

  const applyTheme = () => {
    const root = document.documentElement;
    
    switch (theme) {
      case 'light':
        root.style.setProperty('--background', '255 255 255');
        root.style.setProperty('--foreground', '0 0 0');
        root.style.setProperty('--card', '255 255 255');
        root.style.setProperty('--primary', '59 130 246');
        break;
      case 'dark':
        root.style.setProperty('--background', '0 0 0');
        root.style.setProperty('--foreground', '255 255 255');
        root.style.setProperty('--card', '31 31 31');
        root.style.setProperty('--primary', '59 130 246');
        break;
      case 'amoled':
        root.style.setProperty('--background', '0 0 0');
        root.style.setProperty('--foreground', '255 255 255');
        root.style.setProperty('--card', '0 0 0');
        root.style.setProperty('--primary', '139 92 246');
        break;
      case 'custom':
        // Convert hex to RGB for CSS variables
        const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? 
            `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : 
            '0 0 0';
        };
        
        root.style.setProperty('--background', hexToRgb(customColors.background));
        root.style.setProperty('--foreground', hexToRgb(customColors.text));
        root.style.setProperty('--card', hexToRgb(customColors.surface));
        root.style.setProperty('--primary', hexToRgb(customColors.primary));
        break;
    }
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      customColors,
      setCustomColors,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
