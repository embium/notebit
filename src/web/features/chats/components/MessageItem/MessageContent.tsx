import React, { useState } from 'react';
import { IoMdFolder } from 'react-icons/io';
import { BookIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { observer } from '@legendapp/state/react';

// Types
import { Message } from '@shared/types/chats';

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
  const { textContent, messageRoleInfo } = useMessageData(message);
  const { roleClass } = messageRoleInfo;
  const [showAllSources, setShowAllSources] = useState(false);

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
        <MarkdownRenderer content={textContent} />

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
                    {
                      hiddenSourcesCount
                    } more
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
