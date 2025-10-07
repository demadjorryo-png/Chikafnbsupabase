import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || req.headers.get('Authorization')
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = auth.slice('Bearer '.length)
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userRes?.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    const callerId = userRes.user.id

    const { storeId, amount } = await req.json()
    if (!storeId || typeof amount !== 'number' || amount === 0) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 })
    }

    // Check caller permissions: admin of store or cashier assigned to store
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, role, store_id')
      .eq('id', callerId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
    }

    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('id, admin_uids, pradana_token_balance')
      .eq('id', storeId)
      .single()

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const isAdmin = (store.admin_uids || []).includes(callerId)
    const isCashierOfStore = profile.store_id === storeId
    if (!isAdmin && !isCashierOfStore) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const current = Number(store.pradana_token_balance || 0)
    if (amount > 0 && current < amount) {
      return NextResponse.json({ error: 'Insufficient token balance' }, { status: 400 })
    }

    const newBalance = amount > 0 ? current - amount : current + Math.abs(amount)
    const { error: updErr } = await supabaseAdmin
      .from('stores')
      .update({ pradana_token_balance: newBalance })
      .eq('id', storeId)

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, balance: newBalance })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}
