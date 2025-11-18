import { NextRequest, NextResponse } from 'next/server';
import { processReminderQueue } from '@/lib/reminders/queue';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/process-reminders
 * Process pending reminders in the queue
 * This endpoint will be called by Vercel Cron or external cron service
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Process reminder queue
    await processReminderQueue();
    
    return NextResponse.json({ 
      success: true,
      message: 'Reminder queue processed successfully'
    });
  } catch (error: any) {
    console.error('[Cron] Error processing reminders:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to process reminders',
        success: false
      },
      { status: 500 }
    );
  }
}

