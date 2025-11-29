
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get('phone');

    if (!phone) {
        return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('phone', phone)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const otp = data && data.length > 0 ? data[0] : null;
    return NextResponse.json({ otp });
}
