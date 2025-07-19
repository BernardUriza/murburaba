import React from 'react';

interface BuildInfoProps {
  version: string;
  buildDate: string;
}

export const BuildInfo: React.FC<BuildInfoProps> = ({ version, buildDate }) => {
  return (
    <div className="build-info">
      <span>v{version}</span>
      <span className="separator">•</span>
      <span>{buildDate}</span>
    </div>
  );
};