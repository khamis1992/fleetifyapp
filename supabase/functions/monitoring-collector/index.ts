
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// Retired: this endpoint accepted arbitrary authenticated payloads and then
// wrote them with service-role privileges. Signed monitoring integrations must
// use api-monitoring-webhook, which verifies timestamped HMAC requests.
Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  return new Response(JSON.stringify({
    success: false,
    code: "LEGACY_MONITORING_COLLECTOR_RETIRED",
    error: "Use the signed api-monitoring-webhook integration",
  }), { status: 410, headers });
});
