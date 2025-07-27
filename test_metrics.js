const puppeteer = require('puppeteer');

async function testMetrics() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capturar logs de métricas
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('VAD') || text.includes('Noise') || text.includes('metric')) {
      console.log(`[${msg.type()}] ${text}`);
    }
  });
  
  console.log('1. Navegando a localhost:3000...');
  await page.goto('http://localhost:3000');
  
  console.log('2. Inicializando engine...');
  const button = await page.$('button');
  await button.click();
  
  // Esperar inicialización
  await new Promise(r => setTimeout(r, 5000));
  
  console.log('3. Inyectando código para monitorear métricas...');
  
  // Inyectar código para capturar métricas
  await page.evaluate(() => {
    if (window.murmurabaSuite && window.murmurabaSuite.metricsManager) {
      console.log('MetricsManager encontrado!');
      
      // Escuchar actualizaciones de métricas
      window.murmurabaSuite.metricsManager.on('metrics-update', (metrics) => {
        const vad = window.murmurabaSuite.metricsManager.getAverageVAD();
        const voicePercent = window.murmurabaSuite.metricsManager.getVoiceActivityPercentage();
        console.log(`METRICS: VAD=${vad.toFixed(3)}, Voice%=${voicePercent.toFixed(1)}%, NoiseReduction=${metrics.noiseReductionLevel.toFixed(1)}%`);
      });
      
      // Simular procesamiento con ruido
      const fakeFrame = new Float32Array(480);
      for (let i = 0; i < 480; i++) {
        fakeFrame[i] = (Math.random() - 0.5) * 0.1; // Ruido bajo
      }
      
      // Actualizar métricas manualmente
      window.murmurabaSuite.metricsManager.updateVAD(0.8); // Simular voz detectada
      window.murmurabaSuite.metricsManager.updateNoiseReduction(0.35); // 35% reducción
      window.murmurabaSuite.metricsManager.updateInputLevel(0.5);
      window.murmurabaSuite.metricsManager.updateOutputLevel(0.3);
      
      console.log('Métricas actualizadas manualmente');
    } else {
      console.error('MetricsManager NO encontrado');
    }
  });
  
  // Esperar para ver las métricas
  await new Promise(r => setTimeout(r, 3000));
  
  await browser.close();
  console.log('Test completado');
}

testMetrics().catch(console.error);