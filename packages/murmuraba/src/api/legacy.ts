/**
 * Legacy API for backwards compatibility
 * @deprecated Use new API with engine registry
 */

import { initializeAudioEngine as init, getEngine, destroyEngine as destroy } from '../api';
import { MurmubaraConfig } from '../types';

const LEGACY_ENGINE_ID = 'legacy-default';

export async function initializeAudioEngine(config?: MurmubaraConfig): Promise<void> {
  console.warn('Using legacy initializeAudioEngine API. Consider migrating to new API with engine registry.');
  await init({ ...config, id: LEGACY_ENGINE_ID });
}

export function getGlobalEngine() {
  return getEngine(LEGACY_ENGINE_ID);
}

export async function destroyGlobalEngine(): Promise<void> {
  await destroy(LEGACY_ENGINE_ID);
}