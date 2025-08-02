import { memo } from 'react';
import { BuildInfo } from 'murmuraba';
import { UIControls } from '../../features/ui-controls';

interface AppHeaderProps {
  className?: string;
}

export const AppHeader = memo(function AppHeader({ className }: AppHeaderProps) {
  return (
    <header className={`app-header ${className || ''}`}>
      <div className="header-content">
        <div className="logo-section">
          <h1 className="app-title">
            <span className="logo-icon">🎵</span>
            Murmuraba Studio
          </h1>
          <BuildInfo format="badge" size="small" />
        </div>
        
        <UIControls className="header-controls" />
      </div>
    </header>
  );
});