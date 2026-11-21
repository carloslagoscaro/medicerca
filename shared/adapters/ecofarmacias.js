import { fetchJson } from './common.js';

export async function search(query) {
  const url =
    'https://www.ecofarmacias.cl/wp-json/wc/store/v1/products?search=' +
    encodeURIComponent(query) +
    '&per_page=24&orderby=price&order=asc';
  const products = await fetchJson(url);
  if (!Array.isArray(products)) return [];

  return products
    .map((product) => {
      const prices = product.prices || {};
      const minor = Number(prices.currency_minor_unit ?? 0);
      const price = Number(prices.price) / 10 ** minor;
      const regular = Number(prices.regular_price) / 10 ** minor;
      return {
        name: product.name || '',
        price,
        listPrice: Number.isFinite(regular) && regular > price ? regular : null,
        url: product.permalink || null,
        image: product.images?.[0]?.src || null
      };
    })
    .filter((offer) => Number.isFinite(offer.price) && offer.price > 0);
}
