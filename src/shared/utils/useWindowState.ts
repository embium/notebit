import { useState, useEffect } from 'react';
import { trpcProxyClient } from '@shared/config/index';

/**
 * Hook to get and track window maximized state
 * @returns {Object} Window state object with isMaximized property and toggle function
 */
export function useWindowState() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get initial state and set up polling
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    async function checkMaximizedState() {
      try {
        const maximized = await trpcProxyClient.window.isMaximized.query();
        if (mounted) {
          setIsMaximized(!!maximized);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to get window maximized state:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    // Check initial state
    checkMaximizedState();

    // Set up polling to check state periodically (not ideal but works reliably)
    const intervalId = setInterval(checkMaximizedState, 500);

    // Clean up
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  // Toggle window maximized state
  const toggleMaximized = async () => {
    try {
      await trpcProxyClient.window.maximize.mutate();
      // State will be updated by the polling
    } catch (error) {
      console.error('Failed to toggle window state:', error);
    }
  };

  return {
    isMaximized,
    toggleMaximized,
    isLoading,
  };
}
