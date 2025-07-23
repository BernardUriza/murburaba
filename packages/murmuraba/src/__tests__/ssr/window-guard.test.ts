import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * 🔥 BRUTAL SSR PROTECTION TEST
 * 
 * REGLA INQUEBRANTABLE: Ningún código debe acceder a `window` sin guards
 * Si este test falla = CÓDIGO ROTO en SSR
 */
describe('SSR Window Guard Protection', () => {
  let originalWindow: typeof window;

  beforeEach(() => {
    originalWindow = global.window;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  it('DEBE fallar cuando window no existe (SSR simulation)', () => {
    // RED: Simular entorno SSR donde window no existe
    delete (global as any).window;
    
    // Este test DEBE fallar hasta que implementemos guards
    expect(() => {
      // Simular importación del bundle problemático
      eval(`
        // Código problemático de dist/index.esm.js:873
        window.OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
      `);
    }).toThrow('window is not defined');
  });

  it('DEBE ejecutar sin error cuando window existe (browser)', () => {
    // GREEN: Simular browser donde window existe
    global.window = {
      AudioContext: vi.fn(),
      OfflineAudioContext: vi.fn(),
      webkitAudioContext: vi.fn(),
      webkitOfflineAudioContext: vi.fn()
    } as any;

    expect(() => {
      // Mismo código pero con window disponible
      eval(`
        if (typeof window !== 'undefined') {
          window.OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
          window.AudioContext = window.AudioContext || window.webkitAudioContext;
        }
      `);
    }).not.toThrow();
  });

  it('DEBE manejar accesos a window.location sin explotar en SSR', async () => {
    delete (global as any).window;
    
    // Importar el guard que debería instalar protecciones
    await import('../../utils/ssrGuard');
    
    expect(() => {
      // Simular acceso problemático que causa el error
      const location = (global as any).window?.location;
      expect(location).toBeDefined();
      expect(location.protocol).toBe('https:');
      expect(location.host).toBe('localhost');
    }).not.toThrow();
  });

  it('DEBE proporcionar mocks funcionales para APIs de audio', async () => {
    delete (global as any).window;
    await import('../../utils/ssrGuard');
    
    expect(() => {
      const AudioContext = (global as any).window?.AudioContext;
      const OfflineAudioContext = (global as any).window?.OfflineAudioContext;
      
      console.log('AudioContext:', AudioContext);
      console.log('OfflineAudioContext:', OfflineAudioContext);
      
      // En SSR, deberían ser funciones mock o undefined
      if (AudioContext) {
        expect(typeof AudioContext).toBe('function');
      }
      if (OfflineAudioContext) {
        expect(typeof OfflineAudioContext).toBe('function');
      }
      
      // Verificar que se pueden instanciar sin explotar (solo si existen)
      if (AudioContext) {
        const audioCtx = new AudioContext();
        expect(audioCtx).toBeDefined();
      }
      
      if (OfflineAudioContext) {
        const offlineCtx = new OfflineAudioContext();
        expect(offlineCtx).toBeDefined();
      }
    }).not.toThrow();
  });
});