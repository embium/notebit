# NoteBit Architecture Migration Plan

## Overview

This document outlines the migration plan to reorganize the NoteBit codebase following a clean, modular architecture pattern similar to modern Electron applications. The new structure will provide better separation of concerns, improved maintainability, and clearer code organization.

## Current vs. Target Architecture

### Current Structure

```

src/

├── main.ts           # Mixed main process logic

├── preload.ts        # Single preload file

├── shared/           # Shared code between processes

├── web/              # Renderer process (React app)

└── assets/           # Static assets

```

### Target Structure

```

src/

├── main/             # Main process code

│   ├── index.ts      # Entry point

│   ├── main.ts       # Core app initialization

│   ├── events/       # IPC event handlers

│   ├── services/     # Backend services

│   ├── helpers/      # Utility functions

│   └── windows/      # Window management

├── preload/          # Preload scripts

│   ├── index.ts      # Main preload script

│   └── api/          # Exposed APIs

├── renderer/         # Renderer process (UI)

│   ├── main.tsx      # Entry point

│   ├── app.tsx       # Root component

│   ├── components/   # Reusable UI components

│   ├── contexts/     # React contexts

│   ├── features/     # Feature modules

│   ├── hooks/        # Custom hooks

│   ├── pages/        # Main pages

│   ├── workers/      # Web workers

│   └── styles/       # Global styles

├── shared/           # Shared utilities

│   ├── constants/    # Shared constants

│   ├── utils/        # Utility functions

│   ├── config/       # Configuration

│   └── trpc/         # TRPC setup

├── types/            # TypeScript definitions

└── assets/           # Static assets

```

## Migration Steps

### Phase 1: Main Process Reorganization

#### 1.1 Create Main Process Structure

```bash

src/main/

├── index.ts

├── main.ts

├── events/

│   ├── index.ts

│   ├── notes/

│   │   ├── index.ts

│   │   └── handlers.ts

│   ├── chats/

│   │   ├── index.ts

│   │   └── handlers.ts

│   ├── smart-hubs/

│   │   ├── index.ts

│   │   └── handlers.ts

│   └── updates/

│       ├── index.ts

│       └── handlers.ts

├── services/

│   ├── index.ts

│   ├── vector-storage/

│   ├── file-attachments/

│   ├── ollama/

│   ├── notes-watcher/

│   └── entity-extractor/

├── helpers/

│   ├── index.ts

│   ├── paths.ts

│   ├── ipc.ts

│   └── updater.ts

└── windows/

    ├── index.ts

    ├── mainWindow.ts

    └── splashScreen.ts

```

#### 1.2 Extract Window Management

Move window creation logic from `main.ts` to dedicated files:

**src/main/windows/mainWindow.ts**

- Extract `createWindow()` function

- Add window state management

- Handle window events

**src/main/windows/splashScreen.ts**

- Extract `createSplashScreen()` function

- Add splash screen lifecycle management

#### 1.3 Extract Update Logic

Move auto-updater configuration to helpers:

**src/main/helpers/updater.ts**

- Extract `getAutoUpdater()` function

- Add update event handlers

- Configure update settings

#### 1.4 Organize IPC Handlers

Create event handlers organized by feature:

**src/main/events/notes/handlers.ts**

- Note CRUD operations

- Note search handlers

- Note indexing events

**src/main/events/chats/handlers.ts**

- Chat creation/deletion

- Message handling

- AI model interactions

**src/main/events/smart-hubs/handlers.ts**

- Smart hub management

- Knowledge graph operations

- Vector storage interactions

#### 1.5 Move Services

Relocate services from `shared/services/` to `main/services/`:

- Keep service interfaces in shared

- Move implementations to main process

- Update import paths

### Phase 2: Preload Script Reorganization

#### 2.1 Create Preload Structure

```bash

src/preload/

├── index.ts

└── api/

    ├── index.ts

    ├── notes.ts

    ├── chats.ts

    ├── smart-hubs.ts

    ├── storage.ts

    ├── system.ts

    └── window.ts

```

#### 2.2 Split Preload APIs

Create focused API modules:

**src/preload/api/notes.ts**

```typescript
export const notesApi = {
  create: (note: NoteInput) => ipcRenderer.invoke('notes:create', note),

  update: (id: string, updates: Partial<Note>) =>
    ipcRenderer.invoke('notes:update', id, updates),

  delete: (id: string) => ipcRenderer.invoke('notes:delete', id),

  search: (query: string) => ipcRenderer.invoke('notes:search', query),
};
```

**src/preload/api/window.ts**

