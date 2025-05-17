import React, { useCallback } from 'react';
import { observer } from '@legendapp/state/react';
import { FiSun, FiMoon, FiMonitor } from 'react-icons/fi';

// Utils
import { cn } from '@/shared/utils';

// State
import { themeState, Theme, themeActions } from '@/app/styles/themeState';

// UI Components
import { Button } from '@/components/ui/button';

/**
 * Props for the ThemeSelector component
 */
interface ThemeSelectorProps {}

/**
 * Component for selecting the theme appearance (light/dark/system)
 */
const ThemeSelectorComponent: React.FC<ThemeSelectorProps> = observer(() => {
  // Use Legend State for theme state
  const currentTheme = themeState.theme.get();

  const handleThemeChange = useCallback((themeName: Theme) => {
    themeActions.setTheme(themeName);
  }, []);

  return (
    <>
      <h4 className="text-foreground font-medium text-base m-0 mb-3">Theme</h4>
      <div className="flex w-full gap-2.5 justify-between mt-2.5">
        {/* Light Theme */}
        <Button
          variant="outline"
          onClick={() => handleThemeChange('light')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 h-9 rounded border transition-colors duration-200',
            currentTheme === 'light'
              ? 'border-primary text-primary'
              : 'border-border text-foreground'
          )}
        >
          <FiSun size={16} />
          <span className="text-sm font-medium">Light</span>
        </Button>

        {/* Dark Theme */}
        <Button
          variant="outline"
          onClick={() => handleThemeChange('dark')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 h-9 rounded border transition-colors duration-200',
            currentTheme === 'dark'
              ? 'border-primary text-primary'
              : 'border-border text-foreground'
          )}
        >
          <FiMoon size={16} />
          <span className="text-sm font-medium">Dark</span>
        </Button>

        {/* System Theme */}
        <Button
          variant="outline"
          onClick={() => handleThemeChange('system')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 h-9 rounded border transition-colors duration-200',
            currentTheme === 'system'
              ? 'border-primary text-primary'
              : 'border-border text-foreground'
          )}
        >
          <FiMonitor size={16} />
          <span className="text-sm font-medium">System</span>
        </Button>
      </div>
    </>
  );
});

export const ThemeSelector = observer(ThemeSelectorComponent);
