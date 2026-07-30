import http from 'node:http';
import { agentConfig, assertAgentConfig } from './config';
import { TaqadiWorker } from './runner';

assertAgentConfig();

const worker = new TaqadiWorker();
const healthServer = http.createServer((request, response) => {
  if (request.url !== '/health') {
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'not_found' }));
    return;
  }

  response.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
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
      finalApproval: agentConfig.finalApproval,
      headless: agentConfig.headless,
      tawtheeqAutoLogin: Boolean(
        agentConfig.tawtheeq.username
        && agentConfig.tawtheeq.password,
      ),
    },
    runtime: worker.runtime,
  }));
});

healthServer.listen(agentConfig.healthPort, '127.0.0.1', () => {
  console.log(
    `[TaqadiAgent] health endpoint: http://127.0.0.1:${agentConfig.healthPort}/health`,
  );
});

let stopping = false;
const shutdown = async () => {
  if (stopping) return;
  stopping = true;
  console.log('[TaqadiAgent] shutting down...');
  healthServer.close();
  await worker.stop();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

worker.start().catch(async (error) => {
  console.error('[TaqadiAgent] fatal error:', error);
  await worker.stop().catch(() => undefined);
  healthServer.close();
  process.exit(1);
});
