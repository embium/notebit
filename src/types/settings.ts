/**
 * Types related to application settings
 */

// Layout settings interface
export interface LayoutSettings {
  middleSidebarWidth: number;
  notesTabScrollPosition: number;
}

// Types for the settings state
export interface GeneralSettingsState {
  /**
   * Whether to enable link clicking
   */
  enableLinks: boolean;

  /**
   * Whether to generate chat titles
   */
  shouldGenerateChatTitles: boolean;

  /**
   * The directory for notes
   */
  notesDirectory: string;
}

// Default prompts types
export type PromptType =
  | 'system'
  | 'title'
  | 'note'
  | 'smartHubs'
  | 'fileAttachments';

export interface DefaultPrompts {
  system: string;
  title: string;
  note: string;
  smartHubs: string;
  fileAttachments: string;
}
