import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  
  return NextResponse.json({
    url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'Not found',
    keyExists: !!supabaseKey,
    keyLength: supabaseKey?.length || 0,
    env: process.env.NODE_ENV
  })
}