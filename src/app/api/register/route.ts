import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { storeName, storeLocation, adminName, email, whatsapp, password, bonusTokens } = body || {}
    if (!storeName || !storeLocation || !adminName || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const bt = typeof bonusTokens === 'number' ? bonusTokens : 0

    // 1) Create user (confirmed)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: adminName, role: 'admin', whatsapp },
    })
    if (createErr || !created?.user) {
      const code = (createErr?.message || '').includes('already') ? 409 : 500
      return NextResponse.json({ error: createErr?.message || 'Failed to create user' }, { status: code })
    }
    const userId = created.user.id

    // 2) Create store and profile
    const { data: store, error: storeErr } = await supabaseAdmin
      .from('stores')
      .insert({
        name: storeName,
        location: storeLocation,
        pradana_token_balance: bt,
        admin_uids: [userId],
        created_at: new Date().toISOString(),
        transaction_counter: 0,
        first_transaction_date: null,
      })
      .select('id')
      .single()
    if (storeErr || !store) {
      return NextResponse.json({ error: storeErr?.message || 'Failed to create store' }, { status: 500 })
    }

    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: userId, email, name: adminName, role: 'admin', status: 'active', whatsapp, store_id: store.id }, { onConflict: 'id' })
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}

