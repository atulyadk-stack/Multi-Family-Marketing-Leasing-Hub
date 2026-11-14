import {assets} from './assets.mjs';
import {demoListingHtml, findProperty} from './property-listings.mjs';
import {readListing, scrapeProperty} from './scrape.mjs';

const htmlHeaders = {'content-type': 'text/html; charset=utf-8'};
const cache = new Map();

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== 'GET') return new Response(null, {status: 405, headers: {allow: 'GET'}});
    const match = url.pathname.match(/^\/(api\/property-website|property-websites)\/([a-z0-9-]+)$/);
    if (match) {
      const [, route, id] = match;
      const property = findProperty(id);
      if (!property?.website) return new Response('Property website not configured', {status: 404});
      if (route === 'property-websites') {
        const html = property.demoWebsite && demoListingHtml(property);
        return html ? new Response(html, {headers: htmlHeaders}) : new Response('Not found', {status: 404});
      }
      const cached = cache.get(id);
      if (cached?.expires > Date.now()) return Response.json(cached.data);
      try {
        const source = new URL(property.website, url.origin);
        const content = property.demoWebsite ? scrapeProperty(demoListingHtml(property), source) : await readListing(source);
        const data = {...content, updatedAt: new Date().toISOString()};
        cache.set(id, {data, expires: Date.now() + 60 * 60 * 1000});
        return Response.json(data);
      } catch {
        return Response.json({error: 'The listing could not be read.'}, {status: 502});
      }
    }
    const asset = Object.hasOwn(assets, url.pathname) && assets[url.pathname];
    return asset ? new Response(asset.body, {headers: {'content-type': asset.type}}) : new Response('Not found', {status: 404});
  },
};
