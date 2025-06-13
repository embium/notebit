import React from 'react';

// UI Components
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { observer } from '@legendapp/state/react';

export interface DeleteItemInfo {
  type: 'file' | 'folder' | 'note' | 'smartHub';
  id: string;
  name: string;
}

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  itemToDelete: DeleteItemInfo | null;
  onConfirmDelete: () => void;
  onCancel: () => void;
}

const DeleteConfirmationDialogComponent: React.FC<
  DeleteConfirmationDialogProps
> = ({ isOpen, onOpenChange, itemToDelete, onConfirmDelete, onCancel }) => {
  if (!itemToDelete) return null;

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={onOpenChange}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete{' '}
            {itemToDelete.type === 'smartHub' ? 'Smart Hub' : itemToDelete.type}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {itemToDelete.type === 'smartHub' ? (
              <>
                Are you sure you want to delete "{itemToDelete.name}"? This
                action cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to remove "{itemToDelete.name}" from this
                Smart Hub? This will not delete the original {itemToDelete.type}
                .
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {itemToDelete.type === 'smartHub' ? 'Delete' : 'Remove'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const DeleteConfirmationDialog = observer(
  DeleteConfirmationDialogComponent
);
