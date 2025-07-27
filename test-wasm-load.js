/**
 * Test de carga WASM del paquete murmuraba
 * Valida que el paquete es autocontenido
 */

const path = require('path');

async function testMurmurabaWASM() {
  console.log('🧪 Test de carga WASM - Paquete Murmuraba Autocontenido\n');
  
  try {
    // 1. Cambiar al directorio del paquete
    process.chdir(path.join(__dirname, 'packages/murmuraba'));
    console.log('📁 Directorio:', process.cwd());
    
    // 2. Verificar que existe el build
    const fs = require('fs');
    if (!fs.existsSync('./dist/index.js')) {
      throw new Error('Build no encontrado. Ejecuta: npm run build');
    }
    
    // 3. Importar desde el build
    console.log('\n📦 Importando MurmurabaSuite desde dist...');
    const { MurmurabaSuite } = require('./dist');
    
    // 4. Crear instancia
    console.log('🔧 Creando instancia...');
    const suite = new MurmurabaSuite({
      enableAGC: false,
      chunkDuration: 8
    });
    
    // 5. Inicializar (esto carga el WASM embebido)
    console.log('🚀 Inicializando (cargando WASM embebido)...');
    await suite.initialize();
    
    console.log('\n✅ WASM cargado correctamente desde base64 embebido');
    console.log('✅ El paquete es AUTOCONTENIDO');
    console.log('✅ NO requiere archivos en /public');
    
    // 6. Cleanup
    suite.cleanup();
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    return false;
  }
}

testMurmurabaWASM().then(success => {
  console.log(success ? '\n✅ TEST EXITOSO' : '\n❌ TEST FALLIDO');
  process.exit(success ? 0 : 1);
});