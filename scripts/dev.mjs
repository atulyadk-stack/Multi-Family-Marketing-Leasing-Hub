import {parseArgs} from 'node:util';
import {createServer} from 'node:http';
import worker from '../dist/server/index.js';

const server = createServer(async (incoming, outgoing) => {
  try {
    const request = new Request(new URL(incoming.url, 'https://' + incoming.headers.host), {method: incoming.method});
    const response = await worker.fetch(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    outgoing.writeHead(500).end('Internal Server Error');
  }
});
const {values} = parseArgs({options: {host: {type: 'string'}, port: {type: 'string'}, strictPort: {type: 'boolean'}}});
server.listen(Number(values.port || process.env.PORT || 4173), values.host || '127.0.0.1');
