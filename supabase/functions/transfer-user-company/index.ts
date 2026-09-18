
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// The application uses the atomic transfer_user_to_company RPC directly.
// Keeping a second service-role writer here would allow a future caller to
// bypass the RPC's super-admin, source-company and transaction guards.
Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return new Response(JSON.stringify({
    success: false,
    retired: true,
    error: "Legacy transfer endpoint retired; use transfer_user_to_company",
  }), {
    status: 410,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
