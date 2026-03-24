import { create } from 'zustand';

type OverlayVariant = 'treino' | 'post' | 'copiar';

interface SuccessOverlayState {
  open: boolean;
  variant: OverlayVariant;
  show: (variant?: OverlayVariant) => void;
  hide: () => void;
}

export const useSuccessOverlayStore = create<SuccessOverlayState>()((set) => ({
  open: false,
  variant: 'treino',
  show: (variant = 'treino') => set({ open: true, variant }),
  hide: () => set({ open: false }),
}));
