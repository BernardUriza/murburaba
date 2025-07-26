# 🎵 Instrucciones para Audio Demo

## Iniciar el servidor

```bash
# Opción 1: Solo Next.js (recomendado)
npx next dev

# Opción 2: Si tienes problemas con el comando anterior
npm run dev:next
```

## Acceder a Audio Demo

1. **Abre tu navegador** en http://localhost:3000

2. **Espera la inicialización**
   - Verás "Initializing MurmurabaSuite..." brevemente
   - En la esquina inferior derecha aparecerá un indicador verde cuando esté listo

3. **Busca el botón flotante**
   - En la parte inferior derecha de la pantalla verás varios botones flotantes
   - Haz clic en el botón **🎵** (nota musical)

4. **Audio Demo se abrirá**
   - Aparecerá un panel overlay con el Audio Demo
   - Podrás subir archivos de audio o grabar desde el micrófono

## Solución de problemas

### Si la página muestra "Initializing MurmurabaSuite..." permanentemente:

1. Abre la consola del navegador (F12)
2. Busca errores relacionados con React o hooks
3. Si hay errores, ejecuta:
   ```bash
   rm -rf .next node_modules/.cache
   npx next dev
   ```

### Si no aparecen los botones flotantes:

1. Verifica que MurmurabaSuiteStatus (esquina inferior derecha) muestre:
   - Ready: ✅
   - AudioProcessor: ✅

2. Si muestra errores, recarga la página (F5)

### Si el servidor no inicia:

```bash
# Limpia todo y reinicia
pkill -f node
rm -rf .next
npx next dev
```

## Estado actual

✅ El paquete murmuraba está correctamente configurado en CommonJS
✅ React está externalizado (no hay conflictos de versiones)
✅ Las rutas de webpack están configuradas correctamente
✅ El Audio Demo está integrado y funcional

## Arquitectura

- **MurmurabaSuite**: Sistema de inyección de dependencias que inicializa el engine de audio
- **Redux**: Maneja el estado global de la aplicación
- **Audio Demo**: Componente que permite procesar archivos de audio con reducción de ruido

El Audio Demo utiliza el engine RNNoise (WASM) para reducir el ruido en tiempo real.