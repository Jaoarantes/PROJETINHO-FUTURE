import { create } from 'zustand';
import type { DiarioDieta, Refeicao, ItemRefeicao, TipoRefeicao, MetasDieta, PerfilCorporal } from '../types/dieta';
import { carregarDiarios, salvarDiario, carregarMetas, salvarMetas, carregarPerfil, salvarPerfil } from '../services/dietaFirestore';

const syncTimers = new Map<string, ReturnType<typeof setTimeout>>();
function syncDebounced(uid: string, diario: DiarioDieta) {
  const existing = syncTimers.get(diario.id);
  if (existing) clearTimeout(existing);
  syncTimers.set(
    diario.id,
    setTimeout(() => {
      salvarDiario(uid, diario).catch(console.error);
      syncTimers.delete(diario.id);
    }, 800),
  );
}

const gerarId = () => crypto.randomUUID();

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function criarDiarioVazio(data: string, metas: MetasDieta): DiarioDieta {
  const refeicoes: Refeicao[] = [
    { tipo: 'cafe', itens: [] },
    { tipo: 'almoco', itens: [] },
    { tipo: 'lanche', itens: [] },
    { tipo: 'jantar', itens: [] },
  ];
  return {
    id: data,
    data,
    refeicoes,
    aguaML: 0,
    metaCalorias: metas.calorias,
    metaProteinas: metas.proteinas,
    metaCarboidratos: metas.carboidratos,
    metaGorduras: metas.gorduras,
  };
}

const METAS_PADRAO: MetasDieta = {
  calorias: 2000,
  proteinas: 150,
  carboidratos: 250,
  gorduras: 65,
  agua: 2500,
};

interface DietaState {
  uid: string | null;
  diarios: DiarioDieta[];
  metas: MetasDieta;
  perfil: PerfilCorporal | null;
  dataSelecionada: string;
  carregando: boolean;

  setUid: (uid: string | null) => void;
  carregar: (uid: string) => Promise<void>;
  limpar: () => void;

  setData: (data: string) => void;
  getDiarioAtual: () => DiarioDieta;

  adicionarItem: (tipo: TipoRefeicao, item: Omit<ItemRefeicao, 'id'>) => void;
  removerItem: (tipo: TipoRefeicao, itemId: string) => void;
  atualizarQuantidade: (tipo: TipoRefeicao, itemId: string, quantidade: number) => void;

  adicionarAgua: (ml: number) => void;
  adicionarRefeicao: (tipo: TipoRefeicao) => void;
  removerRefeicao: (tipo: TipoRefeicao) => void;

  atualizarMetas: (metas: MetasDieta) => void;
  atualizarPerfil: (perfil: PerfilCorporal) => void;
}

