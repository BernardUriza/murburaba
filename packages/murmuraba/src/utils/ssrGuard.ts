/**
 * 🔥 SSR GUARD BRUTAL - PROTECCIÓN UNIVERSAL CONTRA WINDOW VIOLATIONS
 * 
 * REGLA INQUEBRANTABLE: Este código DEBE ejecutarse ANTES que cualquier otra importación
 * para proteger contra accesos directos a `window` en SSR.
 */

export interface WindowGuardConfig {
  enableConsoleWarnings?: boolean;
  fallbackAudioContext?: boolean;
}

const DEFAULT_CONFIG: WindowGuardConfig = {
  enableConsoleWarnings: true,
  fallbackAudioContext: true
};

/**
 * Verifica si estamos en un entorno de navegador
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
};

/**
 * Ejecuta código solo si estamos en el navegador
 */
export const browserOnly = <T>(callback: () => T, fallback?: T): T | undefined => {
  if (isBrowser()) {
    return callback();
  }
  return fallback;
};

/**
 * Obtiene una referencia segura a window (undefined en SSR)
 */
export const getSafeWindow = (): Window | undefined => {
  return isBrowser() ? window : undefined;
};

/**
 * Crear un proxy para window que no explote en SSR
 */
const createWindowProxy = (config: WindowGuardConfig): any => {
  if (isBrowser()) {
    return window;
  }

  // En SSR, crear un objeto que capture accesos y no explote
  return new Proxy({}, {
    get(target, prop) {
      if (config.enableConsoleWarnings && typeof console !== 'undefined') {
        console.warn(
          `⚠️ SSR VIOLATION: Intento de acceso a window.${String(prop)} en servidor.` +
          ` Este código solo debe ejecutarse en el navegador.`
        );
      }
      
      // Retornar mocks básicos para APIs comunes
      if (prop === 'AudioContext' || prop === 'webkitAudioContext') {
        return config.fallbackAudioContext ? function() { return {}; } : undefined;
      }
      
      if (prop === 'OfflineAudioContext' || prop === 'webkitOfflineAudioContext') {
        return config.fallbackAudioContext ? function() { return {}; } : undefined;
      }
      
      // Mock BRUTAL para window.location que debe soportar destructuring
      if (prop === 'location') {
        const locationMock = {
          protocol: 'https:',
          host: 'localhost',
          hostname: 'localhost',
          port: '',
          pathname: '/',
          search: '',
          hash: '',
          origin: 'https://localhost',
          href: 'https://localhost/',
          
          // Métodos adicionales que Next.js podría necesitar
          assign: () => {},
          reload: () => {},
          replace: () => {},
          toString: () => 'https://localhost/'
        };
        
        // Hacer que todas las propiedades sean enumerables para destructuring
        Object.defineProperties(locationMock, {
          protocol: { enumerable: true, writable: true, value: 'https:' },
          host: { enumerable: true, writable: true, value: 'localhost' },
          hostname: { enumerable: true, writable: true, value: 'localhost' },
          port: { enumerable: true, writable: true, value: '' },
          pathname: { enumerable: true, writable: true, value: '/' },
          search: { enumerable: true, writable: true, value: '' },
          hash: { enumerable: true, writable: true, value: '' },
          origin: { enumerable: true, writable: true, value: 'https://localhost' },
          href: { enumerable: true, writable: true, value: 'https://localhost/' }
        });
        
        return locationMock;
      }
      
      // Mock para window.document
      if (prop === 'document') {
        return {};
      }
      
      return undefined;
    },
    
    set(target, prop, value) {
      if (config.enableConsoleWarnings && typeof console !== 'undefined') {
        console.warn(
          `⚠️ SSR VIOLATION: Intento de asignación a window.${String(prop)} en servidor.`
        );
      }
      return true; // No hacer nada, pero no explotar
    }
  });
};

/**
 * Instalar protecciones globales contra violaciones de SSR
 * DEBE llamarse antes de cualquier importación que pueda usar window
 */
export const installSSRGuards = (config: WindowGuardConfig = DEFAULT_CONFIG): void => {
  if (!isBrowser()) {
    const windowProxy = createWindowProxy(config);
    
    // INSTALACIÓN BRUTAL EN TODOS LOS CONTEXTOS POSIBLES
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).window = windowProxy;
    }
    
    if (typeof global !== 'undefined') {
      (global as any).window = windowProxy;
    }
    
    // Para Node.js environments específicos
    if (typeof self !== 'undefined') {
      (self as any).window = windowProxy;
    }
    
    // Asegurar que window esté disponible como propiedad del objeto global
    try {
      Object.defineProperty(globalThis || global, 'window', {
        value: windowProxy,
        writable: true,
        configurable: true
      });
    } catch (e) {
      // Si no se puede definir, al menos intentar asignación directa
      if (typeof globalThis !== 'undefined') {
        (globalThis as any).window = windowProxy;
      }
    }
  }
};

/**
 * Wrapper para importaciones dinámicas que pueden violar SSR
 */
export const safeImport = async <T>(
  importFn: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> => {
  if (!isBrowser()) {
    return fallback;
  }
  
  try {
    return await importFn();
  } catch (error) {
    console.error('Error en importación dinámica:', error);
    return fallback;
  }
};

// AUTO-INSTALAR guards en importación (ejecutar inmediatamente)
installSSRGuards();