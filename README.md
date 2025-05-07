# NoteBit

<div align="center">
  <img src="src/assets/images/logo.png" alt="NoteBit Logo" width="200"/>
  <h3>An intelligent note-taking application with AI capabilities</h3>
</div>

## Overview

Notebit is a desktop application for Windows, macOS, and Linux that seamlessly blends AI chat with your personal knowledge base. Enjoy advanced AI assistance, effortless organization, and reliable offline access with local PouchDB storage, all crafted with Electron, React, and TypeScript.

## Features

- **Rich Text Editing**: Create and edit notes with a powerful Tiptap-based editor that supports markdown, code blocks, and LaTeX rendering
- **AI Integration**: Interact with various AI models through chat-like interface using the Vercel AI SDK
- **Note Organization**: Organize your notes with folders and smart filtering
- **Smart Hubs**: Central locations to access and manage related content
- **Offline-First**: Work seamlessly offline with local data storage
- **Cross-Platform**: Available for Windows, macOS, and Linux

## Tech Stack

### Core

- **Electron**: Cross-platform desktop application framework
- **React**: UI library for building the interface
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tooling via electron-vite

### Data Management

- **PouchDB**: Offline-first database
- **Legend State**: State management
- **TanStack React Router**: Routing for the web interface
- **TRPC**: Type-safe API for communication between main and renderer processes

### UI

- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality UI components

### AI

- **Vercel AI SDK**: Integration with various AI providers
- **Support for multiple models**: OpenAI, Anthropic, Google, Perplexity, and more

## Getting Started

### Prerequisites

- Node.js (recommended v18+)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/embium/notebit.git
cd notebit

# Install dependencies
npm install
```

### Development

```bash
# Start in development mode
npm run dev
```

### Building

```bash
# Build the application
npm run build

# Build for specific platforms
npm run app:win    # Windows
npm run app:mac    # macOS
npm run app:linux  # Linux
```

## Project Structure

- `src/main`: Electron main process code (Node.js environment)
- `src/preload.ts`: Script for secure bridge between main and renderer processes
- `src/shared`: Code shared between main and renderer processes
- `src/web`: Web/renderer process code (React application)
  - `app`: Core app setup
  - `components`: Reusable UI components
  - `features`: Feature modules (Notes, Chats, Settings, etc.)
  - `routes`: Routing configuration
  - `shared`: Web-specific shared utilities

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Michael Mooney - [GitHub](https://github.com/embium)
