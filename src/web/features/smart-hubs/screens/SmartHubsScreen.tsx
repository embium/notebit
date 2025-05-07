import React, { useEffect } from 'react';
import { observer, useSelector } from '@legendapp/state/react';

// Components
import { SmartHubHeader } from '@/features/smart-hubs/components/SmartHubHeader/SmartHubHeader';
import { FilesSection } from '@/features/smart-hubs/components/FilesSection/FilesSection';
import { FoldersSection } from '@/features/smart-hubs/components/FoldersSection/FoldersSection';
import { SmartHubFooter } from '@/features/smart-hubs/components/SmartHubFooter/SmartHubFooter';
import { DeleteConfirmationDialog } from '@/features/smart-hubs/components/DeleteConfirmationDialog/DeleteConfirmationDialog';

// Hooks
import { useSmartHubFiles } from '@/features/smart-hubs/hooks/useSmartHubFiles';
import { useSmartHubFolders } from '@/features/smart-hubs/hooks/useSmartHubFolders';
import { useDeleteConfirmation } from '@/features/smart-hubs/hooks/useDeleteConfirmation';
import { useComposition } from '@/features/smart-hubs/hooks/useComposition';

// Types
import { SmartHub } from '@src/shared/types/smartHubs';

interface SmartHubsScreenProps {
  smartHubId: string | null;
  onEdit: (smartHub: SmartHub) => void;
  onDelete: (smartHubId: string) => void;
}

export const SmartHubsScreenComponent: React.FC<SmartHubsScreenProps> = ({
  smartHubId,
  onEdit,
  onDelete,
}) => {
  // Use extracted hooks
  const {
    handleBrowseFiles,
    handleFileChange,
    fileInputRef,
    supportedTextFileTypes,
  } = useSmartHubFiles(smartHubId);
  const { handleBrowseFolders } = useSmartHubFolders(smartHubId);
  const {
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    itemToDelete,
    handleDeleteRequest,
    handleConfirmDelete,
    handleDeleteFile,
    handleDeleteFolder,
    handleCancelDelete,
  } = useDeleteConfirmation({
    smartHubId,
    onDeleteSmartHub: onDelete,
  });
  const {
    isComposing,
    abortComposingRef,
    handleCompose,
    handleSaveAsDraft,
    resetState,
  } = useComposition(smartHubId);

  // Reset abort state when smart hub changes
  useEffect(() => {
    resetState();
  }, [smartHubId, resetState]);

  if (!smartHubId) {
    return (
      <div className="flex flex-col h-full justify-center items-center p-8 text-center">
        <div className="text-muted-foreground">
          <div className="text-xl mb-2">No Smart Hub selected</div>
          <p>Select a Smart Hub from the sidebar or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full overflow-auto">
        {/* Header with title and actions */}
        <SmartHubHeader
          smartHubId={smartHubId}
          onEdit={onEdit}
          onDelete={handleDeleteRequest}
        />

        {/* Content area with files, folders and notes */}
        <div className="flex-1 overflow-y-auto">
          {/* Files section */}
          <FilesSection
            smartHubId={smartHubId}
            onBrowseFiles={handleBrowseFiles}
            onDeleteFile={handleDeleteFile}
          />

          {/* Folders section */}
          <FoldersSection
            smartHubId={smartHubId}
            onBrowseFolders={handleBrowseFolders}
            onDeleteFolder={handleDeleteFolder}
          />

          {/* Notes section is commented out in the original code */}
        </div>

        {/* Footer controls */}
        <SmartHubFooter
          isComposing={isComposing}
          onCompose={handleCompose}
          onSaveAsDraft={handleSaveAsDraft}
        />
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
        accept={supportedTextFileTypes.join(',')}
      />

      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        itemToDelete={itemToDelete}
        onConfirmDelete={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
};

export const SmartHubsScreen = observer(SmartHubsScreenComponent);
