/**
 * FontStyleSelector component for selecting font style
 */
import React, { useCallback } from 'react';
import { themeState, FontStyle, themeActions } from '@/app/styles/themeState';
import { cn } from '@/shared/utils';
import { observer } from '@legendapp/state/react';
import { Button } from '@/components/ui/button';

/**
 * Props for the FontStyleSelector component
 */
interface FontStyleSelectorProps {}

/**
 * Component for selecting application font style
 */
const FontStyleSelectorComponent: React.FC<FontStyleSelectorProps> = () => {
  // Use Legend State for font style
  const currentFontStyle = themeState.fontStyle.get();

  const handleFontStyleChange = useCallback((fontStyle: FontStyle) => {
    themeActions.setFontStyle(fontStyle);
  }, []);

  return (
    <div className="mt-6">
      <h4 className="text-foreground font-medium text-base m-0 mb-3">
        Font Style
      </h4>
      <div className="flex w-full gap-2.5 justify-between mt-2.5">
        {/* Montserrat */}
        <Button
          variant="outline"
          onClick={() => handleFontStyleChange('Montserrat')}
          className={cn(
            'flex-1 flex items-center justify-center h-9 rounded border transition-colors duration-200',
            currentFontStyle === 'Montserrat'
              ? 'border-primary text-primary'
              : 'border-border text-foreground'
          )}
          style={{ fontFamily: 'Montserrat' }} // Inline style to prevent global style interference
        >
          <span className="text-sm font-medium">Montserrat</span>
        </Button>

        {/* Raleway */}
        <Button
          variant="outline"
          onClick={() => handleFontStyleChange('Raleway')}
          className={cn(
            'flex-1 flex items-center justify-center h-9 rounded border transition-colors duration-200',
            currentFontStyle === 'Raleway'
              ? 'border-primary text-primary'
              : 'border-border text-foreground'
          )}
          style={{ fontFamily: 'Raleway' }} // Inline style to prevent global style interference
        >
          <span className="text-sm font-medium">Raleway</span>
        </Button>

        {/* Roboto */}
        <Button
          variant="outline"
          onClick={() => handleFontStyleChange('Roboto')}
          className={cn(
            'flex-1 flex items-center justify-center h-9 rounded border transition-colors duration-200',
            currentFontStyle === 'Roboto'
              ? 'border-primary text-primary'
              : 'border-border text-foreground'
          )}
          style={{ fontFamily: 'Roboto' }} // Inline style to prevent global style interference
        >
          <span className="text-sm font-medium">Roboto</span>
        </Button>
      </div>
    </div>
  );
};

export const FontStyleSelector = observer(FontStyleSelectorComponent);
