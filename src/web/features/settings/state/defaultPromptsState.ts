import { observable } from '@legendapp/state';
import { persistObservable } from '@legendapp/state/persist';

// Types
import { DefaultPrompts } from '@shared/types/settings';

// Initialize with default values
const defaultSystemPrompt = `You are an AI assistant helping the user with their notes and ideas.
Be concise, helpful, and suggest connections between topics when appropriate.
Prioritize clarity and accuracy in your responses.`;

const defaultTitlePrompt = `Generate a concise and descriptive title for the following chat. The title should only contain 3-6 short words and reflect the main topic or purpose of the initial chat message. Do not provide any punctuation or other formatting.`;

const defaultNotePrompt = `Please review the following note.

Consider:
- The main topics and themes
- Any questions or problems presented
- Connections to existing knowledge

Provide insights, answer questions, or suggest improvements as appropriate.`;

// Create the observable state
export const defaultPromptsState$ = observable<DefaultPrompts>({
  system: defaultSystemPrompt,
  title: defaultTitlePrompt,
  note: defaultNotePrompt,
});

// Configure persistence
persistObservable(defaultPromptsState$, {
  local: 'notebit-default-prompts',
});
