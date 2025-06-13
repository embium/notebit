/**
 * FontSizeControl component for adjusting font size
 */
import React, { useCallback } from 'react';
import { FiMinus, FiPlus } from 'react-icons/fi';
import { observer } from '@legendapp/state/react';

// UI Components
import { Button } from '@/components/ui/button';

// State
import { themeState, themeActions } from '@/app/styles/themeState';

/**
 * Props for the FontSizeControl component
 */
interface FontSizeControlProps {}

/**
 * Component for controlling application font size
 */
const FontSizeControlComponent: React.FC<FontSizeControlProps> = () => {
  // Use Legend State for font size
  const currentFontSize = themeState.fontSize.get();

  const handleDecreaseFontSize = useCallback(() => {
    const newSize = Math.max(12, currentFontSize - 1); // Calculate new size based on current state
    themeActions.setFontSize(newSize);
  }, [currentFontSize]);

  const handleIncreaseFontSize = useCallback(() => {
    const newSize = Math.min(24, currentFontSize + 1); // Calculate new size based on current state
    themeActions.setFontSize(newSize);
  }, [currentFontSize]);

  return (
    <div className="mt-6">
      <h4 className="font-medium text-base m-0 mb-3">Font Size</h4>
      <div className="flex items-center mt-2.5">
        <Button
          variant="outline"
          onClick={handleDecreaseFontSize}
          className="w-9 h-9 border border-border rounded flex justify-center items-center bg-transparent hover:bg-muted/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
          disabled={currentFontSize <= 12} // Disable if at min size
        >
          <FiMinus
            size={16}
            className="text-primary"
          />
        </Button>

        <div className="h-9 min-w-[60px] border border-border border-l-[3px] border-l-primary flex justify-center items-center mx-2 px-3 bg-card">
          <span className="text-center text-foreground text-sm">
            {currentFontSize}px {/* Display current value */}
          </span>
        </div>

        <Button
          variant="outline"
          onClick={handleIncreaseFontSize}
          className="w-9 h-9 border border-border rounded flex justify-center items-center bg-transparent hover:bg-muted/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
          disabled={currentFontSize >= 24} // Disable if at max size
        >
          <FiPlus
            size={16}
            className="text-primary"
          />
        </Button>
      </div>
    </div>
  );
};

export const FontSizeControl = observer(FontSizeControlComponent);
