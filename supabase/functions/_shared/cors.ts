// Supabase Edge Functions don't add CORS headers automatically. Any
// function invoked directly from the browser (via supabase.functions.invoke)
// needs to handle the preflight OPTIONS request and include these headers
// on every response — including error responses — or the browser blocks
// the request before your code even runs.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
