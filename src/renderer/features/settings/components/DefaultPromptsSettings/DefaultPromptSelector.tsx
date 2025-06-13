import React from 'react';
import { observer } from '@legendapp/state/react';

// UI Components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Types
import { PromptType } from '@src/types/settings';

// State
import { promptTypeLabels } from '@shared/constants';

interface DefaultPromptSelectorProps {
  selectedPromptType: PromptType;
  onSelectPromptType: (promptType: PromptType) => void;
}

const DefaultPromptSelectorComponent: React.FC<DefaultPromptSelectorProps> =
  observer(({ selectedPromptType, onSelectPromptType }) => {
    return (
      <div className="w-full">
        <Select
          value={selectedPromptType}
          onValueChange={(value) => onSelectPromptType(value as PromptType)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a prompt to edit" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(promptTypeLabels).map(([type, label]) => (
              <SelectItem
                key={type}
                value={type}
              >
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  });

export const DefaultPromptSelector = observer(DefaultPromptSelectorComponent);
