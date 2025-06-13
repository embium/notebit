import { useEffect, useRef, useState } from 'react';
import { useObservable } from '@legendapp/state/react';

// State
import { Chat, currentChat } from '../state/chatsState';

interface UseChatSwitchingResult {
  activeChat: ReturnType<typeof useObservable<Chat | null>>;
  isSwitchingChat: boolean;
}

export function useActiveChatSwitching(): UseChatSwitchingResult {
  const currentChatValue = currentChat.get();

  // Use local observables for active chat state
  const activeChat = useObservable<Chat | null>(currentChatValue);

  // State for initial messages loading
  const [isSwitchingChat, setIsSwitchingChat] = useState(false);
  // State to track the previous chat id to detect changes
  const prevChatIdRef = useRef<string | null>(null);
  // Timeout reference for chat switching
  const switchingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update active chat when current chat changes
  useEffect(() => {
    // No current chat - nothing to do
    if (!currentChatValue) return;

    // First time loading a chat - immediately show it, no transition needed
    if (!prevChatIdRef.current) {
      activeChat.set(currentChatValue);
      prevChatIdRef.current = currentChatValue.id;
      return;
    }

    // If it's the same chat ID, just update the active chat without animation
    if (prevChatIdRef.current === currentChatValue.id) {
      activeChat.set(currentChatValue);
      return;
    }

    // Clear any existing timeout to prevent race conditions
    if (switchingTimeoutRef.current) {
      clearTimeout(switchingTimeoutRef.current);
      switchingTimeoutRef.current = null;
    }

    // At this point we know we're switching to a different chat
    setIsSwitchingChat(true);

    // If the current chat has a recently added user message (like from Notes),
    // we want to show it immediately to avoid confusion
    const hasRecentMessage =
      currentChatValue.messages.length > 0 &&
      currentChatValue.messages[currentChatValue.messages.length - 1].role ===
        'user' &&
      Date.now() -
        (currentChatValue.messages[currentChatValue.messages.length - 1]
          .timestamp || 0) <
        3000;

    // Short transition for better UX
    const transitionTime = hasRecentMessage ? 100 : 500;

    // Set a timeout to simulate loading and ensure clean transition
    switchingTimeoutRef.current = setTimeout(() => {
      // Update the active chat after a delay
      activeChat.set(currentChatValue);
      // End loading state
      setIsSwitchingChat(false);
      // Update the previous chat ID reference
      prevChatIdRef.current = currentChatValue.id;
      // Clear the timeout reference
      switchingTimeoutRef.current = null;
    }, transitionTime);

    // Cleanup function to clear timeout on unmount or before re-running
    return () => {
      if (switchingTimeoutRef.current) {
        clearTimeout(switchingTimeoutRef.current);
        switchingTimeoutRef.current = null;
      }
    };
  }, [currentChatValue, activeChat]);

  return { activeChat, isSwitchingChat };
}
