/**
 * Prompts Library state management with Legend State
 */
import { observable } from '@legendapp/state';
import { persistObservable } from '@legendapp/state/persist';

// Data
import prompts from '@/features/prompts-library/data/prompts.json';

// Types
import { Prompt, PromptsLibraryState } from '@src/types/promptsLibrary';

// ===========================================
// State Definition
// ===========================================

// Create the initial state
const initialState: PromptsLibraryState = {
  prompts: [],
};

// Create the observable state
export const promptsLibraryState$ =
  observable<PromptsLibraryState>(initialState);

// Configure persistence
persistObservable(promptsLibraryState$, {
  local: 'prompts-library',
});

// ===========================================
// Selectors
// ===========================================

/**
 * Get all prompts
 */
export const getAllPrompts = (): Prompt[] => {
  return promptsLibraryState$.prompts.get();
};

/**
 * Get a prompt by id
 */
export const getPromptById = (id: string): Prompt | undefined => {
  return promptsLibraryState$.prompts.get().find((p) => p.id === id);
};

/**
 * Get prompts by role
 */
export const getPromptsByRole = (role: 'system' | 'user'): Prompt[] => {
  return promptsLibraryState$.prompts.get().filter((p) => p.role === role);
};

/**
 * Get prompts by tag
 */
export const getPromptsByTag = (tag: string): Prompt[] => {
  return promptsLibraryState$.prompts
    .get()
    .filter((p) =>
      p.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
    );
};

/**
 * Get bookmarked prompts
 */
export const getBookmarkedPrompts = (): Prompt[] => {
  return promptsLibraryState$.prompts.get().filter((p) => p.bookmarked);
};

// ===========================================
// Actions
// ===========================================

/**
 * Initialize prompts with default data
 */
export const initializePrompts = (): void => {
  const newPrompts = prompts.map((prompt) => ({
    ...prompt,
    id: prompt.name,
    bookmarked: false,
    role: prompt.role as 'user' | 'system',
    tags: (prompt.tags as string).split(', '),
  }));
  promptsLibraryState$.prompts.set(newPrompts);
};

/**
 * Add a new prompt
 */
export function addPrompt(prompt: Prompt): void {
  promptsLibraryState$.prompts.get().push(prompt);
}

/**
 * Update an existing prompt
 */
export function updatePrompt(prompt: Prompt): void {
  const index = promptsLibraryState$.prompts
    .get()
    .findIndex((p) => p.id === prompt.id);
  if (index !== -1) {
    promptsLibraryState$.prompts[index].set(prompt);
  }
}

/**
 * Delete a prompt by ID
 */
export function deletePrompt(promptId: string): void {
  const index = promptsLibraryState$.prompts
    .get()
    .findIndex((p) => p.id === promptId);

  if (index !== -1) {
    promptsLibraryState$.prompts.splice(index, 1);
  }
}

/**
 * Toggle bookmark status for a prompt
 */
export function toggleBookmark(promptId: string): void {
  const index = promptsLibraryState$.prompts
    .get()
    .findIndex((p) => p.id === promptId);

  if (index !== -1) {
    promptsLibraryState$.prompts[index].bookmarked.set(
      !promptsLibraryState$.prompts[index].bookmarked.get()
    );
  }
}
