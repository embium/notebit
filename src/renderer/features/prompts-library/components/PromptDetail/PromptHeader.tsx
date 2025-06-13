import React from 'react';
import { Trash, Pencil } from 'lucide-react';
import { FiClipboard } from 'react-icons/fi';

// UI Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Types
import { Prompt } from '@src/types/promptsLibrary';

interface PromptHeaderProps {
  prompt: Prompt;
  onCopyPrompt: (promptText: string) => void;
  onEditPrompt: (prompt: Prompt) => void;
  onDeleteRequest: () => void;
}

const PromptHeaderComponent: React.FC<PromptHeaderProps> = ({
  prompt,
  onCopyPrompt,
  onEditPrompt,
  onDeleteRequest,
}) => {
  return (
    <div className="p-5 flex justify-between items-center border-b border-border">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{prompt.name}</h1>
        <Badge
          variant="outline"
          className={`px-2 py-1 ${
            prompt.role === 'system'
              ? 'text-rose-500 border-rose-500'
              : 'text-sky-500 border-sky-500'
          }`}
        >
          {prompt.role === 'system' ? 'SYSTEM PROMPT' : 'USER PROMPT'}
        </Badge>
      </div>

      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCopyPrompt(prompt.prompt)}
        >
          <FiClipboard className="h-4 w-4 mr-2" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEditPrompt(prompt)}
        >
          <Pencil className="h-4 w-4 mr-2" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeleteRequest}
        >
          <Trash className="h-4 w-4 mr-2" />
        </Button>
      </div>
    </div>
  );
};

export const PromptHeader = PromptHeaderComponent;
