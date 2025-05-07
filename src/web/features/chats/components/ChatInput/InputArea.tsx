import React from 'react';

// UI Components
import { Button } from '@/components/ui/button';

interface InputAreaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  isSendDisabled: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

/**
 * Component for chat text input area and send button
 */
const InputAreaComponent: React.FC<InputAreaProps> = ({
  value,
  onChange,
  onKeyDown,
  onSend,
  isSendDisabled,
  textareaRef,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="Type your message here..."
          className="h-[60px] appearance-none border-none bg-transparent focus:ring-0 focus:outline-none text-sm font-medium text-foreground w-full resize-none p-1"
        />
      </div>
    </div>
  );
};

export const InputArea = InputAreaComponent;
