/**
 * Default Prompts state management with Legend State
 */
import { observable } from '@legendapp/state';
import { persistObservable } from '@legendapp/state/persist';

// TRPC
import { trpcProxyClient } from '@shared/config/index';

// Types
import {
  FileSource,
  FolderSource,
  SmartHub,
  SmartHubsState,
} from '@src/types/smartHubs';

// Create the initial state
const initialState: SmartHubsState = {
  smartHubs: [],
  knowledgeGraphEnabled: false,
};

// Create the observable state
export const smartHubsState$ = observable<SmartHubsState>(initialState);

// Configure persistence
persistObservable(smartHubsState$, {
  local: 'smarthubs',
});

// Add a prompt
export function addSmartHub(smartHub: SmartHub) {
  smartHubsState$.smartHubs.get().push(smartHub);
}

// Update a prompt
export function updateSmartHub(smartHub: SmartHub) {
  const index = smartHubsState$.smartHubs
    .get()
    .findIndex((p) => p.id === smartHub.id);
  if (index !== -1) {
    smartHubsState$.smartHubs[index].set(smartHub);
  }
}

export function updateSmartHubFile(smartHubId: string, file: FileSource) {
  const index = smartHubsState$.smartHubs
    .get()
    .findIndex((p) => p.id === smartHubId);
  const itemIndex = smartHubsState$.smartHubs[index].files
    .get()
    .findIndex((f) => f.id === file.id);
  if (index !== -1) {
    smartHubsState$.smartHubs[index].files[itemIndex].set(file);
  }
}

export function addOrUpdateSmartHubFolder(
  smartHubId: string,
  folder: FolderSource
) {
  const index = smartHubsState$.smartHubs
    .get()
    .findIndex((p) => p.id === smartHubId);
  const itemIndex = smartHubsState$.smartHubs[index].folders
    .get()
    .findIndex((f) => f.id === folder.id);
  if (index !== -1) {
    if (itemIndex !== -1) {
      smartHubsState$.smartHubs[index].folders[itemIndex].set(folder);
    } else {
      smartHubsState$.smartHubs[index].folders.push(folder);
    }
  }
}

// Delete a prompt
export function deleteSmartHub(smartHubId: string) {
  const index = smartHubsState$.smartHubs
    .get()
    .findIndex((p) => p.id === smartHubId);
  if (index !== -1) {
    trpcProxyClient.smartHubs.clearCollection.mutate(smartHubId);
    trpcProxyClient.smartHubs.deleteSmartHubDocuments.mutate(smartHubId);
    smartHubsState$.smartHubs.splice(index, 1);
  }
}

// Get a prompt by id
export function getSmartHubById(id: string) {
  const smartHubs = smartHubsState$.smartHubs.get().find((p) => p.id === id);
  return smartHubs;
}

export function getSmartHubFiles(smartHubId: string) {
  const smartHub = smartHubsState$.smartHubs
    .get()
    .find((p) => p.id === smartHubId);
  if (smartHub) {
    return smartHub.files;
  }
  return null;
}

export function getAllSmartHubs() {
  return smartHubsState$.smartHubs.get();
}

// Toggle bookmark for a prompt
export function toggleBookmark(smartHubId: string) {
  const index = smartHubsState$.smartHubs
    .get()
    .findIndex((p) => p.id === smartHubId);
  if (index !== -1) {
    smartHubsState$.smartHubs[index].bookmarked.set(
      !smartHubsState$.smartHubs[index].bookmarked.get()
    );
  }
}

// Delete a file from a Smart Hub
export async function deleteFileFromSmartHub(
  smartHubId: string,
  fileId: string
) {
  const index = smartHubsState$.smartHubs
    .get()
    .findIndex((p) => p.id === smartHubId);

  if (index !== -1) {
    const fileIndex = smartHubsState$.smartHubs[index].files
      .get()
      .findIndex((f) => f.id === fileId);

    if (fileIndex !== -1) {
      smartHubsState$.smartHubs[index].files.splice(fileIndex, 1);
    }

    await trpcProxyClient.smartHubs.deleteDocumentVectors.mutate({
      smartHubId: smartHubId,
      itemId: fileId,
    });

    await trpcProxyClient.smartHubs.deleteDocumentFromKnowledgeGraph.mutate(
      fileId
    );
  }
}

export function getFolderFromSmartHub(smartHubId: string, folderId: string) {
  const index = smartHubsState$.smartHubs
    .get()
    .findIndex((p) => p.id === smartHubId);
  return smartHubsState$.smartHubs[index].folders
    .get()
    .find((f) => f.id === folderId);
}

export function getSmartHubFolders(smartHubId: string) {
  const index = smartHubsState$.smartHubs
    .get()
    .findIndex((p) => p.id === smartHubId);
  return smartHubsState$.smartHubs[index].folders.get();
}

