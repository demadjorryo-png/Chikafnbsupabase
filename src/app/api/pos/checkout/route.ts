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

    const body = await req.json()
    const { storeId, customerId, customerName, staffId, subtotal, discountAmount, totalAmount, paymentMethod, items, tableId, status, transactionFee } = body || {}
    if (!storeId || !staffId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 })
    }

    // Permission check: caller must be admin of store or cashier assigned to store
    const callerId = userRes.user.id
    const [{ data: profile }, { data: store }] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, role, store_id').eq('id', callerId).single(),
      supabaseAdmin.from('stores').select('id, admin_uids, pradana_token_balance').eq('id', storeId).single(),
    ])
    if (!profile || !store) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const isAdmin = (store.admin_uids || []).includes(callerId)
    const isCashierOfStore = profile.store_id === storeId
    if (!isAdmin && !isCashierOfStore) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Deduct transaction fee tokens if provided
    if (typeof transactionFee === 'number' && transactionFee > 0) {
      const balance = Number(store.pradana_token_balance || 0)
      if (balance < transactionFee) {
        return NextResponse.json({ error: 'Insufficient token balance' }, { status: 400 })
      }
      const { error: updErr } = await supabaseAdmin
        .from('stores')
        .update({ pradana_token_balance: balance - transactionFee })
        .eq('id', storeId)
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    // Perform checkout via RPC
    const { data: result, error: rpcErr } = await supabaseAdmin.rpc('perform_checkout', {
      p_store_id: storeId,
      p_customer_id: customerId || null,
      p_customer_name: customerName || null,
      p_staff_id: staffId,
      p_subtotal: subtotal,
      p_discount_amount: discountAmount || 0,
      p_total_amount: totalAmount,
      p_payment_method: paymentMethod,
      p_items: items,
      p_table_id: tableId || null,
      p_status: status || 'Selesai Dibayar',
    })

    if (rpcErr || !result) return NextResponse.json({ error: rpcErr?.message || 'Checkout failed' }, { status: 500 })

    // result is array of rows; pick first
    const row = Array.isArray(result) ? result[0] : result
    return NextResponse.json({ success: true, id: row.id, receiptNumber: row.receipt_number })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}

