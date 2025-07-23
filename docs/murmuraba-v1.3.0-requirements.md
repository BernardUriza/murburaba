# 🧙‍♂️ Requerimientos para Murmuraba 1.5.2
*"Un mago debe atender los detalles más pequeños para prevenir las catástrofes más grandes"*

## 🐛 Problemas Identificados en v1.2.2

### 1. **Incompatibilidad con React 19**
- El hook `useMurmubaraEngine` no se inicializa correctamente con React 19
- Los hooks no están siendo exportados correctamente desde el índice principal
- Falta soporte para React 19 en las dependencias peer

### 2. **Problemas de Exportación**
- `useAudioEngine` existe pero no está exportado desde `index.js`
- Inconsistencia entre TypeScript definitions y exports reales
- No hay export default que facilite la importación

### 3. **Inicialización del Engine**
- El engine queda en estado "not-initialized" indefinidamente
- No hay feedback claro cuando la inicialización falla
- La auto-inicialización no funciona correctamente

## 📋 Requerimientos para 1.5.2

### 1. **Compatibilidad con React 19**
```json
{
  "peerDependencies": {
    "react": "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0",
    "react-dom": "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"
  }
}
```

### 2. **Exportaciones Corregidas**
```javascript
// index.js o index.ts
export { useMurmubaraEngine } from './hooks/useMurmubaraEngine';
export { useAudioEngine } from './hooks/useAudioEngine';
export { MurmurabaEngine } from './core/MurmurabaEngine';
export * from './types';

// Export default para facilitar uso
export default {
  useMurmubaraEngine,
  useAudioEngine,
  MurmurabaEngine
};
```

### 3. **Hook Mejorado con Fallbacks**
```typescript
interface UseMurmubaraEngineOptions {
  autoInitialize?: boolean;
  fallbackToManual?: boolean; // Nueva opción
  onInitError?: (error: Error) => void;
  config?: EngineConfig;
}

// Hook debe manejar React 19 y versiones anteriores
export function useMurmubaraEngine(options?: UseMurmubaraEngineOptions) {
  // Detectar versión de React
  const reactVersion = React.version;
  const isReact19 = reactVersion.startsWith('19');
  
  // Usar diferentes estrategias según la versión
  if (isReact19) {
    // Implementación específica para React 19
    // Evitar usar características deprecadas
  }
  
  // Fallback a inicialización manual si falla
  if (options?.fallbackToManual && !engineReady) {
    return createManualEngine(options.config);
  }
}
```

### 4. **Inicialización Robusta**
```typescript
class MurmurabaEngine {
  async initialize(config?: EngineConfig): Promise<void> {
    try {
      // Validar entorno
      if (!this.checkEnvironment()) {
        throw new Error('Environment not supported');
      }
      
      // Cargar WASM con timeout
      await this.loadWASMWithTimeout(5000);
      
      // Inicializar audio context con fallbacks
      await this.initializeAudioContext();
      
      this.status = 'ready';
      this.emit('initialized');
    } catch (error) {
      this.status = 'error';
      this.lastError = error;
      this.emit('error', error);
      
      // Intentar inicialización degradada
      if (this.config.allowDegraded) {
        await this.initializeDegraded();
      } else {
        throw error;
      }
    }
  }
  
  private checkEnvironment(): boolean {
    // Verificar APIs necesarias
    return !!(
      window.AudioContext || 
      window.webkitAudioContext
    ) && !!window.WebAssembly;
  }
}
```

### 5. **Manejo de Estado Mejorado**
```typescript
type EngineStatus = 
  | 'not-initialized'
  | 'initializing' 
  | 'loading-wasm'
  | 'creating-context'
  | 'ready'
  | 'processing'
  | 'paused'
  | 'error'
  | 'degraded'; // Nuevo estado

interface EngineState {
  status: EngineStatus;
  error?: Error;
  capabilities: {
    hasWASM: boolean;
    hasAudioContext: boolean;
    hasWorklet: boolean;
    maxChannels: number;
  };
  metrics: EngineMetrics;
}
```

### 6. **Diagnóstico y Debug**
```typescript
interface DiagnosticsInfo {
  version: string;
  reactVersion: string;
  browserInfo: {
    name: string;
    version: string;
    audioAPIsSupported: string[];
  };
  engineState: EngineState;
  initializationLog: string[];
  performanceMetrics: {
    wasmLoadTime: number;
    contextCreationTime: number;
    totalInitTime: number;
  };
}

class MurmurabaEngine {
  getDiagnostics(): DiagnosticsInfo {
    // Retornar información completa para debug
  }
  
  async runDiagnosticTests(): Promise<DiagnosticReport> {
    // Ejecutar pruebas de funcionalidad
  }
}
```

### 7. **Documentación y Ejemplos**
```markdown
## Troubleshooting

### React 19 Compatibility
Si usas React 19, asegúrate de:
1. Usar la versión 1.3.0 o superior de murmuraba
2. Habilitar el modo de compatibilidad:
   ```javascript
   const engine = useMurmubaraEngine({
     react19Mode: true,
     fallbackToManual: true
   });
   ```

### Estado "not-initialized"
Si el engine se queda en este estado:
1. Verifica la consola para errores
2. Ejecuta diagnósticos: `engine.getDiagnostics()`
3. Intenta inicialización manual
```

### 8. **Tests de Compatibilidad**
```javascript
// tests/react-versions.test.js
describe('React Version Compatibility', () => {
  test('Works with React 16', () => {
    // Test con React 16
  });
  
  test('Works with React 17', () => {
    // Test con React 17
  });
  
  test('Works with React 18', () => {
    // Test con React 18
  });
  
  test('Works with React 19', () => {
    // Test con React 19
  });
});
```

### 9. **Migración Suave**
```typescript
// Mantener retrocompatibilidad
export const useAudioEngine = (options?) => {
  console.warn('useAudioEngine is deprecated. Use useMurmubaraEngine instead.');
  return useMurmubaraEngine(options);
};
```

### 10. **Mejoras de Rendimiento**
- Lazy loading del WASM
- Web Workers para procesamiento pesado
- Opciones de configuración para diferentes niveles de calidad
- Cache de configuraciones frecuentes

## 🚀 Plan de Implementación

1. **Fase 1**: Arreglar exports y compatibilidad React 19
2. **Fase 2**: Mejorar inicialización y manejo de errores  
3. **Fase 3**: Agregar diagnósticos y debugging
4. **Fase 4**: Tests exhaustivos con todas las versiones de React
5. **Fase 5**: Documentación y ejemplos actualizados

## 📦 Entregables

- [ ] murmuraba 1.5.2 con todos los fixes
- [ ] Documentación actualizada
- [ ] Ejemplos para React 16, 17, 18 y 19
- [ ] Migration guide de v1.2.x a 1.5.2
- [ ] Suite de tests completa

---

*"Incluso la persona más pequeña puede cambiar el curso del futuro" - Y así, estos pequeños cambios harán a Murmuraba más poderosa que nunca.*