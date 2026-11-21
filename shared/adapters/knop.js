import { absoluteUrl, fetchJson } from './common.js';

const BASE = 'https://www.farmaciasknop.com';
const MAX_RESULTS = 24;

export async function search(query) {
  const url = `${BASE}/products.json?q=${encodeURIComponent(query)}&per_page=${MAX_RESULTS}`;
  const data = await fetchJson(url);
  if (!Array.isArray(data?.products)) return [];

  const offers = [];
  for (const product of data.products) {
    const price = Number(product.sale_price ?? product.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    if (product.available === false) continue;
    const regular = Number(product.regular_price ?? product.price);
    offers.push({
      name: product.name || '',
      price,
      listPrice: Number.isFinite(regular) && regular > price ? regular : null,
      url: absoluteUrl(product.url || `/products/${product.slug}`, BASE),
      image: product.images?.[0]?.src || product.images?.[0]?.url || null,
      available: true
    });
  }
  return offers;
}
