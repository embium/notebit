import {
  useRef,
  useCallback,
  useMemo,
  KeyboardEvent,
  ChangeEvent,
} from 'react';

interface UseTextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  isLoading?: boolean;
  selectedModelExists?: boolean;
}

/**
 * Hook that manages text input for chat messages
 * Handles input changes, keyboard shortcuts, and sending messages
 */
export function useTextInput({
  value,
  onChange,
  onSend,
  isLoading = false,
  selectedModelExists = true,
}: UseTextInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Memoize send button disabled state
  const isSendDisabled = useMemo(() => {
    return isLoading || !value.trim() || !selectedModelExists;
  }, [isLoading, value, selectedModelExists]);

  // Handle input value changes
  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  // Handle send button click or keyboard submission
  const handleSend = useCallback(() => {
    if (!isSendDisabled) {
      // Ensure focus moves away from the input field
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      onSend(value);
    }
  }, [onSend, isSendDisabled, value]);

  // Handle keyboard events (Enter to submit)
  const handleKeyPress = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !isSendDisabled) {
        e.preventDefault();
        // Debounce the send operation slightly to prevent double-sends
        setTimeout(() => {
          handleSend();
        }, 10);
      }
    },
    [isSendDisabled, handleSend]
  );

  return {
    textareaRef,
    isSendDisabled,
    handleInputChange,
    handleKeyPress,
    handleSend,
  };
}
