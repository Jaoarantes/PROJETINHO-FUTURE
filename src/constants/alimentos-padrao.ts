import type { Alimento } from '../types/dieta';

// Base de alimentos comuns brasileiros (valores por porção)
export const alimentosPadrao: Alimento[] = [
  // ─── Proteínas ─────────────────────────────────────────
  { id: 'a001', nome: 'Frango grelhado (peito)', porcao: 100, unidade: 'g', calorias: 165, proteinas: 31, carboidratos: 0, gorduras: 3.6 },
  { id: 'a002', nome: 'Ovo inteiro cozido', porcao: 50, unidade: 'unidade', calorias: 78, proteinas: 6.3, carboidratos: 0.6, gorduras: 5.3 },
  { id: 'a003', nome: 'Carne bovina (patinho)', porcao: 100, unidade: 'g', calorias: 219, proteinas: 35.9, carboidratos: 0, gorduras: 7.3 },
  { id: 'a004', nome: 'Carne moída magra', porcao: 100, unidade: 'g', calorias: 212, proteinas: 26.1, carboidratos: 0, gorduras: 11.2 },
  { id: 'a005', nome: 'Tilápia grelhada', porcao: 100, unidade: 'g', calorias: 128, proteinas: 26, carboidratos: 0, gorduras: 2.7 },
  { id: 'a006', nome: 'Atum em lata (light)', porcao: 60, unidade: 'g', calorias: 70, proteinas: 15, carboidratos: 0, gorduras: 0.5 },
  { id: 'a007', nome: 'Sardinha em lata', porcao: 60, unidade: 'g', calorias: 124, proteinas: 15, carboidratos: 0, gorduras: 7 },
  { id: 'a008', nome: 'Peito de peru defumado', porcao: 40, unidade: 'g', calorias: 42, proteinas: 8.4, carboidratos: 0.4, gorduras: 0.7 },
  { id: 'a009', nome: 'Whey Protein (1 scoop)', porcao: 30, unidade: 'g', calorias: 120, proteinas: 24, carboidratos: 3, gorduras: 1.5 },
  { id: 'a010', nome: 'Coxinha da asa (frango)', porcao: 100, unidade: 'g', calorias: 222, proteinas: 17.5, carboidratos: 0, gorduras: 16.5 },

  // ─── Laticínios ────────────────────────────────────────
  { id: 'a020', nome: 'Leite integral', porcao: 200, unidade: 'ml', calorias: 124, proteinas: 6.4, carboidratos: 9.4, gorduras: 6.6 },
  { id: 'a021', nome: 'Leite desnatado', porcao: 200, unidade: 'ml', calorias: 68, proteinas: 6.6, carboidratos: 10, gorduras: 0.4 },
  { id: 'a022', nome: 'Iogurte natural', porcao: 170, unidade: 'g', calorias: 100, proteinas: 5, carboidratos: 7, gorduras: 5.5 },
  { id: 'a023', nome: 'Iogurte grego natural', porcao: 100, unidade: 'g', calorias: 90, proteinas: 10, carboidratos: 4, gorduras: 3.5 },
  { id: 'a024', nome: 'Queijo minas frescal', porcao: 30, unidade: 'g', calorias: 73, proteinas: 5.2, carboidratos: 0.6, gorduras: 5.7 },
  { id: 'a025', nome: 'Queijo cottage', porcao: 50, unidade: 'g', calorias: 49, proteinas: 5.5, carboidratos: 1.7, gorduras: 2.2 },
  { id: 'a026', nome: 'Queijo muçarela', porcao: 30, unidade: 'g', calorias: 90, proteinas: 6.3, carboidratos: 0.6, gorduras: 7 },
  { id: 'a027', nome: 'Requeijão cremoso', porcao: 30, unidade: 'g', calorias: 82, proteinas: 1.8, carboidratos: 0.8, gorduras: 8.3 },

  // ─── Carboidratos ──────────────────────────────────────
  { id: 'a040', nome: 'Arroz branco cozido', porcao: 100, unidade: 'g', calorias: 130, proteinas: 2.7, carboidratos: 28.2, gorduras: 0.3 },
  { id: 'a041', nome: 'Arroz integral cozido', porcao: 100, unidade: 'g', calorias: 124, proteinas: 2.6, carboidratos: 25.8, gorduras: 1 },
  { id: 'a042', nome: 'Feijão carioca cozido', porcao: 80, unidade: 'g', calorias: 58, proteinas: 3.5, carboidratos: 8.5, gorduras: 0.5 },
  { id: 'a043', nome: 'Feijão preto cozido', porcao: 80, unidade: 'g', calorias: 62, proteinas: 3.4, carboidratos: 9, gorduras: 0.4 },
  { id: 'a044', nome: 'Batata doce cozida', porcao: 100, unidade: 'g', calorias: 77, proteinas: 0.6, carboidratos: 18.4, gorduras: 0.1 },
  { id: 'a045', nome: 'Batata inglesa cozida', porcao: 100, unidade: 'g', calorias: 52, proteinas: 1.2, carboidratos: 11.9, gorduras: 0.1 },
  { id: 'a046', nome: 'Macarrão cozido', porcao: 100, unidade: 'g', calorias: 131, proteinas: 5, carboidratos: 25, gorduras: 1.1 },
  { id: 'a047', nome: 'Pão francês', porcao: 50, unidade: 'unidade', calorias: 150, proteinas: 4.5, carboidratos: 28, gorduras: 1.5 },
  { id: 'a048', nome: 'Pão integral (fatia)', porcao: 25, unidade: 'fatia', calorias: 62, proteinas: 2.5, carboidratos: 11.5, gorduras: 0.7 },
  { id: 'a049', nome: 'Aveia em flocos', porcao: 30, unidade: 'g', calorias: 117, proteinas: 4.2, carboidratos: 20, gorduras: 2.1 },
  { id: 'a050', nome: 'Tapioca (goma)', porcao: 30, unidade: 'g', calorias: 108, proteinas: 0, carboidratos: 26.4, gorduras: 0 },
  { id: 'a051', nome: 'Mandioca cozida', porcao: 100, unidade: 'g', calorias: 125, proteinas: 0.6, carboidratos: 30, gorduras: 0.3 },
  { id: 'a052', nome: 'Cuscuz de milho', porcao: 100, unidade: 'g', calorias: 113, proteinas: 2.6, carboidratos: 24, gorduras: 0.6 },
  { id: 'a053', nome: 'Granola', porcao: 40, unidade: 'g', calorias: 180, proteinas: 3.6, carboidratos: 28, gorduras: 6 },

  // ─── Frutas ────────────────────────────────────────────
  { id: 'a060', nome: 'Banana prata', porcao: 75, unidade: 'unidade', calorias: 67, proteinas: 0.8, carboidratos: 17, gorduras: 0.1 },
  { id: 'a061', nome: 'Maçã', porcao: 150, unidade: 'unidade', calorias: 78, proteinas: 0.3, carboidratos: 20.7, gorduras: 0.2 },
  { id: 'a062', nome: 'Laranja', porcao: 170, unidade: 'unidade', calorias: 62, proteinas: 1, carboidratos: 15.4, gorduras: 0.2 },
  { id: 'a063', nome: 'Morango', porcao: 100, unidade: 'g', calorias: 30, proteinas: 0.9, carboidratos: 6.8, gorduras: 0.3 },
  { id: 'a064', nome: 'Uva', porcao: 100, unidade: 'g', calorias: 53, proteinas: 0.7, carboidratos: 13.6, gorduras: 0.2 },
  { id: 'a065', nome: 'Manga', porcao: 100, unidade: 'g', calorias: 51, proteinas: 0.4, carboidratos: 12.8, gorduras: 0.3 },
  { id: 'a066', nome: 'Mamão papaia', porcao: 100, unidade: 'g', calorias: 40, proteinas: 0.5, carboidratos: 10.4, gorduras: 0.1 },
  { id: 'a067', nome: 'Abacate', porcao: 100, unidade: 'g', calorias: 96, proteinas: 1.2, carboidratos: 6, gorduras: 8.4 },
  { id: 'a068', nome: 'Melancia', porcao: 100, unidade: 'g', calorias: 33, proteinas: 0.9, carboidratos: 8.1, gorduras: 0 },
  { id: 'a069', nome: 'Açaí (polpa pura)', porcao: 100, unidade: 'g', calorias: 58, proteinas: 0.8, carboidratos: 6.2, gorduras: 3.5 },

  // ─── Verduras e Legumes ────────────────────────────────
  { id: 'a080', nome: 'Brócolis cozido', porcao: 100, unidade: 'g', calorias: 25, proteinas: 2.1, carboidratos: 4, gorduras: 0.3 },
  { id: 'a081', nome: 'Alface', porcao: 50, unidade: 'g', calorias: 7, proteinas: 0.7, carboidratos: 1, gorduras: 0.1 },
  { id: 'a082', nome: 'Tomate', porcao: 100, unidade: 'g', calorias: 15, proteinas: 1.1, carboidratos: 3.1, gorduras: 0.2 },
  { id: 'a083', nome: 'Cenoura crua', porcao: 80, unidade: 'g', calorias: 26, proteinas: 0.8, carboidratos: 5.8, gorduras: 0.2 },
  { id: 'a084', nome: 'Abobrinha cozida', porcao: 100, unidade: 'g', calorias: 15, proteinas: 0.6, carboidratos: 3, gorduras: 0.1 },

  // ─── Gorduras e Oleaginosas ────────────────────────────
  { id: 'a090', nome: 'Azeite de oliva', porcao: 13, unidade: 'colher', calorias: 117, proteinas: 0, carboidratos: 0, gorduras: 13 },
  { id: 'a091', nome: 'Pasta de amendoim', porcao: 20, unidade: 'g', calorias: 117, proteinas: 4.5, carboidratos: 4, gorduras: 9.4 },
  { id: 'a092', nome: 'Castanha do Pará', porcao: 10, unidade: 'g', calorias: 66, proteinas: 1.4, carboidratos: 1.2, gorduras: 6.7 },
  { id: 'a093', nome: 'Amendoim torrado', porcao: 30, unidade: 'g', calorias: 170, proteinas: 7, carboidratos: 5, gorduras: 14 },
  { id: 'a094', nome: 'Manteiga', porcao: 10, unidade: 'g', calorias: 72, proteinas: 0.1, carboidratos: 0, gorduras: 8.1 },

  // ─── Bebidas ───────────────────────────────────────────
  { id: 'a100', nome: 'Café preto (sem açúcar)', porcao: 100, unidade: 'ml', calorias: 2, proteinas: 0.3, carboidratos: 0, gorduras: 0 },
  { id: 'a101', nome: 'Suco de laranja natural', porcao: 200, unidade: 'ml', calorias: 94, proteinas: 1.4, carboidratos: 22, gorduras: 0.2 },
  { id: 'a102', nome: 'Água de coco', porcao: 200, unidade: 'ml', calorias: 40, proteinas: 0, carboidratos: 10, gorduras: 0 },

  // ─── Diversos ──────────────────────────────────────────
  { id: 'a110', nome: 'Açúcar (1 colher)', porcao: 5, unidade: 'g', calorias: 20, proteinas: 0, carboidratos: 5, gorduras: 0 },
  { id: 'a111', nome: 'Mel (1 colher)', porcao: 21, unidade: 'colher', calorias: 64, proteinas: 0.1, carboidratos: 17.3, gorduras: 0 },
  { id: 'a112', nome: 'Chocolate amargo 70%', porcao: 25, unidade: 'g', calorias: 135, proteinas: 2, carboidratos: 12, gorduras: 9.5 },
];
