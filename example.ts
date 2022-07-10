import Apetit from "./index.ts";

const template = `
  <!DOCTYPE html>
  <html>
  <head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body>
  <nattramn-router></nattramn-router>
  <script type="module" src="nattramn-client.js"></script>
  </body>
  </html>
`;

const config = {
  server: {
    serveStatic: `./public`,
  },
  router: {
    pages: [
      {
        route: "/",
        template,
        handler: async () => ({
          body: `
      <h1>Nattramn</h1>
      <h2>Home</h2>
      <p>
        Click link to go further!<br>
        <img src="demo.png"><br>
        <img src="demo.png"><br>
        <img src="demo.png"><br>
        Read <nattramn-link href="/about">about me.</nattramn-link>
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
      <h1>Nattramn</h1>
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

const apetit = new Apetit(config);

export default {
  port: 3000,
  fetch(request: Request) {
    return apetit.handleRequests(request);
  },
};
