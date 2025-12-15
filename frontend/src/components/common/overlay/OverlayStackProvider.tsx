import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

type OverlayKind = 'overlay' | 'popover';

type StackEntry = {
  id: string;
  kind: OverlayKind;
  onClose?: () => void;
  closeOnEscape?: boolean;
};

type Registered = {
  id: string;
  kind: OverlayKind;
  zIndexContent: number;
  zIndexBackdrop?: number;
  unregister: () => void;
};

type OverlayStackContextValue = {
  register: (
    kind: OverlayKind,
    options?: {
      closeOnEscape?: boolean;
      onClose?: () => void;
    }
  ) => Registered;
};

const OverlayStackContext = createContext<OverlayStackContextValue | null>(null);

const OVERLAY_BASE = 60; // base for panels / modals
const OVERLAY_STEP = 10;
const POPOVER_BASE = 150; // always above overlays
const POPOVER_STEP = 5;

// Simple ID generator that doesn't use hooks
function generateId(prefix = 'ovl'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function OverlayStackProvider({ children }: PropsWithChildren) {
  const [stack, setStack] = useState<StackEntry[]>([]);
  const stackRef = useRef<StackEntry[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);

  const register = useCallback(
    (
      kind: OverlayKind,
      options?: {
        closeOnEscape?: boolean;
        onClose?: () => void;
      }
    ): Registered => {
      const id = generateId(kind === 'overlay' ? 'ovl' : 'pop');
      const entry: StackEntry = {
        id,
        kind,
        onClose: options?.onClose,
        closeOnEscape: options?.closeOnEscape ?? true,
      };
      
      // Compute z-index based on current stack (before adding this entry)
      const currentStack = stackRef.current;
      const overlays = currentStack.filter((s) => s.kind === 'overlay').length + (kind === 'overlay' ? 1 : 0);
      const popovers = currentStack.filter((s) => s.kind === 'popover').length + (kind === 'popover' ? 1 : 0);

      const zIndexContent =
        kind === 'overlay'
          ? OVERLAY_BASE + (overlays - 1) * OVERLAY_STEP + 1
          : POPOVER_BASE + (popovers - 1) * POPOVER_STEP + 1;

      const zIndexBackdrop =
        kind === 'overlay' ? OVERLAY_BASE + (overlays - 1) * OVERLAY_STEP : undefined;

      // Update state and ref
      setStack((prev) => {
        const newStack = [...prev, entry];
        stackRef.current = newStack;
        return newStack;
      });

      const unregister = () => {
        setStack((prev) => {
          const newStack = prev.filter((e) => e.id !== id);
          stackRef.current = newStack;
          return newStack;
        });
      };

      return { id, kind, zIndexContent, zIndexBackdrop, unregister };
    },
    []
  );

  // Handle global Escape: close only the top-most entry with closeOnEscape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (stack.length === 0) return;

      // Top-most = last entry
      const top = [...stack].reverse().find((e) => e.closeOnEscape);
      if (!top) return;

      event.preventDefault();
      event.stopPropagation();
      // Remove the entry first
      setStack((prev) => prev.filter((e) => e.id !== top.id));
      top.onClose?.();
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [stack]);

  const value = useMemo<OverlayStackContextValue>(() => ({ register }), [register]);

  return <OverlayStackContext.Provider value={value}>{children}</OverlayStackContext.Provider>;
}

export function useOverlayStack() {
  const ctx = useContext(OverlayStackContext);
  if (!ctx) {
    throw new Error('useOverlayStack must be used within OverlayStackProvider');
  }
  return ctx;
}