// Delete a folder from a Smart Hub
export async function deleteFolderFromSmartHub(
  smartHubId: string,
  folderId: string
) {
  const index = smartHubsState$.smartHubs
    .get()
    .findIndex((p) => p.id === smartHubId);

  if (index !== -1) {
    const folderIndex = smartHubsState$.smartHubs[index].folders
      .get()
      .findIndex((f) => f.id === folderId);

    if (folderIndex !== -1) {
      smartHubsState$.smartHubs[index].folders[folderIndex].items
        .get()
        .forEach(async (item) => {
          await trpcProxyClient.smartHubs.deleteDocumentVectors.mutate({
            smartHubId: smartHubId,
            itemId: item.id,
          });
          await trpcProxyClient.smartHubs.deleteDocumentFromKnowledgeGraph.mutate(
            item.id
          );
        });
      smartHubsState$.smartHubs[index].folders.splice(folderIndex, 1);
    }
  }

  await trpcProxyClient.smartHubs.deleteDocumentVectors.mutate({
    smartHubId: smartHubId,
    itemId: folderId,
  });
}

// Delete a note from a Smart Hub
export function deleteNoteFromSmartHub(smartHubId: string, noteId: string) {
  const index = smartHubsState$.smartHubs
    .get()
    .findIndex((p) => p.id === smartHubId);

  if (index !== -1) {
    const noteIndex = smartHubsState$.smartHubs[index].notes
      .get()
      .findIndex((n) => n.id === noteId);

    if (noteIndex !== -1) {
      smartHubsState$.smartHubs[index].notes.splice(noteIndex, 1);
    }
  }
}

export function addOrUpdateSmartHubFolderItem(
  smartHubId: string,
  folderId: string,
  item: FileSource
) {
  const smartHubIndex = smartHubsState$.smartHubs
    .get()
    .findIndex((p) => p.id === smartHubId);

  if (smartHubIndex !== -1) {
    const folderIndex = smartHubsState$.smartHubs[smartHubIndex].folders
      .get()
      .findIndex((f) => f.id === folderId);

    if (folderIndex !== -1) {
      // First get the current items array
      const currentItems =
        smartHubsState$.smartHubs[smartHubIndex].folders[
          folderIndex
        ].items.get();

      // Find the item by ID first (more reliable), then by path as fallback
      const itemIndex = currentItems.findIndex(
        (f) =>
          f.id === item.id || (f.path === item.path && f.type === item.type)
      );

      if (itemIndex !== -1) {
        // Force a direct update to the specific property that changed
        // This ensures Legend State detects the change and triggers a UI update
        smartHubsState$.smartHubs[smartHubIndex].folders[folderIndex].items[
          itemIndex
        ].status.set(item.status);

        // Then update the entire object to ensure all properties are updated
        smartHubsState$.smartHubs[smartHubIndex].folders[folderIndex].items[
          itemIndex
        ].set({
          ...currentItems[itemIndex],
          ...item,
        });
      } else {
        // Add new item
        smartHubsState$.smartHubs[smartHubIndex].folders[
          folderIndex
        ].items.push(item);
      }

      // Force a refresh of the folder itself to ensure UI updates
      const currentFolder =
        smartHubsState$.smartHubs[smartHubIndex].folders[folderIndex].get();
      smartHubsState$.smartHubs[smartHubIndex].folders[folderIndex].set({
        ...currentFolder,
      });
    }
  }
}

export function addSmartHubFolder(smartHubId: string, folder: FolderSource) {
  const smartHubIndex = smartHubsState$.smartHubs
    .get()
    .findIndex((p) => p.id === smartHubId);

  if (smartHubIndex !== -1) {
    const folderIndex = smartHubsState$.smartHubs[smartHubIndex].folders
      .get()
      .findIndex((f) => f.id === folder.id);

    if (folderIndex === -1) {
      smartHubsState$.smartHubs[smartHubIndex].folders.push(folder);
    }
  }
}

export function setSmartHubsStatus(
  smartHubId: string,
  status: 'draft' | 'composing' | 'ready' | 'error'
) {
  const index = smartHubsState$.smartHubs
    .get()
    .findIndex((p) => p.id === smartHubId);
  if (index !== -1) {
    smartHubsState$.smartHubs[index].status.set(status);

    const statusMap = {
      draft: 'pending',
      composing: 'processing',
      ready: 'ready',
      error: 'error',
    };
    // Set all files and folders to the same status
    smartHubsState$.smartHubs[index].files.forEach((file) => {
      file.status.set(
        statusMap[status] as 'pending' | 'processing' | 'ready' | 'error'
      );
    });
    smartHubsState$.smartHubs[index].folders.forEach((folder) => {
      folder.status.set(
        statusMap[status] as 'pending' | 'processing' | 'ready' | 'error'
      );
    });
    return true;
  }
}

export function isSmartHubComposing(smartHubId: string) {
  const index = smartHubsState$.smartHubs
    .get()
    .findIndex((p) => p.id === smartHubId);
  if (index !== -1) {
    return smartHubsState$.smartHubs[index].status.get() === 'composing';
  }
  return false;
}
