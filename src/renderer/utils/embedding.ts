export function formatNoteContent(note: any): string {
  if (!note) return '';

  // Combine title and content
  const title = note.title || '';
  const content = note.content || '';

  // If we have both, combine them
  if (title && content) {
    return `${title}\n\n${content}`;
  }

  // Otherwise return whichever we have
  return title || content;
}

export function normalizeNoteId(id: string): string {
  // First remove any existing 'notes/' prefix to avoid duplication
  let normalizedId = id;
  if (normalizedId.startsWith('notes/')) {
    normalizedId = normalizedId.substring('notes/'.length);
  }

  // Convert backslashes to forward slashes for consistent storage
  normalizedId = normalizedId.replace(/\\/g, '/');

  // We want to store IDs WITHOUT the notes/ prefix but WITH all folder paths
  return normalizedId;
}
