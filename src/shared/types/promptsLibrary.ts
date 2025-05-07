export interface Prompt {
  id: string;
  name: string;
  role: 'user' | 'system';
  tags: string[];
  prompt: string;
  bookmarked: boolean;
}

// Types for the settings state
export interface PromptsLibraryState {
  /**
   * The prompts
   */
  prompts: Prompt[];
}
