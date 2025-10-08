import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { storeName, storeLocation, adminName, email, whatsapp, password } = await req.json()

    // Create Supabase Admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // 1. Create the user in Supabase Auth
    const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm user for simplicity
    })

    if (authError) {
      console.error('Auth error:', authError.message)
      const isDuplicate = authError.message.toLowerCase().includes('duplicate key value') || authError.message.toLowerCase().includes('already registered');
      return new Response(JSON.stringify({ error: authError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: isDuplicate ? 409 : 500, // 409 Conflict for duplicate email
      })
    }
    
    if (!user) {
        throw new Error("User creation failed, but no auth error was thrown.");
    }

    const uid = user.id;
    // Generate a new, unique UUID for the store
    const storeId = crypto.randomUUID();

    // TODO: Replicate getTransactionFeeSettings from Supabase instead of Firestore
    const bonusTokens = 100; // Placeholder value for new store bonus

    // 2. Insert store and user data into the database
    const { error: storeError } = await supabaseAdmin
      .from('stores')
      .insert({
        id: storeId,
        name: storeName,
        location: storeLocation,
        pradanaTokenBalance: bonusTokens,
        adminUids: [uid],
        createdAt: new Date().toISOString(),
        transactionCounter: 0,
        firstTransactionDate: null,
      });

    if (storeError) {
        console.error('Store insert error:', storeError.message);
        await supabaseAdmin.auth.admin.deleteUser(uid);
        throw storeError;
    }

    const { error: userProfileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: uid,
        name: adminName,
        email: email,
        whatsapp: whatsapp,
        role: 'admin',
        status: 'active',
        storeId: storeId,
      })

    if (userProfileError) {
        console.error('User profile insert error:', userProfileError.message);
        await supabaseAdmin.auth.admin.deleteUser(uid);
        await supabaseAdmin.from('stores').delete().eq('id', storeId);
        throw userProfileError;
    }

    // 3. Send WhatsApp notifications (Temporarily Disabled for debugging)
    console.log('Skipping WhatsApp notifications for debugging purposes.');

    return new Response(JSON.stringify({ message: 'Store created successfully', userId: uid, storeId: storeId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Unhandled error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
