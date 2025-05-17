// import t from '@shared/config';
import type React from 'react';
import { useEffect, useState } from 'react';
import { themeState } from '@/app/styles/themeState';
import t from '@shared/config';
import {
  VscClose,
  VscChromeMaximize,
  VscChromeMinimize,
  VscChromeRestore,
} from 'react-icons/vsc';
import '@/app/styles/electron.css';
import iconPng from '@assets/icons/icon.png';
import { useWindowState } from '@shared/useWindowState';
import NoteIndexingHandler from '@/features/notes/components/core/NoteIndexingHandler';

type LayoutProps = {
  children?: React.ReactNode;
};

export function Layout({ children }: LayoutProps) {
  const theme = themeState.theme.get();
  useEffect(() => {
    // This will run whenever theme changes
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark);

    if (isDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [theme]); // Dependency on theme changes

  const { mutate: minimizeWindow } = t.window.minimize.useMutation();
  const { mutate: maximizeWindow } = t.window.maximize.useMutation();
  const { mutate: closeWindow } = t.window.closeWindow.useMutation();
  const { isMaximized } = useWindowState();

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      {/* Titlebar - fixed height of 36px (h-9) */}
      <div className="w-full h-9 flex-shrink-0 flex items-center select-none border-b">
        {/* App name/logo - draggable region */}
        <div
          id="drag-region"
          className="flex-grow flex items-center h-full px-4 electron-drag-region"
        >
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Notebit
            </span>
          </div>
        </div>

        {/* Window controls */}
        <div className="flex h-full">
          <button
            className="h-full px-4 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 focus:outline-none transition-colors"
            onClick={() => minimizeWindow()}
            aria-label="Minimize"
          >
            <VscChromeMinimize
              className="text-neutral-700 dark:text-neutral-400"
              size={12}
            />
          </button>
          <button
            className="h-full px-4 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 focus:outline-none transition-colors"
            onClick={() => maximizeWindow()}
            aria-label="Maximize"
          >
            {isMaximized ? (
              <VscChromeRestore
                className="text-neutral-700 dark:text-neutral-400"
                size={12}
              />
            ) : (
              <VscChromeMaximize
                className="text-neutral-700 dark:text-neutral-400"
                size={12}
              />
            )}
          </button>
          <button
            className="h-full px-4 flex items-center justify-center hover:bg-red-500 focus:outline-none transition-colors group"
            onClick={() => closeWindow()}
            aria-label="Close"
          >
            <VscClose
              className="text-neutral-700 dark:text-neutral-400 group-hover:text-white"
              size={14}
            />
          </button>
        </div>
      </div>

      {/* Main content - fills remaining height with proper overflow handling */}
      <div className="flex-1 min-h-0">
        {children}

        {/* Background services/handlers */}
        <NoteIndexingHandler />
      </div>
    </div>
  );
}
