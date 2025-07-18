let intervalId = null;
let chunkDuration = 2000;

self.onmessage = function(e) {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'START':
      chunkDuration = payload.chunkDuration * 1000;
      startChunkTimer();
      break;
      
    case 'STOP':
      stopChunkTimer();
      break;
      
    case 'UPDATE_DURATION':
      chunkDuration = payload.chunkDuration * 1000;
      break;
  }
};

function startChunkTimer() {
  stopChunkTimer();
  
  self.postMessage({ type: 'CHUNK_START' });
  
  intervalId = setInterval(() => {
    self.postMessage({ type: 'CHUNK_END' });
    self.postMessage({ type: 'CHUNK_START' });
  }, chunkDuration);
}

function stopChunkTimer() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}