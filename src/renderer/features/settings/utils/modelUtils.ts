import { v4 as uuidv4 } from 'uuid';

// Types
import { GeminiModelInfo } from '@src/renderer/lib/ai/models/gemini';
import { ProviderType } from '@src/types/ai';

/**
 * Create a custom model ID based on provider and name
 */
export function createCustomModelId(
  providerId: ProviderType,
  name: string
): string {
  return `${providerId.toLowerCase()}-${name.toLowerCase().replace(/\s+/g, '-')}-${uuidv4().substring(0, 8)}`;
}

/**
 * Extract version number from model name
 */
export function extractVersionNumber(modelName: string): number {
  // Match patterns like "1.0", "1.5", "2.5", etc.
  const versionMatch = modelName.match(/(\d+\.\d+)/);
  if (versionMatch && versionMatch[1]) {
    return parseFloat(versionMatch[1]);
  }

  // If no decimal version found, try to match single digits
  const singleDigitMatch = modelName.match(/\b(\d+)\b/);
  if (singleDigitMatch && singleDigitMatch[1]) {
    return parseInt(singleDigitMatch[1], 10);
  }

  return 0; // Default to 0 if no version found
}

/**
 * Sort models by version number and name
 */
export function sortModels(
  models: (string | GeminiModelInfo)[]
): (string | GeminiModelInfo)[] {
  return [...models].sort((a, b) => {
    const nameA = typeof a === 'string' ? a : a.name;
    const nameB = typeof b === 'string' ? b : b.name;

    // Extract version numbers
    const versionA = extractVersionNumber(nameA);
    const versionB = extractVersionNumber(nameB);

    if (versionA !== versionB) {
      // Sort by version (higher first)
      return versionB - versionA;
    }

    // Fall back to alphabetical sort if versions are the same
    return nameA.localeCompare(nameB);
  });
}

/**
 * Validate JSON string input
 */
export function validateJsonString(jsonString: string): {
  valid: boolean;
  error?: string;
} {
  if (!jsonString.trim()) return { valid: true };

  try {
    JSON.parse(jsonString);
    return { valid: true };
  } catch (e) {
    return {
      valid: false,
      error: 'Invalid JSON format',
    };
  }
}

/**
 * Get the selected model's output token limit
 */
export function getModelOutputTokenLimit(
  selectedModelId: string,
  availableModels: (string | GeminiModelInfo)[]
): string {
  if (!selectedModelId) return 'Default: 2048';

  const selectedModel = availableModels.find((m) =>
    typeof m === 'string' ? m === selectedModelId : m.name === selectedModelId
  );

  if (!selectedModel) return 'Default: 4000';

  if (typeof selectedModel === 'string') {
    return 'Default: 2048'; // Default for Ollama models
  } else {
    return selectedModel.outputTokenLimit
      ? selectedModel.outputTokenLimit.toString()
      : 'Default: 2048';
  }
}
