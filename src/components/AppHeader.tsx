import { digitallWordmark } from '../theme/digitallLogo';

interface AppHeaderProps {
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
}

export function AppHeader({ onToggleFullscreen, isFullscreen }: AppHeaderProps) {
  return (
    <header className="app-header">
      <span
        className="wordmark"
        aria-label="DIGITALL"
        // The real DIGITALL wordmark, rendered monochrome white for the blue header.
        dangerouslySetInnerHTML={{ __html: digitallWordmark('#ffffff') }}
      />
      <div className="titles">
        <span className="title">Webshop KPI Explorer</span>
        <span className="subtitle">From a single operational lever up to Net Profit</span>
      </div>
      <div className="spacer" />
      <button className="header-btn" onClick={onToggleFullscreen}>
        {isFullscreen ? 'Exit presenter' : 'Presenter mode'}
      </button>
    </header>
  );
}