export const useDietaStore = create<DietaState>()((set, get) => ({
  uid: null,
  diarios: [],
  metas: METAS_PADRAO,
  perfil: null,
  dataSelecionada: hoje(),
  carregando: false,

  setUid: (uid) => set({ uid }),

  carregar: async (uid) => {
    set({ carregando: true });
    try {
      const [diarios, metas, perfil] = await Promise.all([
        carregarDiarios(uid),
        carregarMetas(uid),
        carregarPerfil(uid),
      ]);
      set({
        diarios,
        uid,
        metas: metas ?? METAS_PADRAO,
        perfil: perfil ?? null,
      });
    } finally {
      set({ carregando: false });
    }
  },

  limpar: () => set({ diarios: [], uid: null, metas: METAS_PADRAO, perfil: null, dataSelecionada: hoje() }),

  setData: (data) => set({ dataSelecionada: data }),

  getDiarioAtual: () => {
    const { diarios, dataSelecionada, metas } = get();
    const existente = diarios.find((d) => d.id === dataSelecionada);
    if (existente) return existente;
    return criarDiarioVazio(dataSelecionada, metas);
  },

  adicionarItem: (tipo, item) => {
    const { dataSelecionada, metas } = get();
    const novoItem: ItemRefeicao = { ...item, id: gerarId() };

    set((state) => {
      let diario = state.diarios.find((d) => d.id === dataSelecionada);
      if (!diario) {
        diario = criarDiarioVazio(dataSelecionada, metas);
      }
      const diarioAtualizado: DiarioDieta = {
        ...diario,
        refeicoes: diario.refeicoes.map((r) =>
          r.tipo === tipo ? { ...r, itens: [...r.itens, novoItem] } : r,
        ),
      };
      const diarios = state.diarios.some((d) => d.id === dataSelecionada)
        ? state.diarios.map((d) => (d.id === dataSelecionada ? diarioAtualizado : d))
        : [...state.diarios, diarioAtualizado];
      return { diarios };
    });

    const { uid, diarios } = get();
    const diario = diarios.find((d) => d.id === dataSelecionada);
    if (uid && diario) salvarDiario(uid, diario).catch(console.error);
  },

  removerItem: (tipo, itemId) => {
    const { dataSelecionada } = get();

    set((state) => ({
      diarios: state.diarios.map((d) => {
        if (d.id !== dataSelecionada) return d;
        return {
          ...d,
          refeicoes: d.refeicoes.map((r) =>
            r.tipo === tipo ? { ...r, itens: r.itens.filter((i) => i.id !== itemId) } : r,
          ),
        };
      }),
    }));

    const { uid, diarios } = get();
    const diario = diarios.find((d) => d.id === dataSelecionada);
    if (uid && diario) salvarDiario(uid, diario).catch(console.error);
  },

  atualizarQuantidade: (tipo, itemId, quantidade) => {
    const { dataSelecionada } = get();

    set((state) => ({
      diarios: state.diarios.map((d) => {
        if (d.id !== dataSelecionada) return d;
        return {
          ...d,
          refeicoes: d.refeicoes.map((r) => {
            if (r.tipo !== tipo) return r;
            return {
              ...r,
              itens: r.itens.map((i) => (i.id === itemId ? { ...i, quantidade } : i)),
            };
          }),
        };
      }),
    }));

    const { uid, diarios } = get();
    const diario = diarios.find((d) => d.id === dataSelecionada);
    if (uid && diario) syncDebounced(uid, diario);
  },

  adicionarAgua: (ml) => {
    const { dataSelecionada, metas } = get();

    set((state) => {
      let diario = state.diarios.find((d) => d.id === dataSelecionada);
      if (!diario) {
        diario = criarDiarioVazio(dataSelecionada, metas);
      }
      const diarioAtualizado: DiarioDieta = {
        ...diario,
        aguaML: Math.max(0, (diario.aguaML || 0) + ml),
      };
      const diarios = state.diarios.some((d) => d.id === dataSelecionada)
        ? state.diarios.map((d) => (d.id === dataSelecionada ? diarioAtualizado : d))
        : [...state.diarios, diarioAtualizado];
      return { diarios };
    });

    const { uid, diarios } = get();
    const diario = diarios.find((d) => d.id === dataSelecionada);
    if (uid && diario) syncDebounced(uid, diario);
  },

  adicionarRefeicao: (tipo) => {
    const { dataSelecionada, metas } = get();

    set((state) => {
      let diario = state.diarios.find((d) => d.id === dataSelecionada);
      if (!diario) {
        diario = criarDiarioVazio(dataSelecionada, metas);
      }
      // Don't add if already exists
      if (diario.refeicoes.some((r) => r.tipo === tipo)) return {};
      const diarioAtualizado: DiarioDieta = {
        ...diario,
        refeicoes: [...diario.refeicoes, { tipo, itens: [] }],
      };
      const diarios = state.diarios.some((d) => d.id === dataSelecionada)
        ? state.diarios.map((d) => (d.id === dataSelecionada ? diarioAtualizado : d))
        : [...state.diarios, diarioAtualizado];
      return { diarios };
    });

    const { uid, diarios } = get();
    const diario = diarios.find((d) => d.id === dataSelecionada);
    if (uid && diario) salvarDiario(uid, diario).catch(console.error);
  },

  removerRefeicao: (tipo) => {
    const { dataSelecionada } = get();

    set((state) => ({
      diarios: state.diarios.map((d) => {
        if (d.id !== dataSelecionada) return d;
        return {
          ...d,
          refeicoes: d.refeicoes.filter((r) => r.tipo !== tipo),
        };
      }),
    }));

    const { uid, diarios } = get();
    const diario = diarios.find((d) => d.id === dataSelecionada);
    if (uid && diario) salvarDiario(uid, diario).catch(console.error);
  },

  atualizarMetas: (metas) => {
    set({ metas });
    const { uid } = get();
    if (uid) salvarMetas(uid, metas).catch(console.error);
  },

  atualizarPerfil: (perfil) => {
    set({ perfil });
    const { uid } = get();
    if (uid) salvarPerfil(uid, perfil).catch(console.error);
  },
}));
