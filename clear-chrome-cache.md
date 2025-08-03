# 🔧 Soluciones para el Cache Agresivo de Chrome

## Método 1: Recarga Forzada (Recomendado)
**Windows/Linux:** `Ctrl + Shift + R`
**Mac:** `Cmd + Shift + R`

## Método 2: Developer Tools
1. Abre DevTools (`F12`)
2. Click derecho en el botón de recargar
3. Selecciona "Empty Cache and Hard Reload"

## Método 3: Desactivar Cache en DevTools
1. Abre DevTools (`F12`)
2. Ve a Network tab
3. Marca "Disable cache" ✅
4. Mantén DevTools abierto mientras desarrollas

## Método 4: URL con Timestamp
Agrega `?t=${Date.now()}` a la URL:
```
http://127.0.0.1:3000/?t=1234567890
```

## Método 5: Incognito Mode
Usa una ventana de incógnito (`Ctrl+Shift+N`) para desarrollo

## Configuración ya implementada:
- ✅ Headers anti-cache en Vite
- ✅ Meta tags HTTP-Equiv en HTML
- ✅ Auto-reload script para detectar cambios
- ✅ HMR configurado para full reload

## Si nada funciona:
```bash
# Reinicia el servidor de desarrollo
npm run dev
```

## Chrome Flags útiles:
En `chrome://flags/`:
- Busca "cache" y experimenta con las opciones
- "Back-forward cache" -> Disabled