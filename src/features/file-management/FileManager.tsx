import React, { useCallback, useState } from 'react';
import { processFileWithMetrics } from 'murmuraba';
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
  engineConfig: _engineConfig,
  onFileProcessed
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [processingFile, setProcessingFile] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!isInitialized || isLoading) return;

    setProcessingFile(file.name);
    
    try {
      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const startTime = performance.now();
      const result = await processFileWithMetrics(arrayBuffer);
      const processingTime = performance.now() - startTime;
      const originalSize = arrayBuffer.byteLength;
      const processedSize = result.processedBuffer.byteLength;
      
      // Create a Blob URL for the processed audio
      const processedBlob = new Blob([result.processedBuffer], { type: 'audio/wav' });
      const processedUrl = URL.createObjectURL(processedBlob);
      
      const swalResult = await Swal.fire({
        icon: 'success',
        title: 'File Processed Successfully!',
        html: `
          <div style="text-align: left;">
            <p><strong>Original Size:</strong> ${(originalSize / 1024).toFixed(2)} KB</p>
            <p><strong>Processed Size:</strong> ${(processedSize / 1024).toFixed(2)} KB</p>
            <p><strong>Compression:</strong> ${((1 - processedSize / originalSize) * 100).toFixed(1)}%</p>
            <p><strong>Processing Time:</strong> ${processingTime.toFixed(2)}ms</p>
            <p><strong>Average VAD:</strong> ${(result.averageVad * 100).toFixed(1)}%</p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Download Processed File',
        cancelButtonText: 'Close'
      });
      
      if (swalResult.isConfirmed) {
        const a = document.createElement('a');
        a.href = processedUrl;
        a.download = `processed_${file.name}`;
        a.click();
      }
      
      // Clean up the URL
      URL.revokeObjectURL(processedUrl);
      
      if (onFileProcessed) {
        onFileProcessed(result);
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
  }, [isInitialized, isLoading, onFileProcessed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find(f => f.type.startsWith('audio/'));
    
    if (audioFile) {
      handleFileSelect(audioFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  return (
    <div className="file-manager-container">
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''} ${processingFile ? 'processing' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {processingFile ? (
          <div className="processing-indicator">
            <div className="spinner"></div>
            <p>Processing {processingFile}...</p>
          </div>
        ) : (
          <>
            <svg className="upload-icon" viewBox="0 0 24 24" width="48" height="48">
              <path fill="currentColor" d="M14,13V17H10V13H7L12,8L17,13M19.35,10.03C18.67,6.59 15.64,4 12,4C9.11,4 6.6,5.64 5.35,8.03C2.34,8.36 0,10.9 0,14A6,6 0 0,0 6,20H19A5,5 0 0,0 24,15C24,12.36 21.95,10.22 19.35,10.03Z" />
            </svg>
            <p className="drop-text">Drag and drop an audio file here</p>
            <p className="drop-subtext">or</p>
            <label className="file-input-label">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileInputChange}
                disabled={!isInitialized || isLoading}
                className="file-input"
              />
              <span className="btn btn-primary">Browse Files</span>
            </label>
          </>
        )}
      </div>
      
      {!isInitialized && (
        <div className="warning-message">
          <p>⚠️ Audio engine not initialized. Please wait...</p>
        </div>
      )}
    </div>
  );
};

export default FileManager;