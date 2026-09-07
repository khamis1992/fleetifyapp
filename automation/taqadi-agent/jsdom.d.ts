// The document converter uses only these JSDOM APIs in the Node worker.
declare module 'jsdom' {
  export class JSDOM {
    constructor(html: string);
    readonly window: Pick<typeof globalThis, 'DOMParser' | 'Node' | 'Element' | 'HTMLElement'> & { close(): void };
  }
}
