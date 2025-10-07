import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { customerName, storeName, itemsOrdered, currentTime, notificationStyle } = await req.json()
    const items = Array.isArray(itemsOrdered) ? itemsOrdered.join(', ') : ''
    const style = notificationStyle === 'pantun'
      ? `Ada pantun manis untukmu!`
      : `Info singkat untukmu!`
    const text = `${style}\nHalo ${customerName}, pesanan kamu di ${storeName} sudah siap pada ${currentTime}. Item: ${items}. Terima kasih!`
    return NextResponse.json({ followUpMessage: text })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 400 })
  }
}

