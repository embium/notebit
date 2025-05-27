import React, { useState } from 'react';
import { observer } from '@legendapp/state/react';
import { useObservable } from '@legendapp/state/react';

// Components
import { DefaultPromptSelector } from '@/features/settings/components/DefaultPromptsSettings/DefaultPromptSelector';
import { PromptEditor } from '@/features/settings/components/DefaultPromptsSettings/PromptEditor';

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Types
import { PromptType } from '@src/shared/types/settings';

// Constants
import { promptTypeLabels } from '@shared/constants';

// State
import { defaultPromptsState$ } from '@/features/settings/state/defaultPromptsState';

/**
 * Default Prompts Settings section
 */
const DefaultPromptsSettingsComponent: React.FC = () => {
  // Local state for the selected prompt type
  const [promptType, setPromptType] = useState<PromptType>('system');

  // Use the defaultPromptsState
  const prompts = useObservable(defaultPromptsState$);

  // Handler for updating prompts
  const handlePromptChange = (value: string) => {
    defaultPromptsState$[promptType].set(value);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Default Prompts</CardTitle>
          <CardDescription>
            Select a prompt type to edit. These prompts will be used as defaults
            for various AI interactions.
          </CardDescription>
          <div className="pt-2">
            <DefaultPromptSelector
              selectedPromptType={promptType}
              onSelectPromptType={setPromptType}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <h3 className="text-md font-semibold">
              {promptTypeLabels[promptType]}
            </h3>
            <PromptEditor
              value={prompts[promptType].get()}
              onChange={handlePromptChange}
              placeholder={`Enter your ${promptTypeLabels[promptType].toLowerCase()} here...`}
            />
            <p className="text-xs text-muted-foreground pt-2">
              {promptType === 'system' &&
                'This system prompt will be used by default when starting new chat sessions.'}
              {promptType === 'title' &&
                'This prompt will be used to generate titles for new chat sessions.'}
              {promptType === 'note' &&
                'This prompt will be used when sending note content to the chat. Use [NOTE_CONTENT] as a placeholder for the note content.'}
              {promptType === 'fileAttachments' &&
                'This prompt will be used when sending file attachments to the chat. Use [FILE_ATTACHMENTS] as a placeholder for the file attachments.'}
              {promptType === 'smartHubs' &&
                'This prompt will be used when sending smart hubs documents to the chat. Use [SMART_HUBS_DOCUMENTS] as a placeholder for the smart hubs documents.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const DefaultPromptsSettings = observer(DefaultPromptsSettingsComponent);
