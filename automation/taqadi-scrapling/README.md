# Fleetify Taqadi Scrapling sidecar

This optional local service gives the existing Playwright filing worker an
adaptive memory for Taqadi form controls. It does not browse the portal or
perform actions. The Node worker sends only a synthetic, value-free control
map, and still verifies every returned suggestion against the live page before
using it.

## Install on the Windows filing workstation

Python 3.10 or newer and `uv` are required:

```powershell
uv sync --project automation/taqadi-scrapling
```

Generate one random token and place the same value in the sidecar environment
and `.env.taqadi-agent`:

```powershell
$tokenBytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($tokenBytes)
[Convert]::ToBase64String($tokenBytes)
```

Configure `.env.taqadi-agent`:

```dotenv
TAQADI_SCRAPLING_ENABLED=true
TAQADI_SCRAPLING_URL=http://127.0.0.1:4318
TAQADI_SCRAPLING_TOKEN=PASTE_THE_RANDOM_TOKEN
TAQADI_SCRAPLING_MIN_SIMILARITY=80
```

Start the sidecar. The npm script reads only the process environment needed by
the service from `.env.taqadi-agent` through `uv`:

```powershell
npm run taqadi:scrapling
```

Verify `http://127.0.0.1:4318/health`, then restart the Taqadi worker and run
`npm run taqadi:agent:canary`. Keep final filing disabled until the canary
reaches its expected stop point.

The adaptive database is stored under `.taqadi-agent/scrapling` by default and
must remain private to the Windows account running the filing worker.
