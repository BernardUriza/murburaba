import React from 'react';
import { useMurmubaraEngine } from 'murmuraba';
import { useAppStore } from '../../core/store/useAppStore';
import FileManager from './FileManager';

const FileProcessRoute: React.FC = () => {
  const { isInitialized, isLoading } = useMurmubaraEngine();
  const { engineConfig, setProcessedFileResult } = useAppStore();

  return (
    <FileManager
      isInitialized={isInitialized}
      isLoading={isLoading}
      engineConfig={engineConfig}
      onFileProcessed={setProcessedFileResult}
    />
  );
};

export default FileProcessRoute;