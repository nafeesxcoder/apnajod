import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const serverDirectory = path.resolve('dist/server');
const worker = `/** Static hosting boundary only: no API, auth, database or secrets. */
export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || request.method !== 'GET') return response;

    const url = new URL(request.url);
    if (/\\.[a-z0-9]+$/i.test(url.pathname)) return response;

    return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
  },
};
`;

await mkdir(serverDirectory, { recursive: true });
await writeFile(path.join(serverDirectory, 'index.js'), worker);
console.log('Prepared provider-neutral static hosting bundle in dist/server and dist/client.');
