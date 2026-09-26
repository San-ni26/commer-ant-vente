// app/api/health/route.ts
// Endpoint de ping léger pour valider la connectivité réseau réelle
import { NextResponse } from 'next/server'

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}

export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 })
}
