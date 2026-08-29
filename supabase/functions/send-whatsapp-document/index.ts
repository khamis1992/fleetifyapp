
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Retired fail-closed: the former endpoint embedded provider credentials,
// accepted arbitrary recipients and exposed uploaded PDFs through public URLs.
Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return new Response(JSON.stringify({
    success: false,
    retired: true,
    error: "Legacy WhatsApp document sender is disabled; use an audited document-delivery workflow",
  }), {
    status: 410,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
