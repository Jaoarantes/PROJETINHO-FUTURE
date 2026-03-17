import { useState, useCallback, useRef } from 'react';

interface UseConfirmDeleteReturn {
  open: boolean;
  loading: boolean;
  /** Call to open the confirmation dialog. Pass a payload to identify what to delete. */
  requestDelete: (payload?: any) => void;
  /** The payload passed to requestDelete (e.g. an id). */
  payload: any;
  /** Call after user confirms — runs the action then shows 3s loading. */
  confirmDelete: (action: () => Promise<void> | void) => void;
  /** Close the dialog without deleting. */
  cancel: () => void;
}

export function useConfirmDelete(): UseConfirmDeleteReturn {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const requestDelete = useCallback((p?: any) => {
    setPayload(p);
    setOpen(true);
  }, []);

  const cancel = useCallback(() => {
    if (!loading) {
      setOpen(false);
      setPayload(null);
    }
  }, [loading]);

  const confirmDelete = useCallback(async (action: () => Promise<void> | void) => {
    setLoading(true);
    try {
      await action();
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
    // Show loading for 3 seconds
    timerRef.current = setTimeout(() => {
      setLoading(false);
      setOpen(false);
      setPayload(null);
    }, 3000);
  }, []);

  return { open, loading, requestDelete, payload, confirmDelete, cancel };
}
