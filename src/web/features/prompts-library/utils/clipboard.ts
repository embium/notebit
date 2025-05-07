import { toast } from 'sonner';

/**
 * Copies text to clipboard and shows a toast notification
 */
export const copyToClipboard = (
  text: string,
  successMessage = 'Copied to clipboard'
): void => {
  navigator.clipboard.writeText(text);
  toast.success(successMessage);
};
