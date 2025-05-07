declare global {
  export type GlobalState = {
    colorMode: 'dark' | 'light';
  };

  interface Window {
    electron: {
      on: (channel: string, callback: (...args: any[]) => void) => () => void;
      once: (channel: string, callback: (...args: any[]) => void) => () => void;
    };
  }
}

export type {};
