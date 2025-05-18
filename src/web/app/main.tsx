// import { enableReactTracking } from '@legendapp/state/config/enableReactTracking';
// import { configureObservablePersistence } from '@legendapp/state/persist';
// import { ObservablePersistLocalStorage } from '@legendapp/state/persist-plugins/local-storage';
//import "@radix-ui/themes/styles.css";
import t, { queryClient, trpcClient, trpcProxyClient } from '@shared/config';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createHashHistory,
  createRouter,
} from '@tanstack/react-router';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'sonner';
import '@/app/styles/defaults.css';
import { routeTree } from '@/routeTree.gen';
import { ThemeProvider } from '@/app/contexts/ThemeProvider';
import { enableReactTracking } from '@legendapp/state/config/enableReactTracking';
import { configureObservablePersistence } from '@legendapp/state/persist';
import { ObservablePersistLocalStorage } from '@legendapp/state/persist-plugins/local-storage';
import { initializePrompts } from '@/features/prompts-library/state/promptsLibraryState';
import { initializeNotes } from '@/features/notes/state/notesState';
import { resetSearchStateDefaults } from '../features/notes/state/searchState';
import { initializeChats } from '@/features/chats/state/chatsState';
import { NoteIndexingProvider } from '../features/notes/contexts/NoteIndexingProvider';

// Configure Legend State for reactivity and persistence
enableReactTracking({
  auto: true,
});

configureObservablePersistence({
  pluginLocal: ObservablePersistLocalStorage,
});

// Initialize application and router
const hashHistory = createHashHistory();
const router = createRouter({
  history: hashHistory,
  routeTree,
  defaultPreload: 'intent',
  context: {
    queryClient,
    trpcClient,
  },
});

// Type augmentation for TanStack Router
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

/**
 * Initialize the application
 * Sets up state and necessary services in the proper order
 */
function initializeApplication() {
  try {
    // Reset search state to defaults before other initialization
    resetSearchStateDefaults();

    // Initialize core features
    initializeNotes().catch((error) =>
      console.error('Failed to initialize notes:', error)
    );

    initializePrompts();

    initializeChats();
  } catch (error) {
    console.error('Error during application initialization:', error);
  }
}

// Render the application
const rootElement = document.getElementById('root');

if (!rootElement?.innerHTML) {
  // Initialize the application
  initializeApplication();

  // Create and render root component with properly ordered providers
  const root = ReactDOM.createRoot(rootElement!);

  root.render(
    <StrictMode>
      {/* Theme provider should be the outermost provider after StrictMode */}
      <ThemeProvider>
        <NoteIndexingProvider>
          {/* TRPC Provider next for data fetching capabilities */}
          <t.Provider
            client={trpcClient}
            queryClient={queryClient}
          >
            {/* Query client provider for React Query functionality */}
            <QueryClientProvider client={queryClient}>
              {/* Router provider for application routing */}
              <RouterProvider router={router} />
              {/* Toast notifications */}
              <Toaster
                richColors
                position="top-right"
                offset={50}
              />
            </QueryClientProvider>
          </t.Provider>
        </NoteIndexingProvider>
      </ThemeProvider>
    </StrictMode>
  );
}
