import { absoluteUrl, decodeEntities, fetchText, parseClp } from './common.js';

const BASE = 'https://farmacia.araucomed.com';

export async function search(query) {
  const url = `${BASE}/busqueda?s=${encodeURIComponent(query)}`;
  const html = await fetchText(url);
  const chunks = html.split('<article class="product-miniature');

  const offers = [];
  for (const chunk of chunks.slice(1, 30)) {
    const linkMatch = chunk.match(/<a[^>]+href="([^"]+)"[^>]*class="thumbnail/i);
    const titleMatch =
      chunk.match(/class="[^"]*product-title[^"]*"[^>]*>[\s\S]{0,220}?<a[^>]*>([\s\S]*?)<\/a>/i) ||
      chunk.match(/<img[^>]+alt="([^"]{3,160})"/i);
    const priceMatch = chunk.match(/class="price\s*"[^>]*>\s*\$?\s*([\d.]+)/i);
    if (!linkMatch || !priceMatch) continue;

    const price = parseClp(priceMatch[1]);
    if (!price) continue;
    const name = decodeEntities(String(titleMatch?.[1] || '').replace(/<[^>]*>/g, ' '));
    if (!name) continue;

    const productUrl = absoluteUrl(linkMatch[1], BASE);
    if (!productUrl) continue;

    const imageMatch = chunk.match(/data-src="([^"]+\.(?:jpg|jpeg|png|webp))"/i);
    offers.push({
      name,
      price,
      url: productUrl,
      image: imageMatch ? absoluteUrl(imageMatch[1], BASE) : null
    });
  }
  return offers;
}
