import React from 'react';
import { observer } from '@legendapp/state/react';

// Utils
import { cn } from '@src/renderer/utils';

interface ModelListSectionProps {
  title: string;
  titleClassName?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Component for rendering a section of models with a header
 */
const ModelListSectionComponent: React.FC<ModelListSectionProps> = ({
  title,
  titleClassName,
  className,
  children,
}) => {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h4
          className={cn(
            'text-sm font-medium uppercase tracking-wide',
            titleClassName
          )}
        >
          {title}
        </h4>
        <div className="h-0.5 flex-1 bg-muted/30 ml-3"></div>
      </div>
      {children}
    </div>
  );
};

export const ModelListSection = observer(ModelListSectionComponent);
