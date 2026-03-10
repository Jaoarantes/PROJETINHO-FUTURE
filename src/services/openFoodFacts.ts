import type { Alimento } from '../types/dieta';

const BASE_URL = 'https://world.openfoodfacts.org';
const FIELDS = 'code,product_name,product_name_pt,brands,serving_quantity,serving_size,nutriments';

interface OFFProduct {
  code: string;
  product_name?: string;
  product_name_pt?: string;
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

function converterProduto(product: OFFProduct): Alimento | null {
  const nome = product.product_name_pt || product.product_name;
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

  // Keep products that have at least SOME nutrition data
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

export async function buscarAlimentos(termo: string, page = 1): Promise<Alimento[]> {
  if (!termo.trim()) return [];

  try {
    const url = `${BASE_URL}/cgi/search.pl?` + new URLSearchParams({
      search_terms: termo,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '30',
      page: String(page),
      fields: FIELDS,
    });

    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const products: OFFProduct[] = data.products ?? [];

    return products
      .map(converterProduto)
      .filter((a): a is Alimento => a !== null);
  } catch (err) {
    console.error('Erro busca Open Food Facts:', err);
    return [];
  }
}

export async function buscarPorCodigoBarras(codigo: string): Promise<Alimento | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/api/v2/product/${encodeURIComponent(codigo)}.json?fields=${FIELDS}`,
      { mode: 'cors' }
    );
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    return converterProduto(data.product);
  } catch (err) {
    console.error('Erro busca código de barras:', err);
    return null;
  }
}
