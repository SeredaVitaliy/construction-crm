import { useContext } from 'react';
import { ThemeContext } from './ThemeProvider';

export const useThemeMode = () => useContext(ThemeContext);
