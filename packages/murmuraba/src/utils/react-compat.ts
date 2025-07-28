/**
 * React 19 compatibility layer
 * Asegura que Murmuraba funcione con todas las versiones de React
 */

// Verificar versión de React para compatibilidad
export function isReact19OrHigher(): boolean {
  try {
    // Evitar acceso directo a React si no está disponible (SSR)
    if (typeof window === 'undefined') return false;

    const React = (window as any).React || require('react');
    const version = React.version;
    if (!version) return false;

    const major = parseInt(version.split('.')[0], 10);
    return major >= 19;
  } catch {
    return false;
  }
}

// Wrapper para evitar problemas con ReactCurrentDispatcher
export function safeReactImport() {
  try {
    // Dynamic import para evitar bundling
    if (typeof window !== 'undefined' && (window as any).React) {
      return (window as any).React;
    }
    return require('react');
  } catch {
    throw new Error(
      '[Murmuraba] React is required but not found. Please ensure React is properly installed.'
    );
  }
}

// Verificar si estamos en Next.js
export function isNextJs(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__NEXT_DATA__;
}

// Configuración para importación dinámica en Next.js
export const NEXT_JS_DYNAMIC_CONFIG = {
  ssr: false,
  loading: () => null,
};
