import { fetchJson } from './common.js';

export async function search(query) {
  const url =
    'https://www.drsimi.cl/api/catalog_system/pub/products/search?ft=' +
    encodeURIComponent(query) +
    '&_from=0&_to=23';
  const products = await fetchJson(url);
  if (!Array.isArray(products)) return [];

  const offers = [];
  for (const product of products) {
    const item = product.items?.[0];
    const seller = item?.sellers?.find((entry) => entry.commertialOffer?.Price > 0) || item?.sellers?.[0];
    const price = Number(seller?.commertialOffer?.Price);
    if (!Number.isFinite(price) || price <= 0) continue;
    const listPrice = Number(seller?.commertialOffer?.ListPrice);
    offers.push({
      name: product.productName || item?.name || '',
      price,
      listPrice: Number.isFinite(listPrice) && listPrice > price ? listPrice : null,
      url: product.link ? (product.link.endsWith('/p') ? product.link : `${product.link}/p`) : null,
      image: item?.images?.[0]?.imageUrl || null,
      available: seller?.commertialOffer?.IsAvailable !== false
    });
  }
  return offers;
}
