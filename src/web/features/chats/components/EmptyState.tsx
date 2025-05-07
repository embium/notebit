import React from 'react';

const EmptyStateComponent: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="max-w-md space-y-4">
        <h3 className="text-xl font-semibold">No messages yet</h3>
        <p className="text-muted-foreground">
          Start a conversation by typing a message below.
        </p>
      </div>
    </div>
  );
};

export const EmptyState = EmptyStateComponent;
