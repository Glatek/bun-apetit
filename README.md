# Appetit

A continuation of [Nattramn](https://github.com/glatek/nattramn) for
[Bun](https://bun.sh).

Allows for a simple way of creating universal web applications - partly
following the [PRPL pattern](https://web.dev/apply-instant-loading-with-prpl/).
Using web components for the client side logic.

## Usage

Import the Appetit class and provide a config.

Include `<script type="module" src="/appetit-client.js"></script>` in your HTML
template to be able to use the web component for the router and link.

For each page handler in the router config, a template is used as a stencil and
will stamp the output of the handler method into
`<appetit-router></appetit-router>`.

Use the `<appetit-link>` web component for routes you wish to use soft
navigation for. The route will be prefetched on hover similar to
[instant.page](https://instant.page/).

### Example

```typescript
import Appetit from "bun-appetit";

const template = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body>
    <appetit-router></appetit-router>
    <script type="module" src="appetit-client.js"></script>
  </body>
  </html>
`;

const config = {
  server: {
    compression: true,
    serveStatic: "public",
    minifyHTML: true,
  },
  router: {
    pages: [
      {
        route: "/",
        template,
        handler: async () => ({
          body: `
            <h1>Appetit</h1>
            <h2>Home</h2>
            <p>
              Click link to go further!
              Read <appetit-link href="/about">about me.</appetit-link>
            </p>
            `,
          head: "<title>Home - Nattramn</title>",
        }),
      },
      {
        route: "/about",
        template,
        handler: async () => ({
          body: `
            <h1>Appetit</h1>
            <h2>About</h2>
            <p>The Nattramn only occationally shows himself[1] and is said to be ghost of a suicide[2].</p>
            <small>1) This library sends partial content on some requests.</small>
            <small>2) Node.js 🤡.</small>
          `,
          head: "<title>About - Nattramn</title>",
        }),
      },
    ],
  },
};

const appetit = new Appetit(config);

appetit.serve(5000);
```

## What does Appetit do.

Express-like functionally with handlers for route, with the big difference that
when partial content is requested only the `<body>` content of the next page is
fetched and replaces the inner content of `<appetit-router>`. There is also
support for `<title>` in `<head>`, but not any other tags in head - as they
usually do not matter for client side changes.
