import React, { useEffect } from 'react';
import { useUpdateSubscription } from '@src/renderer/hooks/useUpdateSubscription';

interface UpdateProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that initializes and manages application update functionality
 * Subscribes to update events and makes them available throughout the application
 */
export function UpdateProvider({ children }: UpdateProviderProps) {
  // Initialize the update subscription hook
  useUpdateSubscription();

  // Check for updates when the app starts
  useEffect(() => {
    // Add a small delay to ensure the application is fully loaded
    const timer = setTimeout(() => {
      // We don't need to call checkForUpdates here as it's already called in main.ts
      // This provider just ensures the subscription is active to receive events
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Simply render children - this component just initializes the subscription
  return <>{children}</>;
}
