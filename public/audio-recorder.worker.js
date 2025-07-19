let intervalId = null;
let chunkDuration = 2000;

self.onmessage = function(e) {
  const { type, payload } = e.data;
  console.log('[Worker] Received message:', type, payload);
  
  switch (type) {
    case 'START':
      chunkDuration = payload.chunkDuration * 1000;
      console.log('[Worker] Starting timer with duration:', chunkDuration);
      startChunkTimer();
      break;
      
    case 'STOP':
      console.log('[Worker] Stopping timer');
      stopChunkTimer();
      break;
      
    case 'UPDATE_DURATION':
      chunkDuration = payload.chunkDuration * 1000;
      console.log('[Worker] Duration updated to:', chunkDuration);
      break;
  }
};

function startChunkTimer() {
  stopChunkTimer();
  
  console.log('[Worker] Sending CHUNK_START');
  self.postMessage({ type: 'CHUNK_START' });
  
  intervalId = setInterval(() => {
    console.log('[Worker] Timer fired, sending CHUNK_END and CHUNK_START');
    self.postMessage({ type: 'CHUNK_END' });
    self.postMessage({ type: 'CHUNK_START' });
  }, chunkDuration);
  console.log('[Worker] Timer started with interval:', intervalId);
}

function stopChunkTimer() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}