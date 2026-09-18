
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Retired fail-closed: this orphan endpoint accepted arbitrary base64 PDFs with
// service-role storage access and returned public URLs without entity ownership.
Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return new Response(JSON.stringify({
    success: false,
    retired: true,
    code: "LEGACY_PUBLIC_LEGAL_DOCUMENT_UPLOAD_RETIRED",
    error: "Use the authenticated contract/case document upload workflow",
  }), {
    status: 410,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
