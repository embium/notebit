import React from 'react';

const NoticeStateComponent: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="max-w-md space-y-4">
        <h3 className="text-xl font-semibold text-amber-500">
          No model selected
        </h3>
        <p className="text-muted-foreground">
          Please select a model in settings to start a conversation.
        </p>
      </div>
    </div>
  );
};

export const NoticeState = NoticeStateComponent;
