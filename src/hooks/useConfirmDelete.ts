import { useState, useCallback, useRef } from 'react';

interface UseConfirmDeleteReturn<TPayload> {
  open: boolean;
  loading: boolean;
  /** Call to open the confirmation dialog. Pass a payload to identify what to delete. */
  requestDelete: (payload?: TPayload) => void;
  /** The payload passed to requestDelete (e.g. an id). */
  payload: TPayload;
  /** Call after user confirms — runs the action then shows 3s loading. */
  confirmDelete: (action: () => Promise<void> | void) => void;
  /** Close the dialog without deleting. */
  cancel: () => void;
}

export function useConfirmDelete<TPayload = string>(): UseConfirmDeleteReturn<TPayload> {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<TPayload | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const requestDelete = useCallback((p?: TPayload) => {
    setPayload(p ?? null);
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

  return { open, loading, requestDelete, payload: payload as TPayload, confirmDelete, cancel };
}
