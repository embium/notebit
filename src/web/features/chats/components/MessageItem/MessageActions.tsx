import React from 'react';
import { FiCopy, FiEdit, FiRefreshCcw, FiTrash2 } from 'react-icons/fi';
import { toast } from 'sonner';
import { observer } from '@legendapp/state/react';

// UI Components
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

interface MessageActionsProps {
  messageId: string;
  messageContent: string;
  isUserMessage: boolean;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onResendMessage?: (messageId: string) => void;
}

const MessageActionsComponent: React.FC<MessageActionsProps> = ({
  messageId,
  messageContent,
  isUserMessage,
  onEditMessage,
  onDeleteMessage,
  onResendMessage,
}) => {
  // Handle copying message content to clipboard
  const handleCopyContent = () => {
    navigator.clipboard
      .writeText(messageContent)
      .catch((error) => toast.error('Error copying to clipboard'));
  };

  return (
    <div className="message-actions flex gap-1 py-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopyContent}
            >
              <FiCopy className="h-3.5 w-3.5" />
              <span className="sr-only">Copy</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>

        {isUserMessage && onEditMessage && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onEditMessage(messageId)}
              >
                <FiEdit className="h-3.5 w-3.5" />
                <span className="sr-only">Edit</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
        )}

        {isUserMessage && onResendMessage && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onResendMessage(messageId)}
              >
                <FiRefreshCcw className="h-3.5 w-3.5" />
                <span className="sr-only">Resend</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Resend</TooltipContent>
          </Tooltip>
        )}

        {onDeleteMessage && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onDeleteMessage(messageId)}
              >
                <FiTrash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Delete</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  );
};

export const MessageActions = observer(MessageActionsComponent);
