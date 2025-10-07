
import 'dotenv/config'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    // 1) Auth: verify bearer token and get caller
    const authorization = req.headers.get('Authorization') || req.headers.get('authorization')
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 })
    }
    const jwt = authorization.substring('Bearer '.length)
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(jwt)
    if (userErr || !userRes?.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    const callerUid = userRes.user.id

    // 2) Input
    const { email, password, name, role, storeId } = await req.json()
    if (!email || !password || !name || !role || !storeId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 3) Permission: caller must be admin
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', callerUid)
      .single()
    if (!callerProfile || callerProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied: Caller is not an admin' }, { status: 403 })
    }

    // 4) Create user in Supabase Auth
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
    })
    if (createErr || !created?.user) {
      const code = (createErr?.message || '').includes('already') ? 409 : 500
      return NextResponse.json({ error: createErr?.message || 'Failed to create user' }, { status: code })
    }
    const newUserId = created.user.id

    // 5) Upsert profile row
    const { error: upsertErr } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUserId,
        email,
        name,
        role,
        status: 'active',
        store_id: role === 'cashier' ? storeId : null,
      }, { onConflict: 'id' })
    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 })
    }

    // 6) If admin, add to store admin_uids
    if (role === 'admin') {
      const { data: store } = await supabaseAdmin
        .from('stores')
        .select('admin_uids')
        .eq('id', storeId)
        .single()
      const admin_uids = Array.isArray(store?.admin_uids) ? store!.admin_uids : []
      const newAdmins = Array.from(new Set([...admin_uids, newUserId]))
      const { error: updErr } = await supabaseAdmin
        .from('stores')
        .update({ admin_uids: newAdmins })
        .eq('id', storeId)
      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, userId: newUserId }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating employee via API route:', error)
    const msg = error?.message || 'An internal server error occurred.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
