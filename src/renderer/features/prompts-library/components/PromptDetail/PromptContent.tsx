import React from 'react';

// UI Components
import { Badge } from '@/components/ui/badge';

// Types
import { Prompt } from '@src/types/promptsLibrary';

interface PromptContentProps {
  prompt: Prompt;
}

const PromptContentComponent: React.FC<PromptContentProps> = ({ prompt }) => {
  return (
    <div className="flex-1 overflow-y-auto p-5">
      {/* Tags */}
      {prompt.tags.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center mb-2">
            <div className="text-sm font-medium text-muted-foreground">
              Tags
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {prompt.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="px-2 py-1"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Prompt content */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Prompt</h2>
        </div>
        <div className="bg-muted/40 p-5 rounded-lg whitespace-pre-wrap text-foreground/90 border border-border">
          {prompt.prompt}
        </div>
      </div>
    </div>
  );
};

export const PromptContent = PromptContentComponent;
