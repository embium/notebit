import React from 'react';
import { observer } from '@legendapp/state/react';

// UI Components
import { Textarea } from '@/components/ui/textarea';

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const PromptEditorComponent: React.FC<PromptEditorProps> = observer(
  ({ value, onChange, placeholder }) => {
    return (
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[300px] font-mono text-sm"
        spellCheck={false}
      />
    );
  }
);

export const PromptEditor = observer(PromptEditorComponent);
