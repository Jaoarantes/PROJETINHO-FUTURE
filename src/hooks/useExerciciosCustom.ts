import { useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { useExercicioCustomStore } from '../store/exercicioCustomStore';

export function useExerciciosCustom() {
  const { user } = useAuthContext();
  const { carregar, limpar, exerciciosCustom, carregando } = useExercicioCustomStore();

  useEffect(() => {
    if (user) {
      carregar(user.uid);
    } else {
      limpar();
    }
  }, [user?.uid]);

  return { exerciciosCustom, carregando };
}
