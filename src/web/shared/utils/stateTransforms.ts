/**
 * Utility functions for transforming state data before persistence
 * These functions help ensure proper data handling for specific state types
 */

import { chatsState$ } from '@/features/chats/state/chatsState';

/**
 * Transform for chats state to remove file objects before persisting
 * This prevents serialization issues with File objects
 *
 * @param value The chats state object
 * @returns Transformed chats state without file objects
 */
export function chatStateTransform(value: any): any {
  // Create a deep copy to avoid modifying the original
  const copy = JSON.parse(JSON.stringify(safeSerialize(value)));

  // Remove files property from each chat before persisting
  if (copy.chatsList) {
    copy.chatsList = copy.chatsList.map((chat: any) => {
      // Destructure to separate files from the rest
      const { files, ...rest } = chat;
      return rest;
    });
  }

  return copy;
}

/**
 * Generic transform function to make any state object safely serializable
 * This handles common non-serializable types like Files, Functions, etc.
 *
 * @param value Any state object to make serializable
 * @returns A serializable version of the input
 */
export function safeSerialize(value: any): any {
  // Handle null or undefined
  if (value === null || value === undefined) {
    return value;
  }

  // Handle primitive types
  if (typeof value !== 'object' && typeof value !== 'function') {
    return value;
  }

  // Handle Date objects
  if (value instanceof Date) {
    return { __type: 'date', value: value.toISOString() };
  }

  // Handle File objects
  if (value instanceof File) {
    return {
      __type: 'file',
      name: value.name,
      type: value.type,
      size: value.size,
      lastModified: value.lastModified,
    };
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map((item) => safeSerialize(item));
  }

  // Handle regular objects
  const result: Record<string, any> = {};

  // Skip functions and handle other properties
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      const prop = value[key];

      // Skip functions, symbols, and other non-serializable types
      if (typeof prop !== 'function' && typeof prop !== 'symbol') {
        try {
          // Try to serialize the property
          result[key] = safeSerialize(prop);
        } catch (error) {
          // If serialization fails, skip this property
          console.warn(`Skipping non-serializable property: ${key}`);
        }
      }
    }
  }

  return result;
}
