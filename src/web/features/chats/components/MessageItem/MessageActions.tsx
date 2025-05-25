import React, { useState } from 'react';
import {
  FiCopy,
  FiEdit,
  FiRefreshCcw,
  FiTrash2,
  FiCheck,
} from 'react-icons/fi';
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
import { DeleteMessageDialog } from '../dialogs/DeleteMessageDialog';

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Handle copying message content to clipboard
  const handleCopyContent = () => {
    navigator.clipboard
      .writeText(messageContent)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 1500);
      })
      .catch((error) => toast.error('Error copying to clipboard'));
  };

  // Handle delete message confirmation
  const handleDeleteConfirm = () => {
    if (onDeleteMessage) {
      onDeleteMessage(messageId);
    }
    setIsDeleteDialogOpen(false);
  };

  // Handle delete dialog cancel
  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
  };

  return (
    <div className="message-actions flex gap-1 py-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 relative"
              onClick={handleCopyContent}
              disabled={isCopied}
            >
              {isCopied ? (
                <FiCheck className="h-3.5 w-3.5 text-green-500 animate-in fade-in zoom-in duration-300" />
              ) : (
                <FiCopy className="h-3.5 w-3.5" />
              )}
              <span className="sr-only">{isCopied ? 'Copied' : 'Copy'}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isCopied ? 'Copied!' : 'Copy'}</TooltipContent>
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
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <FiTrash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Delete</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>

      <DeleteMessageDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
};

export const MessageActions = observer(MessageActionsComponent);
