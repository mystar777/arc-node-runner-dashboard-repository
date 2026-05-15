import { NextResponse } from 'next/server';
import { execSync } from 'node:child_process';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (process.platform !== 'linux') {
    return NextResponse.json({
      ok: false,
      lines: [],
      error: 'journalctl is only available when the dashboard runs on Linux (same host as the node).'
    });
  }

  const { searchParams } = new URL(req.url);
  const lines = Math.min(200, Math.max(10, parseInt(searchParams.get('lines') || '80', 10) || 80));
  const unit = searchParams.get('unit') || 'both';

  const units =
    unit === 'execution'
      ? ['arc-execution']
      : unit === 'consensus'
        ? ['arc-consensus']
        : ['arc-execution', 'arc-consensus'];

  try {
    const out = execSync(
      `journalctl ${units.map((u) => `-u ${u}`).join(' ')} -n ${lines} --no-pager -o short-iso`,
      { encoding: 'utf8', timeout: 10_000, maxBuffer: 2 * 1024 * 1024 }
    );
    const parsed = out
      .split('\n')
      .map((l) => l.trimEnd())
      .filter(Boolean);
    return NextResponse.json({ ok: true, lines: parsed });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'journalctl failed';
    return NextResponse.json({ ok: false, lines: [], error: message }, { status: 502 });
  }
}
