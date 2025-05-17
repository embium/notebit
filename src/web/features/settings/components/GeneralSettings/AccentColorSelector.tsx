/**
 * AccentColorSelector component for selecting accent colors
 */
import React, { useCallback } from 'react';
import { FiCheck } from 'react-icons/fi';
import { observer } from '@legendapp/state/react';

// Utils
import { cn } from '@/shared/utils';

// State
import { themeState, AccentColor, themeActions } from '@/app/styles/themeState';

/**
 * Props for the AccentColorSelector component
 */
interface AccentColorSelectorProps {}

// Define accent colors with direct background color styles
const accentColors: { name: AccentColor; style: React.CSSProperties }[] = [
  { name: 'blue', style: { backgroundColor: 'hsl(174, 42%, 40%)' } },
  { name: 'green', style: { backgroundColor: 'hsl(120, 25%, 45%)' } },
  { name: 'red', style: { backgroundColor: 'hsl(10, 60%, 45%)' } },
  { name: 'orange', style: { backgroundColor: 'hsl(28, 60%, 45%)' } },
  { name: 'slate', style: { backgroundColor: 'hsl(280, 20%, 40%)' } },
];

/**
 * Component for selecting accent colors
 */
const AccentColorSelectorComponent: React.FC<AccentColorSelectorProps> = () => {
  // Use Legend State for accent color
  const currentAccentColor = themeState.accentColor.get();

  const handleAccentColorChange = useCallback((colorName: AccentColor) => {
    themeActions.setAccentColor(colorName);
  }, []);

  return (
    <div className="mt-6">
      <h4 className="text-foreground font-medium text-base m-0 mb-3">
        Accent Color
      </h4>
      <div className="flex items-center gap-2.5 mt-2.5">
        {accentColors.map(({ name, style }) => (
          <button
            key={name}
            onClick={() => handleAccentColorChange(name)}
            style={style}
            className={cn(
              'w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-200',
              currentAccentColor === name
                ? 'border-white'
                : 'border-transparent hover:border-white/50'
            )}
          >
            {currentAccentColor === name && (
              <FiCheck
                size={16}
                className="text-white" // Checkmark color usually white on solid accent
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export const AccentColorSelector = observer(AccentColorSelectorComponent);
