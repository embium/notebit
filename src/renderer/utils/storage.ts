import { trpcProxyClient } from '@shared/config/index';

/**
 * Get data from PouchDB storage via tRPC
 * @param id Document ID to retrieve
 * @returns Promise with the document data
 */
export async function getStorageData(id: string) {
  try {
    return await trpcProxyClient.store.getData.query({ id });
  } catch (error) {
    console.error('Error retrieving data from storage:', error);
    return null;
  }
}

/**
 * Save data to PouchDB storage via tRPC
 * @param id Document ID to save
 * @param data Data to save
 * @returns Promise with the result
 */
export async function saveStorageData(id: string, data: any) {
  try {
    return await trpcProxyClient.store.saveData.mutate({ id, data });
  } catch (error) {
    console.error('Error saving data to storage:', error);
    throw error;
  }
}

/**
 * Save image data to storage
 * @param imageData Base64 image data
 * @returns Storage key for the saved image
 */
export async function saveImageToStorage(imageData: string) {
  const id = `image_${Date.now()}`;
  await saveStorageData(id, { data: imageData });
  return id;
}
