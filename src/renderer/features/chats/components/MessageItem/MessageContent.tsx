import React, { useState } from 'react';
import { IoMdFolder } from 'react-icons/io';
import {
  BookIcon,
  ChevronDown,
  ChevronUp,
  BrainIcon,
  Loader2,
} from 'lucide-react';
import { observer } from '@legendapp/state/react';

// Types
import { Message } from '@src/types/chats';

// Components
import MarkdownRenderer from '@/components/markdown';

// Hooks
import { useMessageData } from '@/features/chats/hooks/useMessageData';

interface MessageContentProps {
  message: Message;
  isExpanded?: boolean;
}

// Function to display a smart hub name in a more readable way
const formatSmartHubName = (
  hubName: string
): { fileName: string; hubName: string | null } => {
  // Check if the format is "filename (hubname)"
  const matches = hubName.match(/(.*)\s+\((.*)\)$/);
  if (matches && matches.length >= 3) {
    return {
      fileName: matches[1],
      hubName: matches[2],
    };
  }
  return {
    fileName: hubName,
    hubName: null,
  };
};

const MessageContentComponent: React.FC<MessageContentProps> = ({
  message,
  isExpanded = true,
}) => {
  // Use our custom hook to get optimized message data
  const { textContent, reasoningSections, messageRoleInfo } =
    useMessageData(message);
  const { roleClass } = messageRoleInfo;
  const [showAllSources, setShowAllSources] = useState(false);
  const [expandedReasonings, setExpandedReasonings] = useState<number[]>([]);

  // Toggle reasoning section visibility
  const toggleReasoning = (index: number) => {
    setExpandedReasonings((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  // Function to render content with reasoning toggles
  const renderContentWithReasoning = () => {
    if (reasoningSections.length === 0) {
      return <MarkdownRenderer content={textContent} />;
    }

    // Split by reasoning markers and render each part
    const parts = textContent.split(/(__REASONING_\d+__)/);

    return (
      <>
        {parts.map((part, index) => {
          // Check if this part is a reasoning marker
          const reasoningMatch = part.match(/__REASONING_(\d+)__/);

          if (reasoningMatch) {
            const reasoningIndex = parseInt(reasoningMatch[1], 10);
            const reasoningData = reasoningSections[reasoningIndex];
            const isExpanded = expandedReasonings.includes(reasoningIndex);

            return (
              <div
                key={`reasoning-${reasoningIndex}`}
                className="my-2"
              >
                <button
                  onClick={() => toggleReasoning(reasoningIndex)}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 rounded px-2 py-1 transition-colors"
                >
                  <BrainIcon className="h-3.5 w-3.5" />
                  Reasoning
                  {!reasoningData.isComplete && (
                    <Loader2 className="h-3 w-3 animate-spin ml-1" />
                  )}
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3 ml-auto" />
                  ) : (
                    <ChevronDown className="h-3 w-3 ml-auto" />
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-1 pl-2 border-l-2 border-primary/20 text-muted-foreground">
                    <MarkdownRenderer content={reasoningData.content} />
                    {!reasoningData.isComplete && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center">
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        Thinking...
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }

          // Regular content
          return part ? (
            <MarkdownRenderer
              key={index}
              content={part}
            />
          ) : null;
        })}
      </>
    );
  };

  if (!isExpanded) {
    return null;
  }

  // Prepare sources to display
  const sources = message.usedSmartHubs || [];
  const hasSmartHubs = sources.length > 0;
  const MAX_VISIBLE_SOURCES = 3;
  const displaySources = showAllSources
    ? sources
    : sources.slice(0, MAX_VISIBLE_SOURCES);
  const hiddenSourcesCount = Math.max(0, sources.length - MAX_VISIBLE_SOURCES);

  return (
    <div data-message-id={message.id}>
      <div className={`message-content ${roleClass}`}>
        {renderContentWithReasoning()}

        {hasSmartHubs && (
          <div className="mt-2 text-xs text-muted-foreground">
            <div className="flex flex-col border border-border/50 rounded-md px-2 py-1 bg-background/50">
              <div className="flex items-center gap-1">
                <IoMdFolder className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">Sources:</span>
              </div>

              <div className="flex flex-wrap gap-1 mt-1 ml-1">
                {displaySources.map((hub, index) => {
                  const { fileName, hubName } = formatSmartHubName(hub);
                  return (
                    <span
                      key={index}
                      className="inline-flex items-center bg-muted px-2 py-0.5 rounded text-xs"
                      title={hub} // Show full name on hover
                    >
                      <BookIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span className="truncate max-w-[150px]">{fileName}</span>
                      {hubName && (
                        <span className="text-primary ml-1 font-medium">
                          ({hubName})
                        </span>
                      )}
                    </span>
                  );
                })}

                {hiddenSourcesCount > 0 && !showAllSources && (
                  <button
                    onClick={() => setShowAllSources(true)}
                    className="inline-flex items-center bg-muted/50 hover:bg-muted px-2 py-0.5 rounded text-xs"
                  >
                    <ChevronDown className="h-3 w-3 mr-1" />
                    {hiddenSourcesCount} more
                  </button>
                )}

                {showAllSources && sources.length > MAX_VISIBLE_SOURCES && (
                  <button
                    onClick={() => setShowAllSources(false)}
                    className="inline-flex items-center bg-muted/50 hover:bg-muted px-2 py-0.5 rounded text-xs"
                  >
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Show less
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const MessageContent = observer(MessageContentComponent);
