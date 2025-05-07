import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Loading state component for chat switching
 */
const LoadingStateComponent: React.FC = () => {
  const [dots, setDots] = useState('.');

  // Create an animated loading indicator with moving dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === '...') return '.';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col justify-center items-center p-5 h-full">
      <div className="flex flex-col items-center gap-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="space-y-2 text-center">
          <p className="text-lg font-medium text-foreground">
            Loading messages{dots}
          </p>
          <p className="text-sm text-muted-foreground">
            Just a moment while we fetch your conversation
          </p>
        </div>
      </div>
    </div>
  );
};

export const LoadingState = LoadingStateComponent;
