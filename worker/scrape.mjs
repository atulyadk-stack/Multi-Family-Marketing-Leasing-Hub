const entities = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’'};

function decode(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (entity, key) => {
    if (!key.startsWith('#')) return entities[key.toLowerCase()] ?? entity;
    const code = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  });
}

function clean(text) {
  return decode(text.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function attributes(tag) {
  return Object.fromEntries(Array.from(tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g),
    ([, name, double, single, unquoted]) => [name.toLowerCase(), decode(double ?? single ?? unquoted)]));
}

export function scrapeProperty(html, source) {
  const images = new Map();
  const addImage = (raw, alt = '', score = 0) => {
    if (!raw || /(?:logo|favicon|sprite|placeholder|tracking|floor.?plan|\.svg(?:\?|$))/i.test(raw + ' ' + alt)) return;
    try {
      const url = new URL(raw, source);
      if (url.protocol !== 'https:' || url.username || url.password) return;
      const key = url.origin + url.pathname;
      const existing = images.get(key);
      images.set(key, {url: existing?.url || url.href, alt: existing?.alt || alt.slice(0, 120), score: Math.max(existing?.score ?? 0, score)});
    } catch {}
  };

  const amenities = new Set();
  const suites = new Set();
  const addFeature = (group, raw) => {
    const feature = clean(raw);
    if (feature.length >= 3 && feature.length <= 90 && ![...group].some(value => value.toLowerCase() === feature.toLowerCase())) group.add(feature);
  };

  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (attributes(script[1]).type !== 'application/ld+json') continue;
    try {
      const queue = [JSON.parse(script[2])];
      for (let index = 0; index < queue.length && index < 200; index++) {
        const entry = queue[index];
        if (Array.isArray(entry)) queue.push(...entry.slice(0, 50));
        else if (entry && typeof entry === 'object') {
          if (entry['@graph']) queue.push(entry['@graph']);
          if (!/Apartment|Residence|Accommodation|Place|House/i.test([entry['@type']].flat().join(' '))) continue;
          for (const image of [entry.photo, entry.image].flat().slice(0, 20)) {
            if (typeof image === 'string') addImage(image, '', 4);
            else if (image) addImage(image.contentUrl || image.url, image.caption, 4);
          }
          for (const item of [entry.amenityFeature].flat().slice(0, 30)) {
            if (item?.name && typeof item.name === 'string' && item.value !== false) {
              addFeature(/suite|unit|apartment|interior/i.test(item.category || '') ? suites : amenities, item.name);
            }
          }
        }
      }
    } catch {}
  }

  const page = html.replace(/<!--[\s\S]*?-->|<(script|style|nav|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  for (const [tag, kind] of page.matchAll(/<(img|meta)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi)) {
    const attrs = attributes(tag);
    if (kind.toLowerCase() === 'meta') {
      if (/^(?:og:image(?::url)?|twitter:image)$/.test(attrs.property || attrs.name || '')) addImage(attrs.content, '', 5);
    } else if (!(attrs.width && Number(attrs.width) < 240) && !(attrs.height && Number(attrs.height) < 140)) {
      const srcset = attrs['data-srcset'] || attrs.srcset;
      const candidate = srcset?.split(',').at(-1)?.trim().split(/\s+/)[0];
      const alt = attrs.alt || '';
      addImage(attrs['data-src'] || candidate || attrs.src, alt, /exterior|lobby|kitchen|suite|living room|fitness|pool|terrace|apartment/i.test(alt) ? 3 : 1);
    }
  }

  const headings = [...page.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)];
  for (const [index, heading] of headings.entries()) {
    const title = clean(heading[1]);
    const group = /(?:suite|apartment|unit|interior|in.home)\b.*(?:features|amenities)|features.*(?:suite|apartment|unit)/i.test(title)
      ? suites : /amenities|community features|building features/i.test(title) ? amenities : null;
    if (!group) continue;
    const section = page.slice(heading.index + heading[0].length, headings[index + 1]?.index).split(/<\/(?:section|main)>/i)[0];
    for (const [, item] of section.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) addFeature(group, item);
  }

  return {
    images: [...images.values()].sort((a, b) => b.score - a.score).slice(0, 6).map(({url, alt}) => ({url, alt})),
    amenities: [...amenities].slice(0, 8),
    suites: [...suites].slice(0, 8),
  };
}

export async function readListing(url, fetchPage = fetch) {
  const source = new URL(url);
  if (source.protocol !== 'https:' || source.username || source.password || source.port) throw new Error('Invalid listing source');
  const signal = AbortSignal.timeout(7000);
  let current = source;
  for (let redirects = 0; redirects < 4; redirects++) {
    const response = await fetchPage(current, {redirect: 'manual', signal, headers: {accept: 'text/html'}});
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      const target = new URL(response.headers.get('location') || '', current);
      if (target.origin !== source.origin || target.username || target.password) throw new Error('Unexpected listing redirect');
      current = target;
      continue;
    }
    if (!response.ok || !response.body || !response.headers.get('content-type')?.includes('text/html')) {
      await response.body?.cancel();
      throw new Error('Listing unavailable');
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let html = '';
    let bytes = 0;
    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 1_500_000) throw new Error('Listing exceeds the size limit');
        html += decoder.decode(value, {stream: true});
      }
    } finally {
      await reader.cancel();
    }
    return scrapeProperty(html + decoder.decode(), current);
  }
  throw new Error('Too many listing redirects');
}
