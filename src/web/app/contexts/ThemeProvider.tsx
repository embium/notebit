import { useEffect } from 'react';
import {
  Theme,
  AccentColor,
  FontStyle,
  themeState,
  setTheme as setThemeValue,
  setAccentColor as setAccentValue,
  setFontSize as setFontSizeValue,
  setFontStyle as setFontStyleValue,
} from '@/app/styles/themeState';
import { observer, useObservable } from '@legendapp/state/react';

interface ThemeProviderProps {
  children: React.ReactNode;
}

// Function to apply theme classes and styles
const applyTheme = (
  currentTheme: Theme,
  currentAccent: AccentColor,
  currentFontSize: number,
  currentFontStyle: FontStyle
) => {
  const root = window.document.documentElement;
  const body = window.document.body;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark =
    currentTheme === 'dark' || (currentTheme === 'system' && prefersDark);

  // Set theme class on the root element (html) only - this is what shadcn/ui expects
  if (isDark) {
    root.classList.add('dark');
    root.classList.remove('light');
    body.classList.add('dark');
    body.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
    body.classList.add('light');
    body.classList.remove('dark');
  }

  // Handle accent color - first remove all accent classes
  const accentPrefix = 'theme-';
  const accentClasses: string[] = []; // Explicitly type as string array
  root.classList.forEach((className) => {
    if (className.startsWith(accentPrefix)) {
      accentClasses.push(className);
    }
  });

  // Remove all accent classes at once
  if (accentClasses.length > 0) {
    root.classList.remove(...accentClasses);
    body.classList.remove(...accentClasses);
  }

  // Add the new accent class
  const accentClass = `${accentPrefix}${currentAccent}`;
  root.classList.add(accentClass);
  body.classList.add(accentClass);

  // Debug: Log after changing accent classes
  console.log(`After accent change - classList: ${root.classList.toString()}`);

  // Set font size
  root.style.fontSize = `${currentFontSize}px`;

  // Handle font style - first remove all font style classes
  const fontClasses = [
    'font-family-montserrat',
    'font-family-raleway',
    'font-family-roboto',
  ];

  // Remove font classes from both html and body elements
  fontClasses.forEach((cls) => {
    root.classList.remove(cls);
    body.classList.remove(cls);

    // Also try to remove from any container elements that might be using these classes
    const containers = document.querySelectorAll('.app-container, #root, main');
    containers.forEach((container) => {
      if (container.classList.contains(cls)) {
        container.classList.remove(cls);
      }
    });
  });

  // Add the new font style class
  let fontClass = '';
  switch (currentFontStyle) {
    case 'Montserrat':
      fontClass = 'font-family-montserrat';
      break;
    case 'Raleway':
      fontClass = 'font-family-raleway';
      break;
    case 'Roboto':
      fontClass = 'font-family-roboto';
      break;
  }

  if (fontClass) {
    // Apply to both html and body for maximum compatibility
    root.classList.add(fontClass);
    body.classList.add(fontClass);

    // Also try to apply to main container elements
    const containers = document.querySelectorAll('.app-container, #root, main');
    containers.forEach((container) => {
      container.classList.add(fontClass);
    });

    console.log(
      `Applied font class: ${fontClass} to HTML, BODY, and container elements`
    );
  }
};

export const ThemeProvider = observer(({ children }: ThemeProviderProps) => {
  // Get current theme settings using Legend State
  const theme = themeState.theme.get();
  const accentColor = themeState.accentColor.get();
  const fontSize = themeState.fontSize.get();
  const fontStyle = themeState.fontStyle.get();

  // Apply theme whenever state changes
  useEffect(() => {
    applyTheme(theme, accentColor, fontSize, fontStyle);
  }, [theme, accentColor, fontSize, fontStyle]);

  // Listener specifically for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      // Only re-apply if the theme is set to 'system'
      if (theme === 'system') {
        console.log(
          `System preference changed: ${mediaQuery.matches ? 'dark' : 'light'}. Re-applying theme.`
        );
        applyTheme(theme, accentColor, fontSize, fontStyle);
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    // Apply initial theme settings correctly on mount
    // This ensures system theme is checked immediately
    applyTheme(theme, accentColor, fontSize, fontStyle);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme, accentColor, fontSize, fontStyle]);

  return <>{children}</>;
});

// Helper functions using the store instead of hooks
export function setTheme(theme: Theme) {
  setThemeValue(theme);
}

export function setAccentColor(color: AccentColor) {
  setAccentValue(color);
}

export function setFontSize(size: number) {
  setFontSizeValue(size);
}

export function setFontStyle(style: FontStyle) {
  setFontStyleValue(style);
}
