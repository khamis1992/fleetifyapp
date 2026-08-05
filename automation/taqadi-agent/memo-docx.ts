import JSZip from 'jszip';
import { JSDOM } from 'jsdom';
import { createDocxDocumentFromHtml } from '../../src/utils/document-export';

export const MEMO_DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document' as const;

const DOM_GLOBAL_NAMES = [
  'DOMParser',
  'Node',
  'Element',
  'HTMLElement',
] as const;

type DomGlobalName = typeof DOM_GLOBAL_NAMES[number];

function removeInvalidXmlControls(html: string) {
  // Keep tab, line feed, and carriage return; remove the remaining C0 controls.
  // eslint-disable-next-line no-control-regex
  return html.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
}

async function withHtmlDom<T>(html: string, action: () => Promise<T>) {
  const dom = new JSDOM(html);
  const globals = globalThis as unknown as Record<string, unknown>;
  const previous = new Map<DomGlobalName, unknown>();

  for (const name of DOM_GLOBAL_NAMES) {
    previous.set(name, globals[name]);
    globals[name] = dom.window[name];
  }

  try {
    return await action();
  } finally {
    for (const name of DOM_GLOBAL_NAMES) {
      const value = previous.get(name);
      if (value === undefined) delete globals[name];
      else globals[name] = value;
    }
    dom.window.close();
  }
}

export async function isValidDocxBuffer(data: Buffer | Uint8Array) {
  try {
    const archive = await JSZip.loadAsync(data);
    const contentTypes = archive.file('[Content_Types].xml');
    const documentFile = archive.file('word/document.xml');
    if (!contentTypes || !documentFile) return false;

    const documentXml = await documentFile.async('string');
    return /<w:document[\s>]/.test(documentXml)
      && /<w:t(?:\s|>)/.test(documentXml);
  } catch {
    return false;
  }
}

export async function createMemoDocxBuffer(html: string) {
  const source = removeInvalidXmlControls(html.trim());
  if (!source) throw new Error('Memo HTML is empty');

  const buffer = await withHtmlDom(source, async () => {
    const result = await createDocxDocumentFromHtml(source);
    return Buffer.from(await result.docxModule.Packer.toBuffer(result.document));
  });

  if (!(await isValidDocxBuffer(buffer))) {
    throw new Error('Generated memo is not a valid DOCX document');
  }
  return buffer;
}
