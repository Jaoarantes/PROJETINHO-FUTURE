import { useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { useExercicioCustomStore } from '../store/exercicioCustomStore';

export function useExerciciosCustom() {
  const { user } = useAuthContext();
  const { carregar, limpar, exerciciosCustom, carregando } = useExercicioCustomStore();

  useEffect(() => {
    if (user) {
      carregar(user.id);
    } else {
      limpar();
    }
  }, [user?.id]);

  return { exerciciosCustom, carregando };
}
