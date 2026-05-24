import { NextResponse } from 'next/server'

// Registration is managed by Shectory Portal. Local signup is disabled.
export async function POST() {
  return NextResponse.json(
    { error: 'Регистрация производится через Shectory Portal. Обратитесь к администратору.' },
    { status: 403 }
  )
}
