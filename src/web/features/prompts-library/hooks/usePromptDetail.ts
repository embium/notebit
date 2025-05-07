import { useState } from 'react';

// State
import { usePromptsLibrary } from './usePromptsLibrary';

// Utils
import { copyToClipboard } from '@/features/prompts-library/utils/clipboard';

// Types
import { Prompt } from '@shared/types/promptsLibrary';

interface UsePromptDetailParams {
  promptId: string | null;
  onDeletePrompt: (promptId: string) => void;
}

export const usePromptDetail = ({
  promptId,
  onDeletePrompt,
}: UsePromptDetailParams) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { getPromptById } = usePromptsLibrary();

  // Get the prompt from state
  const prompt = promptId ? getPromptById(promptId) : null;

  // Handle copying prompt to clipboard
  const handleCopyPrompt = (promptText: string) => {
    copyToClipboard(promptText, 'Prompt copied to clipboard');
  };

  // Handle delete request
  const handleDeleteRequest = () => {
    setIsDeleteDialogOpen(true);
  };

  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (prompt) {
      onDeletePrompt(prompt.id);
      setIsDeleteDialogOpen(false);
    }
  };

  return {
    prompt,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    handleCopyPrompt,
    handleDeleteRequest,
    handleConfirmDelete,
  };
};
