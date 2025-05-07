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
import {
  indexNotesForVectorSearch,
  resetSearchStateDefaults,
} from '../features/notes/state/searchState';
import { initializeChats } from '@/features/chats/state/chatsState';

enableReactTracking({
  auto: true,
});

configureObservablePersistence({
  pluginLocal: ObservablePersistLocalStorage,
});

// Reset the search state to defaults on app start
resetSearchStateDefaults();

// Initialize all app features
indexNotesForVectorSearch();
initializeNotes();
initializePrompts();
initializeChats();

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

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root');

if (!rootElement?.innerHTML) {
  const root = ReactDOM.createRoot(rootElement!);

  root.render(
    <StrictMode>
      <ThemeProvider>
        <t.Provider
          client={trpcClient}
          queryClient={queryClient}
        >
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <Toaster
              richColors
              position="top-right"
              offset={50}
            />
          </QueryClientProvider>
        </t.Provider>
      </ThemeProvider>
    </StrictMode>
  );
}
