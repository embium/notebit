import React from 'react';

export const EmptyPromptState: React.FC = () => {
  return (
    <div className="flex flex-col h-full justify-center items-center p-8 text-center">
      <div className="text-muted-foreground">
        <div className="text-xl mb-2">No prompt selected</div>
        <p>Select a prompt from the sidebar or create a new one</p>
      </div>
    </div>
  );
};
