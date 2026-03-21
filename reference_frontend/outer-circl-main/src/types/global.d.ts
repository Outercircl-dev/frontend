// Global type declarations

declare global {
  interface Window {
    React: typeof import('react');
    ReactHooks: {
      useState: typeof React.useState;
      useEffect: typeof React.useEffect;
      useContext: typeof React.useContext;
      createContext: typeof React.createContext;
    };
  }
}

export {};