import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    return new Response('Missing Supabase env', { status: 500 })
  }

  const supabase = createClient(url, key)

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}))
    const name = body?.name ?? 'world'
    return new Response(JSON.stringify({ message: `Hello ${name}` }), {
      headers: { 'content-type': 'application/json' },
    })
  }

  const { data: { user } } = await supabase.auth.getUser()
  return new Response(JSON.stringify({ status: 'ok', user: user ?? null }), {
    headers: { 'content-type': 'application/json' },
  })
})
