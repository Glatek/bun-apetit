import Appetit from "./index.ts";

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
    serveStatic: `./public`,
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
        Click link to go further!<br>
        <img src="demo.png"><br>
        <img src="demo.png"><br>
        <img src="demo.png"><br>
        Read <appetit-link href="/about">about me.</appetit-link>
      </p>
      `,
          head: "<title>Home - Appetit</title>",
        }),
      },
      {
        route: "/about",
        template,
        handler: async () => ({
          body: `
      <h1>Appetit</h1>
      <h2>About</h2>
      <p>Bun appetit 😘👌</p>
      `,
          head: "<title>About - Appetit</title>",
        }),
      },
    ],
  },
};

const apetit = new Appetit(config);

export default {
  port: 3000,
  fetch(request: Request) {
    return apetit.handleRequests(request);
  },
};
