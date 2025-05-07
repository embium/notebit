import { useState, useCallback } from 'react';

// Types
import { SmartHub } from '@src/shared/types/smartHubs';

// State
import {
  deleteFileFromSmartHub,
  deleteFolderFromSmartHub,
  deleteNoteFromSmartHub,
  getFolderFromSmartHub,
  smartHubsState$,
} from '@/features/smart-hubs/state/smartHubsState';

// Components
import { DeleteItemInfo } from '@/features/smart-hubs/components/DeleteConfirmationDialog/DeleteConfirmationDialog';

interface UseDeleteConfirmationParams {
  smartHubId: string | null;
  onDeleteSmartHub: (smartHubId: string) => void;
}

export const useDeleteConfirmation = ({
  smartHubId,
  onDeleteSmartHub,
}: UseDeleteConfirmationParams) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<DeleteItemInfo | null>(null);
  const smartHub = smartHubsState$.smartHubs
    .get()
    .find((p) => p.id === smartHubId);

  const handleDeleteRequest = useCallback(() => {
    if (!smartHub) return;

    setItemToDelete({
      type: 'smartHub',
      id: smartHub.id,
      name: smartHub.name,
    });
    setIsDeleteDialogOpen(true);
  }, [smartHub]);

  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete || !smartHub) return;

    switch (itemToDelete.type) {
      case 'smartHub':
        onDeleteSmartHub(itemToDelete.id);
        break;
      case 'file':
        deleteFileFromSmartHub(smartHub.id, itemToDelete.id);
        break;
      case 'folder':
        deleteFolderFromSmartHub(smartHub.id, itemToDelete.id);
        break;
      case 'note':
        deleteNoteFromSmartHub(smartHub.id, itemToDelete.id);
        break;
    }
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
  }, [itemToDelete, onDeleteSmartHub, smartHub]);

  const handleDeleteFile = useCallback(
    (fileId: string, fileName: string) => {
      if (!smartHub) return;

      setItemToDelete({
        type: 'file',
        id: fileId,
        name: fileName,
      });
      setIsDeleteDialogOpen(true);
    },
    [smartHub]
  );

  const handleDeleteFolder = useCallback(
    async (folderId: string, folderPath: string) => {
      if (!smartHub) return;

      setItemToDelete({
        type: 'folder',
        id: folderId,
        name: folderPath,
      });

      setIsDeleteDialogOpen(true);
    },
    [smartHub]
  );

  const handleCancelDelete = useCallback(() => {
    setItemToDelete(null);
  }, []);

  return {
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    itemToDelete,
    handleDeleteRequest,
    handleConfirmDelete,
    handleDeleteFile,
    handleDeleteFolder,
    handleCancelDelete,
  };
};
