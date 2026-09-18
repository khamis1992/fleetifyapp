// Fresh native PostgreSQL cluster. No supplied URL or existing database is accepted.
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, mkdtemp, writeFile, realpath, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const exec = promisify(execFile);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export async function startTemporaryPostgres() {
  const base = fileURLToPath(new URL("../../../tmp/", import.meta.url));
  await mkdir(base, { recursive: true });
  const directory = await mkdtemp(path.join(base, "finance-postgres-"));
  const binary = (name) =>
    path.join(
      process.env.FINANCE_PG_BIN ||
        (process.platform === "win32"
          ? "C:\\Program Files\\PostgreSQL\\18\\bin"
          : ""),
      name + (process.platform === "win32" ? ".exe" : "")
    );
  const password = randomBytes(24).toString("hex");
  const passwordFile = path.join(directory, "password");
  const data = path.join(directory, "data");
  const options = {
    windowsHide: true,
    timeout: 30000,
    maxBuffer: 2 * 1024 * 1024,
  };
  let server;
  const close = async () => {
    if (server && server.exitCode === null) {
      await exec(
        binary("pg_ctl"),
        ["-D", data, "stop", "-m", "immediate", "-w", "-t", "15"],
        options
      );
    }
    // Never recursively remove an unverified or user-supplied target.
    const resolved = await realpath(directory);
    const expected = await realpath(base);
    if (
      path.dirname(resolved) !== expected ||
      !path.basename(resolved).startsWith("finance-postgres-")
    ) {
      throw new Error(
        "Refusing to remove a directory outside the isolated test root"
      );
    }
    await rm(resolved, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
  };
  try {
    await writeFile(passwordFile, password, { mode: 0o600 });
    await exec(
      binary("initdb"),
      [
        "-D",
        data,
        "-U",
        "postgres",
        "--auth=scram-sha-256",
        "--pwfile=" + passwordFile,
        "--encoding=UTF8",
        "--locale=C",
      ],
      options
    );
    const listener = createServer();
    await new Promise((resolve, reject) =>
      listener.once("error", reject).listen(0, "127.0.0.1", resolve)
    );
    const port = listener.address().port;
    await new Promise((resolve) => listener.close(resolve));
    let startupError;
    server = spawn(
      binary("postgres"),
      [
        "-D",
        data,
        "-h",
        "127.0.0.1",
        "-p",
        String(port),
        "-c",
        "max_connections=20",
      ],
      { windowsHide: true, stdio: ["ignore", "ignore", "ignore"] }
    );
    server.once("error", (error) => {
      startupError = error;
    });
    const config = {
      host: "127.0.0.1",
      port,
      database: "postgres",
      user: "postgres",
      password,
      connectionTimeoutMillis: 1000,
      statement_timeout: 15000,
    };
    for (let attempt = 0; attempt < 60; attempt++) {
      if (startupError) throw startupError;
      if (server.exitCode !== null)
        throw new Error("Temporary PostgreSQL exited during startup");
      const client = new pg.Client(config);
      try {
        await client.connect();
        const version = (await client.query("SHOW server_version")).rows[0]
          .server_version;
        await client.end();
        return { config, close, version };
      } catch (error) {
        await client.end().catch(() => {});
        if (attempt === 59) throw error;
        await pause(200);
      }
    }
  } catch (error) {
    await close();
    throw error;
  }
}
