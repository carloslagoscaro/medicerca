import { absoluteUrl, decodeEntities, fetchText, parseClp, stripTags } from './common.js';

const BASE = 'https://www.farmaciasahumada.cl';

function pricesFromTile(chunk) {
  const start = chunk.search(/<div class="price">/i);
  const block = start >= 0 ? chunk.slice(start, start + 900) : chunk;
  const text = stripTags(block);
  const amounts = [...text.matchAll(/\$\s*([\d.]{3,})/g)]
    .map((match) => parseClp(match[1]))
    .filter(Boolean);
  const listMatch = chunk.match(/class="value"[^>]*content="(\d+)"/i);
  const listPrice = listMatch ? parseClp(listMatch[1]) : null;
  const price = amounts[0] || listPrice;
  return {
    price,
    listPrice: listPrice && price && listPrice > price ? listPrice : null
  };
}

export async function search(query) {
  const url = `${BASE}/search?q=${encodeURIComponent(query)}`;
  const html = await fetchText(url);
  const chunks = html.split('class="product product-tile-wrapper');

  const offers = [];
  for (const chunk of chunks.slice(1, 30)) {
    const linkMatch = chunk.match(/<a[^>]+href="([^"]+\.html)"[^>]*>/i);
    const imageMatch = chunk.match(/<img[^>]+(?:alt|title)="([^"]{3,160})"/i);
    if (!linkMatch) continue;

    const { price, listPrice } = pricesFromTile(chunk);
    if (!price) continue;
    const name = decodeEntities(imageMatch?.[1] || '');
    if (!name) continue;

    const productUrl = absoluteUrl(linkMatch[1], BASE);
    if (!productUrl) continue;

    offers.push({
      name,
      price,
      listPrice,
      url: productUrl
    });
  }
  return offers;
}
