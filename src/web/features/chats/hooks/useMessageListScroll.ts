import { useCallback, useEffect, useRef, useState } from 'react';
import { debounce } from 'lodash';

// Types
import { Message } from '@shared/types/chats';

interface UseMessageListScrollResult {
  containerRef: React.RefObject<HTMLDivElement>;
  shouldAutoScroll: boolean;
  setShouldAutoScroll: (value: boolean) => void;
  scrollToBottom: () => void;
}

export function useMessageListScroll(
  messages: Message[]
): UseMessageListScrollResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const lastMessageRef = useRef<string | null>(null);
  const isAutoScrollingRef = useRef(false);

  // Reset auto-scroll when conversation changes (based on first message ID)
  useEffect(() => {
    if (
      messages.length > 0 &&
      (!lastMessageRef.current || lastMessageRef.current !== messages[0].id)
    ) {
      lastMessageRef.current = messages[0].id;
      setShouldAutoScroll(true);
    }
  }, [messages]);

  // Function to determine if we're near the bottom
  const isNearBottom = useCallback(() => {
    if (!containerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // Consider "near bottom" if within 100px of the bottom
    return scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  // Handle user scrolling with debounce to improve performance
  const handleScroll = useCallback(
    debounce(() => {
      if (!containerRef.current || isAutoScrollingRef.current) return;

      // Update auto-scroll state based on scroll position
      const shouldScroll = isNearBottom();
      setShouldAutoScroll(shouldScroll);
    }, 100),
    [isNearBottom]
  );

  // Setup scroll event listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => {
        handleScroll.cancel();
        container.removeEventListener('scroll', handleScroll);
      };
    }
    return () => handleScroll.cancel();
  }, [handleScroll]);

  // Optimized scroll to bottom function that works with virtualization
  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use requestAnimationFrame for smoother scrolling
    requestAnimationFrame(() => {
      isAutoScrollingRef.current = true;

      // For Virtuoso component, this will be handled differently
      // but we keep this for compatibility with both virtualized and non-virtualized lists
      container.scrollTop = container.scrollHeight;

      // Reset the flag after scrolling completes
      setTimeout(() => {
        isAutoScrollingRef.current = false;
      }, 100);
    });
  }, []);

  // Auto-scroll when new messages are added and shouldAutoScroll is true
  useEffect(() => {
    if (shouldAutoScroll && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, shouldAutoScroll, scrollToBottom]);

  return {
    containerRef,
    shouldAutoScroll,
    setShouldAutoScroll,
    scrollToBottom,
  };
}
