import React, { useCallback, useState } from 'react';
import { processFile, processFileWithMetrics } from 'murmuraba';
import Swal from 'sweetalert2';

interface FileManagerProps {
  isInitialized: boolean;
  isLoading: boolean;
  engineConfig: any;
  onFileProcessed?: (result: any) => void;
}

export const FileManager: React.FC<FileManagerProps> = ({
  isInitialized,
  isLoading,
  engineConfig,
  onFileProcessed
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [processingFile, setProcessingFile] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!isInitialized || isLoading) return;

    setProcessingFile(file.name);
    
    try {
      const result = await processFileWithMetrics(file, engineConfig);
      
      if (result.success) {
        await Swal.fire({
          icon: 'success',
          title: 'File Processed Successfully!',
          html: `
            <div style="text-align: left;">
              <p><strong>Original Size:</strong> ${(result.originalSize / 1024).toFixed(2)} KB</p>
              <p><strong>Processed Size:</strong> ${(result.processedSize / 1024).toFixed(2)} KB</p>
              <p><strong>Compression:</strong> ${((1 - result.processedSize / result.originalSize) * 100).toFixed(1)}%</p>
              <p><strong>Processing Time:</strong> ${result.processingTime.toFixed(2)}ms</p>
              <p><strong>Noise Reduced:</strong> ${(result.metrics.noiseReduction * 100).toFixed(1)}%</p>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: 'Download Processed File',
          cancelButtonText: 'Close'
        }).then((result) => {
          if (result.isConfirmed && result.value) {
            const a = document.createElement('a');
            a.href = result.processedUrl;
            a.download = `processed_${file.name}`;
            a.click();
          }
        });

        onFileProcessed?.(result);
      } else {
        throw new Error(result.error || 'Processing failed');
      }
    } catch (error) {
      console.error('File processing error:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Processing Failed',
        text: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    } finally {
      setProcessingFile(null);
    }
  }, [isInitialized, isLoading, engineConfig, onFileProcessed]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find(file => file.type.startsWith('audio/'));
    
    if (audioFile) {
      handleFileSelect(audioFile);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Invalid File',
        text: 'Please drop an audio file'
      });
    }
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  return (
    <div className="file-manager">
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''} ${processingFile ? 'processing' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {processingFile ? (
          <div className="processing-indicator">
            <div className="spinner"></div>
            <p>Processing {processingFile}...</p>
          </div>
        ) : (
          <>
            <div className="drop-zone-icon">📁</div>
            <p className="drop-zone-text">
              Drag and drop an audio file here or
            </p>
            <label className="file-input-label">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileInput}
                disabled={!isInitialized || isLoading}
                className="hidden-file-input"
              />
              <span className="file-input-button">Browse Files</span>
            </label>
          </>
        )}
      </div>
    </div>
  );
};