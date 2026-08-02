import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
  try {
    const { priceId, userId, email } = await req.json();

    if (!priceId || !userId) {
      return NextResponse.json({ error: 'Missing priceId or userId' }, { status: 400 });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile } = await serviceClient
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      priceId,
      userId: profile.id,
      email: profile.email,
      message: 'Use Paddle.js checkout on the client side with this priceId',
    });
  } catch (error: any) {
    console.error('Paddle checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
