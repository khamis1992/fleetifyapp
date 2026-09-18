import ts from 'typescript';
import { resolve } from 'node:path';
const entry = resolve('supabase/functions/contract-id-scanner/index.ts');
const runtime = resolve('.tmp/identity-deno-runtime.d.ts');
const options = { noEmit: true, strict: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, allowImportingTsExtensions: true, types: [] };
const host = ts.createCompilerHost(options);
const read = host.readFile.bind(host);
host.readFile = (file) => resolve(file) === runtime
  ? 'declare const Deno: { env: { get(key: string): string | undefined }; serve(handler: (request: Request) => Response | Promise<Response>): void };'
  : read(file)?.replace(/https:\/\/esm.sh\/@supabase\/supabase-js@[\d.]+/g, '@supabase/supabase-js').replace('https://esm.sh/pdf-lib@1.17.1', 'pdf-lib');
const exists = host.fileExists.bind(host);
host.fileExists = (file) => resolve(file) === runtime || exists(file);
const program = ts.createProgram([entry, runtime], options, host);
const errors = ts.getPreEmitDiagnostics(program);
if (errors.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(errors, { getCurrentDirectory: () => process.cwd(), getCanonicalFileName: (name) => name, getNewLine: () => '\n' }));
  process.exitCode = 1;
} else console.log('PASS: Edge Function and shared modules type-check against the installed SDK types.');
