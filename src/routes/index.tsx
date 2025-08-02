import { lazy } from 'react';

// Lazy load route components for code splitting
export const RecordRoute = lazy(() => import('../features/audio-recording/RecordRoute'));
export const FileProcessRoute = lazy(() => import('../features/file-management/FileProcessRoute'));
export const DemoRoute = lazy(() => import('../features/demo/DemoRoute'));