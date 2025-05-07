import { ReactNode, useEffect } from 'react';
import { initializeNotes } from '../state/notesState';

interface NotesProviderProps {
  children: ReactNode;
}

/**
 * Notes Provider Component
 * Initializes the notes system and provides notes functionality to the application
 */
export const NotesProvider: React.FC<NotesProviderProps> = ({ children }) => {
  useEffect(() => {
    initializeNotes();
  }, []);

  return <>{children}</>;
};
