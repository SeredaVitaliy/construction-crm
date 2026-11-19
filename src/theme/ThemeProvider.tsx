import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { App as AntApp, ConfigProvider, theme as antTheme, type ThemeConfig } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { palette } from './tokens';

export type ThemeMode = 'light' | 'dark';

type ThemeState = { mode: ThemeMode; toggle: () => void };

export const ThemeContext = createContext<ThemeState>({ mode: 'light', toggle: () => {} });

const STORAGE_KEY = 'stroytrack-theme';

function readMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    return readSystem();
  }
  return readSystem();
}

function readSystem(): ThemeMode {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const FONT = "'Golos Text', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

function buildTheme(mode: ThemeMode): ThemeConfig {
  const dark = mode === 'dark';
  return {
    algorithm: dark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
    token: {
      fontFamily: FONT,
      colorPrimary: dark ? '#4A8BC2' : palette.steel,
      colorInfo: dark ? '#4A8BC2' : palette.steel,
      colorSuccess: palette.moss,
      colorWarning: '#D08A00',
      colorError: palette.rebar,
      colorTextBase: dark ? '#E4E8EA' : palette.ink,
      colorBgLayout: dark ? '#10171C' : palette.concrete,
      colorBgContainer: dark ? '#18222A' : '#FFFFFF',
      colorBorderSecondary: dark ? '#26323B' : '#E1E4E0',
      borderRadius: 6,
      borderRadiusLG: 10,
      fontSize: 14,
    },
    components: {
      Layout: { siderBg: palette.graphite, headerBg: 'transparent', bodyBg: dark ? '#10171C' : palette.concrete },
      Card: { headerFontSize: 16 },
      Table: { headerBg: dark ? '#1C2730' : '#F6F7F5', headerColor: dark ? '#9AA7AF' : '#5B6870' },
      Segmented: { itemSelectedBg: dark ? '#26323B' : '#FFFFFF' },
    },
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(readMode);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      return;
    }
  }, [mode]);

  const toggle = useCallback(() => setMode((m) => (m === 'dark' ? 'light' : 'dark')), []);
  const value = useMemo(() => ({ mode, toggle }), [mode, toggle]);

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider locale={ruRU} theme={buildTheme(mode)}>
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
