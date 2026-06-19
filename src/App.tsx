import { useCallback, useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { AppHeader } from './components/AppHeader';
import { Explorer } from './Explorer';

export function App() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  return (
    <div className="app">
      <AppHeader onToggleFullscreen={toggleFullscreen} isFullscreen={isFullscreen} />
      <div className="stage">
        <ReactFlowProvider>
          <Explorer />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
