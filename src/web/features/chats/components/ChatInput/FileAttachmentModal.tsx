import React, { useState, useRef } from 'react';
import { observer } from '@legendapp/state/react';
import {
  FiFile,
  FiUpload,
  FiPaperclip,
  FiCheck,
  FiMoreVertical,
} from 'react-icons/fi';
import { GrDetach } from 'react-icons/gr';
import { PiSelectionPlus, PiSelectionSlash } from 'react-icons/pi';

// UI Components
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Modal } from '@/components/ui/modal';

// Utils
import { cn } from '@/shared/utils';

// Types
import { FileWithPreview } from '@shared/types/common';

// Services
import { supportedTextFileTypes } from '@src/shared/services/supportedFiles';

// State
import {
  addFilesToChat,
  chatsState$,
  updateFilesInChat,
} from '@/features/chats/state/chatsState';

interface FileAttachmentModalProps {
  selectedFiles: FileWithPreview[];
  documentsAvailable: FileWithPreview[];
}

/**
 * Format file size in KB or MB
 */
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
};

/**
 * Modal for attaching document files to messages
 */
const FileAttachmentModalComponent: React.FC<FileAttachmentModalProps> = ({
  selectedFiles,
  documentsAvailable,
}) => {
  const currentChatId = chatsState$.currentChatId.get();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownMoreOpen, setIsDropdownMoreOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const triggerButtonRef = useRef<HTMLDivElement>(null);
  const triggerButtonDropdownMoreRef = useRef<HTMLDivElement>(null);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const selectAllFiles = () => {
    updateFilesInChat({
      chatId: currentChatId,
      files: selectedFiles.map((file) => ({ ...file, selected: true })),
    });

    setIsDropdownMoreOpen(false);
  };

  const deselectAllFiles = () => {
    updateFilesInChat({
      chatId: currentChatId,
      files: selectedFiles.map((file) => ({ ...file, selected: false })),
    });

    setIsDropdownMoreOpen(false);
  };

  const detachAllFiles = () => {
    updateFilesInChat({
      chatId: currentChatId,
      files: [],
    });

    setIsDropdownMoreOpen(false);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleFileChange', e.target.files);
    if (e.target.files && e.target.files.length > 0) {
      console.log('files', e.target.files);
      const files = Array.from(e.target.files);
      addFiles(files);

      // Clear the input value to allow reselecting the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Add files to selected files state
  const addFiles = (files: File[]) => {
    const newFiles = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      selected: true,
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }));

    const updatedFiles = [...selectedFiles, ...newFiles];

    // Remove duplicates
    const uniqueFiles = updatedFiles.filter(
      (file, index, self) =>
        index === self.findIndex((t) => t.file.name === file.file.name)
    );

    addFilesToChat({
      chatId: currentChatId,
      files: uniqueFiles,
    });
  };

  // Toggle selection of file
  const toggleFileSelection = (id: string) => {
    updateFilesInChat({
      chatId: currentChatId,
      files: selectedFiles.map((file) =>
        file.id === id ? { ...file, selected: !file.selected } : file
      ),
    });
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      addFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const hasFiles = documentsAvailable.length > 0;

  return (
    <>
      <div
        style={{ position: 'relative', display: 'inline-block' }}
        ref={triggerButtonRef}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={openModal}
          className="h-8 w-8 p-0"
          title="Attach files"
        >
          <FiPaperclip className="h-4 w-4" />
        </Button>

        <Modal
          visible={isModalOpen}
          onClose={closeModal}
          asDropdown={true}
          dropdownPosition="top"
          anchorEl={triggerButtonRef.current}
          width="450px"
          height="500px"
          maxHeight="500px"
          className="rounded-md border border-gray-200 dark:border-gray-800 shadow-md bg-card flex flex-col"
        >
          <div className="flex items-center justify-between border-b">
            <div className="flex flex-1">
              <h2 className="p-2 font-medium">Document Attachments</h2>
            </div>

            {documentsAvailable.length > 0 && (
              <>
                <div
                  className="relative inline-block"
                  ref={triggerButtonDropdownMoreRef}
                >
                  <Modal
                    visible={isDropdownMoreOpen}
                    onClose={() => setIsDropdownMoreOpen(false)}
                    asDropdown={true}
                    width="auto"
                    height="auto"
                    maxWidth="none"
                    dropdownPosition="bottom"
                    anchorEl={triggerButtonDropdownMoreRef.current}
                    className="rounded-md border border-gray-200 dark:border-gray-800 shadow-md bg-card whitespace-nowrap"
                  >
                    <div className="flex flex-col gap-2 p-2">
                      <div
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded-sm"
                        onClick={selectAllFiles}
                      >
                        <PiSelectionPlus className="flex-shrink-0" />
                        <span className="text-sm">Select All Files</span>
                      </div>
                      <div
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded-sm"
                        onClick={deselectAllFiles}
                      >
                        <PiSelectionSlash className="flex-shrink-0" />
                        <span className="text-sm">Deselect All Files</span>
                      </div>
                      <Separator className="border" />
                      <div
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded-sm text-red-500"
                        onClick={detachAllFiles}
                      >
                        <GrDetach className="flex-shrink-0" />
                        <span className="text-sm">Remove All Files</span>
                      </div>
                    </div>
                  </Modal>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mr-2"
                  onClick={() => setIsDropdownMoreOpen(true)}
                  disabled={!hasFiles}
                >
                  <FiMoreVertical />
                </Button>
              </>
            )}
          </div>

          <div className="p-4 flex-1 flex flex-col overflow-hidden">
            <div className="flex flex-col h-full">
              {documentsAvailable.length > 0 ? (
                <>
                  <div className="flex flex-col h-full overflow-hidden">
                    <div className="overflow-y-auto p-1 mb-2 pr-2">
                      <div className="flex flex-col gap-2">
                        {documentsAvailable.map((file) => (
                          <div
                            key={file.id}
                            className={cn(
                              'relative rounded-md overflow-hidden border p-2',
                              file.selected
                                ? 'border-primary bg-primary/10'
                                : 'border-gray-200 dark:border-gray-700'
                            )}
                            onClick={() => toggleFileSelection(file.id)}
                          >
                            <div className="flex items-center">
                              <div
                                className={cn(
                                  'w-5 h-5 rounded-full flex items-center justify-center mr-3',
                                  file.selected
                                    ? 'bg-primary'
                                    : 'bg-gray-200 dark:bg-gray-700'
                                )}
                              >
                                {file.selected && (
                                  <FiCheck className="text-white text-xs" />
                                )}
                              </div>
                              <FiFile className="mr-2" />
                              <div className="flex-1 truncate">
                                {file.file.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatFileSize(file.file.size)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-auto">
                      <div
                        className="flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md p-2 text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        onClick={() => {
                          fileInputRef.current?.click();
                        }}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                      >
                        Drag-and-drop or browse more...
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div
                  className="flex flex-col items-center justify-center border-2 border-dashed rounded-md p-4 transition-colors hover:border-gray-400 dark:hover:border-gray-600 text-center cursor-pointer h-full"
                  onClick={() => {
                    console.log('clicked empty state');
                    fileInputRef.current?.click();
                  }}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <FiUpload className="h-10 w-10 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Drag and drop documents here
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      or click to browse
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 max-w-xs">
                      Add any text file, PDF, or document file.
                    </p>
                  </div>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
                accept={supportedTextFileTypes.join(',')}
              />
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
};

export const FileAttachmentModal = observer(FileAttachmentModalComponent);
