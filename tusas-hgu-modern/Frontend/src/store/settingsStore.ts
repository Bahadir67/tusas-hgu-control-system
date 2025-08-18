import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Settings interface
interface AppSettings {
  // OPC Hints
  showOpcHints: boolean;
  
  // UI Settings
  theme: 'light' | 'dark' | 'auto';
  language: 'tr' | 'en';
  refreshInterval: number; // milliseconds
  
  // Development Settings
  showDebugInfo: boolean;
  enableDeveloperMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  
  // Alarm Settings
  enableAlarmSounds: boolean;
  alarmVolume: number; // 0-100
  
  // Chart Settings
  chartUpdateInterval: number; // milliseconds
  maxChartDataPoints: number;
  
  // Display Settings
  showUnits: boolean;
  decimalPlaces: number;
  useMetricUnits: boolean;
  
  // Performance Settings
  enableAnimations: boolean;
  enableTransitions: boolean;
  lowLatencyMode: boolean;
}

// Settings store interface
interface SettingsStore extends AppSettings {
  // Actions
  setShowOpcHints: (enabled: boolean) => void;
  setTheme: (theme: AppSettings['theme']) => void;
  setLanguage: (language: AppSettings['language']) => void;
  setRefreshInterval: (interval: number) => void;
  setShowDebugInfo: (enabled: boolean) => void;
  setEnableDeveloperMode: (enabled: boolean) => void;
  setLogLevel: (level: AppSettings['logLevel']) => void;
  setEnableAlarmSounds: (enabled: boolean) => void;
  setAlarmVolume: (volume: number) => void;
  setChartUpdateInterval: (interval: number) => void;
  setMaxChartDataPoints: (points: number) => void;
  setShowUnits: (enabled: boolean) => void;
  setDecimalPlaces: (places: number) => void;
  setUseMetricUnits: (enabled: boolean) => void;
  setEnableAnimations: (enabled: boolean) => void;
  setEnableTransitions: (enabled: boolean) => void;
  setLowLatencyMode: (enabled: boolean) => void;
  
  // Bulk operations
  resetToDefaults: () => void;
  importSettings: (settings: Partial<AppSettings>) => void;
  exportSettings: () => AppSettings;
}

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  // OPC Hints - DEFAULT TRUE for development
  showOpcHints: true,
  
  // UI Settings
  theme: 'dark',
  language: 'tr',
  refreshInterval: 1000, // 1 second
  
  // Development Settings
  showDebugInfo: false,
  enableDeveloperMode: false,
  logLevel: 'info',
  
  // Alarm Settings
  enableAlarmSounds: true,
  alarmVolume: 70,
  
  // Chart Settings
  chartUpdateInterval: 2000, // 2 seconds
  maxChartDataPoints: 100,
  
  // Display Settings
  showUnits: true,
  decimalPlaces: 1,
  useMetricUnits: true,
  
  // Performance Settings
  enableAnimations: true,
  enableTransitions: true,
  lowLatencyMode: false,
};

// Create persisted settings store
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // Initial state from defaults
      ...DEFAULT_SETTINGS,
      
      // Actions
      setShowOpcHints: (enabled: boolean) => 
        set({ showOpcHints: enabled }),
      
      setTheme: (theme: AppSettings['theme']) => 
        set({ theme }),
      
      setLanguage: (language: AppSettings['language']) => 
        set({ language }),
      
      setRefreshInterval: (interval: number) => 
        set({ refreshInterval: Math.max(100, interval) }), // Min 100ms
      
      setShowDebugInfo: (enabled: boolean) => 
        set({ showDebugInfo: enabled }),
      
      setEnableDeveloperMode: (enabled: boolean) => 
        set({ enableDeveloperMode: enabled }),
      
      setLogLevel: (level: AppSettings['logLevel']) => 
        set({ logLevel: level }),
      
      setEnableAlarmSounds: (enabled: boolean) => 
        set({ enableAlarmSounds: enabled }),
      
      setAlarmVolume: (volume: number) => 
        set({ alarmVolume: Math.max(0, Math.min(100, volume)) }),
      
      setChartUpdateInterval: (interval: number) => 
        set({ chartUpdateInterval: Math.max(500, interval) }), // Min 500ms
      
      setMaxChartDataPoints: (points: number) => 
        set({ maxChartDataPoints: Math.max(50, Math.min(1000, points)) }),
      
      setShowUnits: (enabled: boolean) => 
        set({ showUnits: enabled }),
      
      setDecimalPlaces: (places: number) => 
        set({ decimalPlaces: Math.max(0, Math.min(3, places)) }),
      
      setUseMetricUnits: (enabled: boolean) => 
        set({ useMetricUnits: enabled }),
      
      setEnableAnimations: (enabled: boolean) => 
        set({ enableAnimations: enabled }),
      
      setEnableTransitions: (enabled: boolean) => 
        set({ enableTransitions: enabled }),
      
      setLowLatencyMode: (enabled: boolean) => 
        set({ lowLatencyMode: enabled }),
      
      // Bulk operations
      resetToDefaults: () => set({ ...DEFAULT_SETTINGS }),
      
      importSettings: (settings: Partial<AppSettings>) => 
        set((state) => ({ ...state, ...settings })),
      
      exportSettings: () => {
        const state = get();
        // Extract only the settings, not the actions
        const settings: AppSettings = {
          showOpcHints: state.showOpcHints,
          theme: state.theme,
          language: state.language,
          refreshInterval: state.refreshInterval,
          showDebugInfo: state.showDebugInfo,
          enableDeveloperMode: state.enableDeveloperMode,
          logLevel: state.logLevel,
          enableAlarmSounds: state.enableAlarmSounds,
          alarmVolume: state.alarmVolume,
          chartUpdateInterval: state.chartUpdateInterval,
          maxChartDataPoints: state.maxChartDataPoints,
          showUnits: state.showUnits,
          decimalPlaces: state.decimalPlaces,
          useMetricUnits: state.useMetricUnits,
          enableAnimations: state.enableAnimations,
          enableTransitions: state.enableTransitions,
          lowLatencyMode: state.lowLatencyMode,
        };
        return settings;
      },
    }),
    {
      name: 'tusas-hgu-settings', // Storage key
      version: 1,
      
      // Migration function for future versions
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Migrate from version 0 to 1
          return {
            ...DEFAULT_SETTINGS,
            ...persistedState,
          };
        }
        return persistedState;
      },
    }
  )
);

// Utility hook to get specific setting
export const useOpcHints = () => useSettingsStore((state) => state.showOpcHints);
export const useTheme = () => useSettingsStore((state) => state.theme);
export const useLanguage = () => useSettingsStore((state) => state.language);
export const useDebugMode = () => useSettingsStore((state) => state.showDebugInfo);

// Utility function to format values with decimal places from settings
export const formatValue = (value: number, unit?: string): string => {
  const { decimalPlaces, showUnits } = useSettingsStore.getState();
  const formatted = value.toFixed(decimalPlaces);
  return showUnits && unit ? `${formatted} ${unit}` : formatted;
};

// Utility function to check if developer mode is enabled
export const isDeveloperMode = (): boolean => {
  return useSettingsStore.getState().enableDeveloperMode;
};