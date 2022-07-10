/**
 * @param {string} string
 */
function stringToElements(string) {
  const fragment = document.createRange().createContextualFragment(string);

  return [...fragment.children];
}

/**
 * @param {string} url
 */
const urlWithoutSearch = (url) =>
  url.indexOf("?") !== -1 ? url.split("?")[0] : url;

/**
 * @param {Location} docloc
 */
const documentLocationToPathnameWithSearch = (docloc) =>
  docloc.href.split(docloc.host).pop();

class AppetitRouter extends HTMLElement {
  constructor() {
    super();

    this.loading = true;
  }

  /**
   * @param {string} pathname
   */
  async navigate(pathname) {
    document.dispatchEvent(
      new CustomEvent("appetit-router:loading", {
        detail: true,
      }),
    );

    this.loading = true;

    pathname = pathname.substr(0, 1) === "/" ? pathname : `/${pathname}`;
    const headers = new Headers();

    headers.append("X-Partial-Content", "true");

    const search = pathname.indexOf("?") !== -1 ? pathname.split("?")[1] : null;
    const pathNameWithSearch = urlWithoutSearch(pathname) +
      "?partialContent=true" + (search ? "&" + search : "");

    const response = await fetch(
      document.location.origin + pathNameWithSearch,
      { headers },
    );
    const text = await response.text();
    const template = stringToElements(`<template>${text}</template>`)[0];

    const rawHeaderUpdates = response.headers.get("X-Header-Updates");

    if (rawHeaderUpdates) {
      const decoder = new TextDecoder();
      const decodedHeaderUpdates = decoder.decode(
        new Uint8Array(JSON.parse(rawHeaderUpdates)),
      );
      // @ts-ignore
      const { title } = JSON.parse(decodedHeaderUpdates);

      if (title) {
        document.title = title;
      }
    }

    requestAnimationFrame(() => {
      if (template instanceof HTMLTemplateElement) {
        const newContent = document.importNode(template.content, true);

        // @ts-ignore
        this.innerHTML = null;
        this.appendChild(newContent);
      }

      document.dispatchEvent(
        new CustomEvent("appetit-router:loading", {
          detail: false,
        }),
      );

      requestAnimationFrame(() => {
        this.scrollTop = 0;
      });
    });

    if (documentLocationToPathnameWithSearch(document.location) !== pathname) {
      window.history.pushState(
        { scrollTop: this.scrollTop },
        pathname,
        pathname,
      );
    }
  }

  connectedCallback() {
    document.addEventListener("appetit-router:navigate", (event) => {
      if (event instanceof CustomEvent) {
        const { pathname } = event.detail;

        this.navigate(pathname);
      }
    });

    window.addEventListener("popstate", (event) => {
      if (event.currentTarget instanceof Window) {
        /** @type {Location} */
        const location = event.currentTarget.document.location;
        const decodedLocation = documentLocationToPathnameWithSearch(location);

        if (decodedLocation) {
          const pathname = decodeURIComponent(decodedLocation);

          // if (history.state && 'scrollTop' in history.state) {
          //   requestAnimationFrame(() => {
          //     this.scrollTop = history.state.scrollTop;
          //   });
          // }

          this.navigate(pathname);
        } else {
          console.error("Appetit: Could not decode location.");
        }
      }
    });

    /*
	  Appetit client was cached by service worker, trigger a fetch of the
	  current page from server to replace the {{body}} injection point.
	*/
    if (this.innerHTML === "") {
      /** @type {Location} */
      const location = document.location;
      const pathnameWithSearch = documentLocationToPathnameWithSearch(location);

      if (pathnameWithSearch) {
        this.navigate(pathnameWithSearch);
      } else {
        console.error("Appetit: Did not find pathname.");
      }
    }
  }
}

window.customElements.define("appetit-router", AppetitRouter);

class AppetitLink extends HTMLElement {
  constructor() {
    super();

    this.preloadTimeout = undefined;
  }

  /**
   * @param {string} pathname
   */
  navigate(pathname) {
    document.dispatchEvent(
      new CustomEvent("appetit-router:navigate", {
        detail: {
          pathname,
        },
      }),
    );
  }

  preloadLink() {
    const href = this.getAttribute("href");
    const search = href
      ? href.indexOf("?") !== -1 ? href.split("?")[1] : null
      : null;
    const linkToPreload = href
      ? urlWithoutSearch(href) + "?partialContent=true" +
        (search ? "&" + search : "")
      : null;

    const currentLinkElement = document.querySelector(
      `link[href="${linkToPreload}"]`,
    );

    if (!currentLinkElement && linkToPreload) {
      const link = document.createElement("link");

      link.setAttribute("rel", "preload");
      link.setAttribute("href", linkToPreload);
      link.setAttribute("as", "fetch");

      document.head.appendChild(link);
    }
  }

  handleMouseOver() {
    this.preloadTimeout = setTimeout(() => {
      this.preloadLink();
      this.preloadTimeout = undefined;
    }, 65);
  }

  handleMouseOut() {
    if (this.preloadTimeout) {
      clearTimeout(this.preloadTimeout);
    }
  }

  connectedCallback() {
    const a = document.createElement("a");
    const href = this.getAttribute("href");

    if (href) {
      a.href = href;
    }

    a.innerHTML = `
	  <style>
	  :host {cursor:pointer}
	  a {all:unset;display:contents;color:currentColor}
	  </style>
	  <slot></slot>
	`;

    this.addEventListener("click", (event) => {
      event.preventDefault();
      const href = this.getAttribute("href");

      if (href) {
        this.navigate(href);
      }
    });

    this.addEventListener("mouseover", () => this.handleMouseOver(), false);
    this.addEventListener("mouseout", () => this.handleMouseOut(), false);

    const sDOM = this.attachShadow({ mode: "closed" });

    sDOM.appendChild(a);
  }
}

window.customElements.define("appetit-link", AppetitLink);
