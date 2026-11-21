import { absoluteUrl, fetchJson } from './common.js';

const APP_ID = 'GM3RP06HJG';
const SEARCH_KEY = '0259fe250b3be4b1326eb85e47aa7d81';
const INDEX = 'sb_variant_production';
const BASE = 'https://salcobrand.cl';

export async function search(query) {
  const data = await fetchJson(
    `https://${APP_ID.toLowerCase()}-dsn.algolia.net/1/indexes/${INDEX}/query`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-algolia-api-key': SEARCH_KEY,
        'x-algolia-application-id': APP_ID,
        referer: `${BASE}/`,
        origin: BASE
      },
      body: JSON.stringify({ query, hitsPerPage: 24 })
    }
  );
  if (!Array.isArray(data?.hits)) return [];

  const offers = [];
  for (const hit of data.hits) {
    if (hit.has_stock === false) continue;
    const normal = Number(hit.normal_price);
    const discounted = Number(hit.direct_discount);
    const price = Number.isFinite(discounted) && discounted > 0 ? discounted : normal;
    if (!Number.isFinite(price) || price <= 0) continue;
    offers.push({
      name: hit.name || '',
      price,
      listPrice: Number.isFinite(normal) && normal > price ? normal : null,
      url: hit.slug ? absoluteUrl(`/products/${hit.slug}`, BASE) : null,
      image: hit.catalog_image_url || hit.thumbnail_image_url || null,
      available: true
    });
  }
  return offers;
}
