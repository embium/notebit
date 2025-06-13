/**
 * Theme state management with Legend State
 */
import { observable } from '@legendapp/state';
import { persistObservable } from '@legendapp/state/persist';
import { configureObservablePersistence } from '@legendapp/state/persist';
import { ObservablePersistLocalStorage } from '@legendapp/state/persist-plugins/local-storage';

// Configure the persistence plugin
configureObservablePersistence({
  pluginLocal: ObservablePersistLocalStorage,
});

// Type definitions
export type Theme = 'light' | 'dark' | 'system';
export type AccentColor = 'blue' | 'green' | 'red' | 'orange' | 'slate';
export type FontStyle = 'Montserrat' | 'Raleway' | 'Roboto';

// Interface for theme state
export interface ThemeState {
  theme: Theme;
  accentColor: AccentColor;
  fontSize: number;
  fontStyle: FontStyle;
}

// Create the initial state
const initialState: ThemeState = {
  theme: 'system',
  accentColor: 'blue',
  fontSize: 16,
  fontStyle: 'Montserrat',
};

// Create the observable state
export const themeState = observable<ThemeState>(initialState);

// Setup persistence
persistObservable(themeState, {
  local: 'theme',
});

// Theme state actions - direct property access is more idiomatic with Legend State
export const themeActions = {
  setTheme: (theme: Theme) => themeState.theme.set(theme),
  setAccentColor: (accentColor: AccentColor) =>
    themeState.accentColor.set(accentColor),
  setFontSize: (fontSize: number) => themeState.fontSize.set(fontSize),
  setFontStyle: (fontStyle: FontStyle) => themeState.fontStyle.set(fontStyle),
};
