// State
import {
  addPrompt,
  updatePrompt,
  deletePrompt,
  toggleBookmark,
  getAllPrompts,
  getPromptById as getPromptByIdSelector,
  getPromptsByRole,
  getPromptsByTag,
  getBookmarkedPrompts,
} from '@/features/prompts-library/state';

// Types
import { Prompt } from '@shared/types/promptsLibrary';

/**
 * Hook for accessing and managing prompts library functionality
 */
export const usePromptsLibrary = () => {
  /**
   * Get a prompt by its ID
   */
  const getPromptById = (id: string | null): Prompt | undefined => {
    if (!id) return undefined;
    return getPromptByIdSelector(id);
  };

  return {
    // Selectors
    prompts: getAllPrompts(),
    getPromptById,
    getPromptsByRole,
    getPromptsByTag,
    getBookmarkedPrompts,

    // Actions
    addPrompt,
    updatePrompt,
    deletePrompt,
    toggleBookmark,
  };
};
