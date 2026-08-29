import http from 'node:http';
import { agentConfig, assertAgentConfig } from './config';
import { TaqadiWorker } from './runner';

assertAgentConfig();

const worker = new TaqadiWorker();
const healthServer = http.createServer(async (request, response) => {
  if (request.url !== '/health') {
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'not_found' }));
    return;
  }

  response.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  const browser = await worker.browserDiagnostics().catch(() => ({
    available: false,
  }));
  response.end(JSON.stringify({
    status: 'ok',
    workerId: agentConfig.workerId,
    version: agentConfig.version,
    process: {
      pid: process.pid,
      platform: process.platform,
    },
    mode: {
      stopAfterParties: agentConfig.stopAfterParties,
      guidedMode: agentConfig.guidedMode,
      finalApproval: agentConfig.finalApproval,
      pauseBeforeFinalApproval: agentConfig.pauseBeforeFinalApproval,
      headless: agentConfig.headless,
      tawtheeqAutoLogin: Boolean(
        agentConfig.tawtheeq.smartCardPin
        || (
          agentConfig.tawtheeq.username
          && agentConfig.tawtheeq.password
        ),
      ),
    },
    runtime: worker.runtime,
    browser,
  }));
});

healthServer.listen(agentConfig.healthPort, '127.0.0.1', () => {
  console.log(
    `[TaqadiAgent] health endpoint: http://127.0.0.1:${agentConfig.healthPort}/health`,
  );
});

let stopping = false;
let fatalStopping = false;
const stopWorkerWithin = async (timeoutMs: number) => {
  await Promise.race([
    worker.stop().catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
};

const shutdown = async () => {
  if (stopping) return;
  stopping = true;
  console.log('[TaqadiAgent] shutting down...');
  healthServer.close();
  await stopWorkerWithin(10_000);
  process.exit(0);
};

const fatalExit = async (source: string, error: unknown) => {
  if (fatalStopping) return;
  fatalStopping = true;
  const normalizedError = error instanceof Error
    ? error
    : new Error(String(error));
  console.error(`[TaqadiAgent] ${source}:`, normalizedError);
  healthServer.close();
  await stopWorkerWithin(10_000);
  process.exit(1);
};

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
process.on('uncaughtException', (error) => {
  void fatalExit('uncaught exception', error);
});
process.on('unhandledRejection', (error) => {
  void fatalExit('unhandled rejection', error);
});

worker.start().catch((error) => void fatalExit('fatal worker error', error));
