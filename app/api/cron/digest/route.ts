import { NextRequest, NextResponse } from 'next/server';
import { runSportsDigestWorker } from '@/worker/digest-worker';

export async function GET(req: NextRequest) {
  // Optional CRON secret verification
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    await runSportsDigestWorker();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error executing cron digest worker:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