```typescript
export const windowApi = {
  minimize: () => ipcRenderer.send('window:minimize'),

  maximize: () => ipcRenderer.send('window:maximize'),

  close: () => ipcRenderer.send('window:close'),

  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
};
```

### Phase 3: Renderer Process Reorganization

#### 3.1 Rename web/ to renderer/

- Update all file references

- Update build configuration

- Update import paths

#### 3.2 Reorganize Components

Move components to appropriate directories:

- Shared components → `renderer/components/`

- Feature-specific components → `renderer/features/[feature]/components/`

- Layout components → `renderer/components/layout/`

#### 3.3 Extract Pages

Create dedicated page components:

- `renderer/pages/NotesPage.tsx`

- `renderer/pages/ChatsPage.tsx`

- `renderer/pages/SettingsPage.tsx`

- ...and so on for other top-level views.

### Phase 4: Shared Code Refactoring

#### 4.1 Reorganize Shared Directory

```bash

src/shared/

├── constants/

│   ├── index.ts

│   ├── app.ts

│   ├── storage.ts

│   └── ai.ts

├── utils/

│   ├── index.ts

│   ├── date.ts

│   ├── string.ts

│   └── file.ts

├── config/

│   ├── index.ts

│   ├── app.config.ts

│   └── ai.config.ts

└── trpc/

    ├── index.ts

    ├── client.ts

    └── routers/

```

#### 4.2 Move TRPC Routers

Keep TRPC routers in shared but organize better:

- Group related routers

- Create router index files

- Improve type exports

### Phase 5: Type Definitions

#### 5.1 Create Types Directory

```bash

src/types/

├── index.ts

├── ai.ts

├── chats.ts

├── notes.ts

├── smart-hubs.ts

├── settings.ts

├── common.ts

├── electron.d.ts

└── global.d.ts

```

#### 5.2 Consolidate Type Definitions

- Move types from `shared/types/` to `types/`

- Create domain-specific type files

- Export all types from index.ts

### Phase 6: Build Configuration Updates

#### 6.1 Update electron.vite.config.ts

```typescript
export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
        },
      },
    },
  },

  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
        },
      },
    },
  },

  renderer: {
    root: 'src/renderer',

    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
        },
      },
    },
  },
});
```

#### 6.2 Update TypeScript Configuration

Update path mappings in tsconfig.json:

```json
{
  "compilerOptions": {
    "paths": {
      "@main/*": ["src/main/*"],

      "@renderer/*": ["src/renderer/*"],

      "@preload/*": ["src/preload/*"],

      "@shared/*": ["src/shared/*"],

      "@types/*": ["src/types/*"],

      "@/*": ["src/renderer/*"]
    }
  }
}
```

### Phase 7: Testing and Validation

#### 7.1 Update Import Paths

- Use find/replace to update all import statements

- Verify all imports resolve correctly

- Run TypeScript compiler to check for errors

#### 7.2 Test Application

- Test main process initialization

- Verify IPC communication

- Check renderer process functionality

- Validate all features work as expected

#### 7.3 Update Documentation

- Update README with new structure

- Document architectural decisions

- Create developer guide

## Implementation Order

1. **Week 1**: Main process reorganization

   - Create directory structure

   - Extract window management

   - Move services

   - Organize IPC handlers

2. **Week 2**: Preload and shared code

   - Split preload scripts

   - Reorganize shared utilities

   - Update TRPC configuration

3. **Week 3**: Renderer process

   - Rename web/ to renderer/

   - Reorganize components

   - Extract pages

4. **Week 4**: Final touches

   - Move type definitions

   - Update build configuration

   - Testing and validation

   - Documentation updates

## Benefits

1. **Clear Separation of Concerns**

   - Each process has its own directory

   - No mixing of main/renderer code

2. **Improved Maintainability**

   - Easy to locate specific functionality

   - Clear file organization

3. **Better Scalability**

   - New features follow established patterns

   - Modular architecture supports growth

4. **Enhanced Developer Experience**

   - Intuitive import paths

   - Clear code structure

   - Better TypeScript support

5. **Easier Testing**

   - Isolated modules are easier to test

   - Clear boundaries between components

## Rollback Plan

If issues arise during migration:

1. Keep original files until migration is complete

2. Use git branches for each phase

3. Test thoroughly before merging

4. Maintain backward compatibility during transition

5. Document any breaking changes

## Success Criteria

- [ ] All tests pass

- [ ] Application builds successfully

- [ ] All features work as before

- [ ] No runtime errors

- [ ] Improved build times

- [ ] Clear separation between processes

- [ ] Updated documentation

- [ ] Team approval on new structure
