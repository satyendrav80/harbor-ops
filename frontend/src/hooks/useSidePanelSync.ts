import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Generic hook to sync side panel state with URL parameters
 * Prevents flickering when opening/closing panels by tracking intentional changes
 * 
 * @param urlParamName - The URL parameter name to sync with (e.g., 'taskId', 'releaseNoteId')
 * @param initialValue - Initial value for the panel ID (null means closed)
 * @returns Object with panelId, setPanelId, and handlers for opening/closing
 */
export function useSidePanelSync(urlParamName: string, initialValue: number | null = null) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [panelId, setPanelId] = useState<number | null>(initialValue);
  
  // Track intentional changes to prevent flickering
  const isIntentionallyChangingRef = useRef(false);
  // Track if this is the first render to avoid syncing on mount
  const isFirstRenderRef = useRef(true);

  // Sync URL params with panel state
  useEffect(() => {
    // Skip on first render - we already initialized from URL
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    // Skip if we're in the middle of an intentional change
    if (isIntentionallyChangingRef.current) {
      isIntentionallyChangingRef.current = false;
      return;
    }

    const urlParam = searchParams.get(urlParamName);
    if (urlParam) {
      const id = Number(urlParam);
      if (!isNaN(id) && id !== panelId) {
        setPanelId(id);
      }
    } else if (panelId !== null) {
      // URL param was removed, close panel
      setPanelId(null);
    }
  }, [searchParams, panelId, urlParamName]);

  // Handler to open panel
  const openPanel = useCallback((id: number) => {
    isIntentionallyChangingRef.current = true;
    setPanelId(id);
    const newParams = new URLSearchParams(searchParams);
    newParams.set(urlParamName, id.toString());
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams, urlParamName]);

  // Handler to close panel
  const closePanel = useCallback(() => {
    isIntentionallyChangingRef.current = true;
    setPanelId(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(urlParamName);
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams, urlParamName]);

  return {
    panelId,
    setPanelId,
    openPanel,
    closePanel,
    isOpen: panelId !== null,
  };
}
