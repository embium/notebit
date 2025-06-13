import { useEffect } from 'react';
import {
  Theme,
  AccentColor,
  FontStyle,
  themeState,
} from '@/app/styles/themeState';
import { observer } from '@legendapp/state/react';

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Applies theme settings to the document by manipulating CSS classes and styles.
 * This function handles:
 * 1. Setting light/dark mode classes based on theme selection or system preference
 * 2. Applying accent color classes after removing any existing accent classes
 * 3. Setting the base font size at the root level
 * 4. Applying font family classes after removing any existing font classes
 */
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

  // Set theme class on the root element (html) and body
  // This ensures proper theming for both shadcn/ui components and custom styling
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

  // Handle accent color - first identify and collect all existing accent classes
  const accentPrefix = 'theme-';
  const accentClasses: string[] = []; // Explicitly type as string array
  root.classList.forEach((className) => {
    if (className.startsWith(accentPrefix)) {
      accentClasses.push(className);
    }
  });

  // Remove all accent classes at once (batch operation for better performance)
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

  // Set font size at the root level to affect all relative font sizing
  root.style.fontSize = `${currentFontSize}px`;

  // Handle font style - define all possible font classes for removal
  const fontClasses = [
    'font-family-montserrat',
    'font-family-raleway',
    'font-family-roboto',
  ];

  // Remove all possible font classes from both html and body elements
  // as well as from any key container elements
  fontClasses.forEach((cls) => {
    root.classList.remove(cls);
    body.classList.remove(cls);

    // Also remove from container elements that might be using these classes
    const containers = document.querySelectorAll('.app-container, #root, main');
    containers.forEach((container) => {
      if (container.classList.contains(cls)) {
        container.classList.remove(cls);
      }
    });
  });

  // Determine the appropriate font class based on the selected font style
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
    // Apply font class to both root and body elements for maximum compatibility
    root.classList.add(fontClass);
    body.classList.add(fontClass);

    // Also apply to main container elements to ensure consistent font usage
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

  // Apply theme whenever any theme-related state changes
  useEffect(() => {
    applyTheme(theme, accentColor, fontSize, fontStyle);
  }, [theme, accentColor, fontSize, fontStyle]);

  // Dedicated listener for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      // Only re-apply theme if currently using system preference
      if (theme === 'system') {
        console.log(
          `System preference changed: ${mediaQuery.matches ? 'dark' : 'light'}. Re-applying theme.`
        );
        applyTheme(theme, accentColor, fontSize, fontStyle);
      }
    };

    // Add event listener for system preference changes
    mediaQuery.addEventListener('change', handleChange);

    // Apply initial theme settings on component mount
    // This ensures system theme is checked immediately
    applyTheme(theme, accentColor, fontSize, fontStyle);

    // Clean up event listener on component unmount
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme, accentColor, fontSize, fontStyle]);

  return <>{children}</>;
});

// NOTE: For theme updates, import and use the actions directly from '@/app/styles/themeState':
// import { setTheme, setAccentColor, setFontSize, setFontStyle } from '@/app/styles/themeState';
