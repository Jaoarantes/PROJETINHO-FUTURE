import { useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { useExercicioCustomStore } from '../store/exercicioCustomStore';

export function useExerciciosCustom() {
  const { user } = useAuthContext();
  const carregar = useExercicioCustomStore((s) => s.carregar);
  const limpar = useExercicioCustomStore((s) => s.limpar);
  const exerciciosCustom = useExercicioCustomStore((s) => s.exerciciosCustom);
  const carregando = useExercicioCustomStore((s) => s.carregando);

  useEffect(() => {
    if (user) {
      carregar(user.id);
    } else {
      limpar();
    }
  }, [carregar, limpar, user]);

  return { exerciciosCustom, carregando };
}
