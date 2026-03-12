import type { Alimento } from '../types/dieta';

// ─── Open Food Facts ────────────────────────────────────────────────────────

const OFF_FIELDS = 'code,product_name,product_name_pt,generic_name,brands,serving_quantity,serving_size,nutriments';

interface OFFProduct {
  code: string;
  product_name?: string;
  product_name_pt?: string;
  generic_name?: string;
  brands?: string;
  serving_quantity?: number;
  serving_size?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    'energy-kcal_serving'?: number;
    proteins_serving?: number;
    carbohydrates_serving?: number;
    fat_serving?: number;
  };
}

function parsePorcao(product: OFFProduct): { porcao: number; unidade: string } {
  if (product.serving_quantity && product.serving_quantity > 0) {
    return { porcao: product.serving_quantity, unidade: 'g' };
  }
  if (product.serving_size) {
    const match = product.serving_size.match(/(\d+(?:[.,]\d+)?)\s*(g|ml)/i);
    if (match) {
      return { porcao: parseFloat(match[1].replace(',', '.')), unidade: match[2].toLowerCase() };
    }
  }
  return { porcao: 100, unidade: 'g' };
}

function converterProdutoOFF(product: OFFProduct): Alimento | null {
  const nome = product.product_name_pt || product.product_name || product.generic_name;
  if (!nome) return null;

  const n = product.nutriments;
  if (!n) return null;

  const { porcao, unidade } = parsePorcao(product);

  let calorias: number;
  let proteinas: number;
  let carboidratos: number;
  let gorduras: number;

  if (n['energy-kcal_serving'] != null && porcao !== 100) {
    calorias = Math.round(n['energy-kcal_serving'] ?? 0);
    proteinas = +(n.proteins_serving ?? 0).toFixed(1);
    carboidratos = +(n.carbohydrates_serving ?? 0).toFixed(1);
    gorduras = +(n.fat_serving ?? 0).toFixed(1);
  } else {
    const fator = porcao / 100;
    calorias = Math.round((n['energy-kcal_100g'] ?? 0) * fator);
    proteinas = +((n.proteins_100g ?? 0) * fator).toFixed(1);
    carboidratos = +((n.carbohydrates_100g ?? 0) * fator).toFixed(1);
    gorduras = +((n.fat_100g ?? 0) * fator).toFixed(1);
  }

  if (calorias === 0 && proteinas === 0 && carboidratos === 0 && gorduras === 0) return null;

  return {
    id: `off_${product.code}`,
    nome: nome.length > 60 ? nome.slice(0, 57) + '...' : nome,
    marca: product.brands || undefined,
    porcao,
    unidade,
    calorias,
    proteinas,
    carboidratos,
    gorduras,
  };
}

// ─── USDA FoodData Central ────────────────────────────────────────────────────
// Gratuito, sem cadastro necessário (DEMO_KEY: 30 req/hora)

const USDA_KEY = import.meta.env.VITE_USDA_API_KEY || 'DEMO_KEY';

interface USDAFood {
  fdcId: number;
  description: string;
  brandOwner?: string;
  gtinUpc?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: { nutrientId: number; value: number }[];
}

function converterUSDA(food: USDAFood): Alimento | null {
  const nome = food.description;
  if (!nome) return null;

  const getNutrient = (id: number) =>
    food.foodNutrients.find((n) => n.nutrientId === id)?.value ?? 0;

  // USDA retorna valores por 100g
  const porcao = food.servingSize && food.servingSize > 0 ? food.servingSize : 100;
  const unidade = (food.servingSizeUnit || 'g').toLowerCase();
  const fator = porcao / 100;

  const calorias = Math.round(getNutrient(1008) * fator);
  const proteinas = +(getNutrient(1003) * fator).toFixed(1);
  const carboidratos = +(getNutrient(1005) * fator).toFixed(1);
  const gorduras = +(getNutrient(1004) * fator).toFixed(1);

  if (calorias === 0 && proteinas === 0 && carboidratos === 0 && gorduras === 0) return null;

  return {
    id: `usda_${food.fdcId}`,
    nome: nome.length > 60 ? nome.slice(0, 57) + '...' : nome,
    marca: food.brandOwner || undefined,
    porcao,
    unidade,
    calorias,
    proteinas,
    carboidratos,
    gorduras,
  };
}

async function buscarUSDABarcode(codigo: string): Promise<Alimento | null> {
  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?` + new URLSearchParams({
      query: codigo,
      dataType: 'Branded',
      api_key: USDA_KEY,
      pageSize: '5',
    });

    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;

    const data = await res.json();
    const foods: USDAFood[] = data.foods ?? [];

    // Prioriza resultado onde o código bate exatamente
    const exato = foods.find((f) => f.gtinUpc === codigo);
    const candidato = exato ?? foods[0];

    if (!candidato) return null;
    return converterUSDA(candidato);
  } catch (err) {
    console.error('Erro busca USDA:', err);
    return null;
  }
}

// ─── Exports públicos ─────────────────────────────────────────────────────────

export async function buscarAlimentos(termo: string, page = 1): Promise<Alimento[]> {
  if (!termo.trim()) return [];

  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?` + new URLSearchParams({
      search_terms: termo,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '30',
      page: String(page),
      fields: OFF_FIELDS,
    });

    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const products: OFFProduct[] = data.products ?? [];

    return products
      .map(converterProdutoOFF)
      .filter((a): a is Alimento => a !== null);
  } catch (err) {
    console.error('Erro busca Open Food Facts:', err);
    return [];
  }
}

export async function buscarPorCodigoBarras(codigo: string): Promise<Alimento | null> {
  // 1. Open Food Facts — world e br (melhor cobertura de produtos brasileiros)
  const offEndpoints = [
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(codigo)}.json?fields=${OFF_FIELDS}`,
    `https://br.openfoodfacts.org/api/v2/product/${encodeURIComponent(codigo)}.json?fields=${OFF_FIELDS}`,
  ];

  for (const url of offEndpoints) {
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) continue;

      const data = await res.json();
      if (data.status !== 1 || !data.product) continue;

      const alimento = converterProdutoOFF(data.product);
      if (alimento) return alimento;
    } catch (err) {
      console.error('Erro busca OFF:', err);
    }
  }

  // 2. USDA FoodData Central (sem cadastro, cobertura global)
  const usda = await buscarUSDABarcode(codigo);
  if (usda) return usda;

  return null;
}
