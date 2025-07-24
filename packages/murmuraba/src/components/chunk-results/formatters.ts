export const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const formatPercentage = (value: number): string => {
  if (!isFinite(value)) return '0.0%';
  return `${Math.max(0, Math.min(100, value)).toFixed(1)}%`;
};

export const formatFileSize = (bytes: number): string => {
  if (!isFinite(bytes) || bytes <= 0) return '0 KB';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export const calculateChunkStats = (chunks: Array<{ duration: number; isValid?: boolean; metrics: { processingLatency: number } }>) => {
  if (chunks.length === 0) return null;
  
  const totalDuration = chunks.reduce((sum, chunk) => sum + chunk.duration, 0);
  const validChunks = chunks.filter(chunk => chunk.isValid !== false);
  const averageLatency = validChunks.length > 0 
    ? validChunks.reduce((sum, chunk) => sum + chunk.metrics.processingLatency, 0) / validChunks.length 
    : 0;
  
  return {
    totalChunks: chunks.length,
    validChunks: validChunks.length,
    totalDuration,
    averageLatency,
  };
};