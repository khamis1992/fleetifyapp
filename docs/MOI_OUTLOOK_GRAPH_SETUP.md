# MOI Outlook traffic-mail ingestion

Fleetify polls a dedicated Outlook folder through Microsoft Graph and applies only messages received after the first successful connection watermark. The browser never receives Microsoft access or refresh tokens.

## Azure app registration

1. In Microsoft Entra admin center, create an app registration and select **Accounts in any organizational directory and personal Microsoft accounts**.
2. Add a Web redirect URI you control for the one-time authorization-code exchange (for local setup, `http://localhost:8400/callback` is sufficient).
3. Add delegated Microsoft Graph permissions `Mail.Read` and `offline_access`, then authorize the mailbox account. Personal Hotmail/Outlook accounts should use tenant `consumers` (or `common`).
4. Exchange the authorization code at `https://login.microsoftonline.com/consumers/oauth2/v2.0/token`, store the returned refresh token as a Supabase Edge Function secret, and discard it from local history.

Required Edge Function secrets: `GRAPH_CLIENT_ID`, `GRAPH_CLIENT_SECRET`, `GRAPH_TENANT_ID`, and `GRAPH_REFRESH_TOKEN`. Optional: `GRAPH_MAILBOX` and `GRAPH_FOLDER_NAME` (defaults to a folder containing Traffic, MOI, or مخالفات). Machine authentication is not an Edge secret: the safety migration creates the dedicated Vault identity `agent_secret_traffic_mail_ingest`.

Deploy `ingest-traffic-mail` with JWT verification disabled as configured in `supabase/config.toml`; the function performs its own authorization. The first **مزامنة الآن** call records the current time and intentionally imports no historical messages.

## Scheduled invocation

After a successful authenticated manual `status` and one manual `sync`, enable a 15-minute cron that calls `public.invoke_traffic_mail_ingest_v2()`. The invoker supplies both `x-agent-id: traffic-mail-ingest` and its dedicated Vault secret. Do not use the retired `MOI_MAIL_SECRET` or `invoke_traffic_mail_ingest_v1`. Manual authenticated admin synchronization remains available on the traffic violations page.
