import { generateId } from 'ai';
import { saveImageToStorage } from '@src/renderer/utils/storage';

export async function saveImage(picBase64: string) {
  // 图片需要存储到 indexedDB，如果直接使用 OpenAI 返回的图片链接，图片链接将随着时间而失效
  const storageKey = await saveImageToStorage(picBase64);
  return storageKey;
}
