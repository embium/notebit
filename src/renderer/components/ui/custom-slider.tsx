import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@src/renderer/utils';

/**
 * A custom slider component with explicit styling to ensure track visibility
 * Works with both CSS variable and non-CSS variable themes
 */
export const CustomSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
  // Determine values to render thumbs for
  const values = React.useMemo(() => {
    if (props.defaultValue) {
      return Array.isArray(props.defaultValue)
        ? props.defaultValue
        : [props.defaultValue];
    }
    if (props.value) {
      return Array.isArray(props.value) ? props.value : [props.value];
    }
    return [0];
  }, [props.defaultValue, props.value]);

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        'relative flex w-full touch-none select-none items-center',
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        className={cn(
          'relative h-1.5 w-full grow overflow-hidden rounded-full',
          // Use both explicit tailwind classes and CSS variables
          'bg-slate-200 dark:bg-slate-800'
        )}
      >
        <SliderPrimitive.Range
          className={cn(
            'absolute h-full',
            // Use both explicit tailwind classes and CSS variables
            'bg-slate-900 dark:bg-slate-50'
          )}
        />
      </SliderPrimitive.Track>
      {values.map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          className={cn(
            'block h-4 w-4 rounded-full border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
            // Use both explicit tailwind classes and CSS variables
            'border-slate-900 bg-white ring-slate-950 focus-visible:ring-slate-950 dark:border-slate-50 dark:bg-slate-950 dark:ring-slate-300 dark:focus-visible:ring-slate-300'
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
});

CustomSlider.displayName = SliderPrimitive.Root.displayName;
