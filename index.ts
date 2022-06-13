import {
  serve,
  extname,
  readAll,
  serveFile
} from './deps.ts';

interface PageData {
  head: string;
  body: string;
  headers?: HeadersInit;
}

interface PageHandlerCallback {
  (req: Request, params: Record<string, string>): Promise<PageData>;
}

interface Page {
  route: string;
  template: string;
  handler: PageHandlerCallback;
}

interface RouterConfig {
  pages: Page[];
}

interface ServerConfig {
  serveStatic?: string;
}

interface Config {
  server: ServerConfig;
  router: RouterConfig;
}

const MEDIA_TYPES: Record<string, string> = {
  ".md": "text/markdown",
  ".css": "text/css",
  ".html": "text/html",
  ".htm": "text/html",
  ".json": "application/json",
  ".map": "application/json",
  ".txt": "text/plain",
  ".ts": "text/typescript",
  ".tsx": "text/tsx",
  ".js": "application/javascript",
  ".jsx": "text/jsx",
  ".gz": "application/gzip",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function getContentType(path: string): string | undefined {
  return MEDIA_TYPES[extname(path)];
}

function stringToUint8Array (s: string) {
  const te = new TextEncoder();

  return te.encode(s);
}

async function sha1 (input: Uint8Array | string) {
  let data: Uint8Array;

  if (typeof input === 'string') {
    const te = new TextEncoder();
    data = te.encode(input as string);
  } else {
    data = input;
  }

  const hashBuffer = await crypto.subtle.digest('sha-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Function to decide wether or not we include the part
 * of the template before the <nattramn-router> tag or not.
 *
 * If answerWithPartialContent if true, then anything
 * before <nattramn-router> will not be sent in the request.
 */
function generatePreContent (template: string, answerWithPartialContent: boolean) {
  return answerWithPartialContent ?
    null :
    template.indexOf('<nattramn-router>') !== -1 ? template.split('<nattramn-router>')[0] : template;
}

/**
 * Function to decide wether or not we include the part
 * of the template after the <nattramn-router> tag or not.
 *
 * If answerWithPartialContent if true, then anything
 * after </nattramn-router> will not be sent in the request.
 */
function generatePostContent (template: string, answerWithPartialContent: boolean) {
  return answerWithPartialContent ?
    null :
    template.indexOf('</nattramn-router>') !== -1 ? template.split('</nattramn-router>')[1] : template;
}

function reqToURL (req: Request) {
  return new URL(req.url);
}

function canHandleRoute (req: Request, route: string) {
  const url = new URL(req.url);
  const matcher = new URLPattern({ pathname: route });
  const result = matcher.exec(url);

  return Boolean(result);
}

function routeParams (req: Request, route: string) {
  const { pathname } = reqToURL(req);
  const requestURL = pathname.split('/');
  const routeURL = route.split('/');

  return routeURL.reduce((acc, curr, i) => {
    const keyname = curr.includes(':') ? curr.split(':')[1] : undefined;

    if (keyname) {
      return {
        ...acc,
        [keyname]: requestURL[i],
      };
    }

    return acc;
  }, {});
}

async function proxy (req: Request, page: Page): Promise<PartialResponse> {
  const partialContent = Boolean(req.headers.get('x-partial-content') || reqToURL(req).searchParams.get('partialContent'));
  const pageData = await page.handler(req, routeParams(req, page.route));
  const responseBody = [];

  if (!pageData) {
    throw new Error('Could not create PageData from handler.');
  }

  const { body, head, headers: pageDataHeaders } = pageData;

  const preContent = generatePreContent(page.template, partialContent);

  const headers = new Headers(pageDataHeaders);

  headers.set('Content-Type', 'text/html');

  /*
    If we don't send preConent we still want to update the title in the header on client side navigations.
    Send new title in X-Header-Updates.
  */
   if (!preContent && head) {
    const match = head.match(/<title>(.+)<\/title>/i);

    if (match) {
      const title = match ? match[1] : '';
      const json = JSON.stringify({ title });
      const encoder = new TextEncoder();
      const data = JSON.stringify([...encoder.encode(json)]);

      headers.set('X-Header-Updates', data);
    }
  }

  if (preContent) {
    if (head) {
      const preSplit = preContent.split(/<head>/);

      responseBody.push(preSplit[0]);

      // const headMarkup = '<head>' + (config.server.minifyHTML ? minifyHTML(head) : head);
      const headMarkup = '<head>' + head;

      responseBody.push(headMarkup);
      responseBody.push(preSplit[1]);
    } else {
      return { body: preContent, status: 200 };
    }
  }

  // const mainBody = config.server.minifyHTML ? minifyHTML(body) : body;
  const mainBody = body;

  responseBody.push(partialContent ? mainBody : `<nattramn-router>${mainBody}</nattramn-router>`);

  const postContent = generatePostContent(page.template, partialContent);

  if (postContent) {
    await responseBody.push(postContent);
  }

  const finalBody = new TextEncoder().encode(responseBody.join('\n'));

  return { headers, body: finalBody, status: 200 };
}

interface PartialResponse {
  status: number;
  body: Uint8Array | string;
  headers?: Headers;
}

export default class Nattramn {
  config: Config;

  constructor (config: Config) {
    this.config = config;

    Object.freeze(this.config);
  }

  async handleRequest (req: Request): Promise<PartialResponse> {
    const url = reqToURL(req);

    const hasExtention = extname(url.pathname) !== "";

    if (hasExtention) {
      if (url.pathname === '/nattramn-client.js') {
        const version = 'v0.0.14';
        const headers = new Headers({
          'Location': `https://cdn.skypack.dev/nattramn@${version}/dist-web/index.bundled.js`,
          'ETag': btoa(version)
        });

        return {
          headers,
          status: 302,
          body: new Uint8Array([])
        };
      }

      if (this.config.server.serveStatic) {
        console.log(this.config.server.serveStatic + url.pathname);
        console.log(Deno.readDir());
        const res = await serveFile(req, this.config.server.serveStatic + url.pathname);

        return {
          headers: new Headers(res.headers),
          status: res.status,
          body: res.body
        }
      }

      throw new Error('Could not find file.');
    }

    const page = this.config.router.pages.find(page => canHandleRoute(req, page.route));

    if (page) {
      return proxy(req, page);
    } else {
      throw new Error('Could not find route.');
    }
  }

  async handleRequests (req: Request) {
    try {
      const handledRequest = this.handleRequest(req);
      const { status, headers: responseHeaders } = await handledRequest;
      let { body } = await handledRequest;

      body = body instanceof Uint8Array ? body : stringToUint8Array(body);

      const headers = responseHeaders || new Headers();

      const checksum = await sha1(body);

      headers.set('ETag', checksum);

      if (headers.get('Cache-Control') === null) {
        headers.set('Cache-Control', 'public, max-age=3600');
      }

      headers.set('Content-Length', String(body.byteLength));

      return new Response(body, { status, headers });
    } catch (e) {
      console.debug(`Nattramn was asked to answer for ${req.url} but did not find a suitable way to handle it.`);

      if (extname(req.url) === null) {
        console.debug('The route is missing.', req.url);
      }

      if (extname(req.url) !== null) {
        console.debug('The file is missing.', req.url);
      }

      console.error(e);

      return new Response('Not Found', { status: 404 });
    }
  }

  async startServer (port = 5000) {
    console.log('Nattramn is running at: http://localhost:' + port);

    await serve(r => this.handleRequests(r), { port });
  }
}
