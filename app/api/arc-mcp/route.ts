import { NextResponse } from 'next/server';
import { arcMcpFilesystem, arcMcpSearch } from '@/lib/arcMcp';

export const maxDuration = 60;

type Body = {
  mode: 'search' | 'filesystem';
  query?: string;
  command?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    if (body.mode === 'search') {
      const q = typeof body.query === 'string' ? body.query.trim() : '';
      if (!q) {
        return NextResponse.json({ error: 'query가 필요합니다.' }, { status: 400 });
      }
      const { hits, rawText } = await arcMcpSearch(q);
      return NextResponse.json({ ok: true, hits, rawText });
    }
    if (body.mode === 'filesystem') {
      const cmd = typeof body.command === 'string' ? body.command.trim() : '';
      if (!cmd) {
        return NextResponse.json({ error: 'command가 필요합니다.' }, { status: 400 });
      }
      const output = await arcMcpFilesystem(cmd);
      return NextResponse.json({ ok: true, output });
    }
    return NextResponse.json({ error: 'mode는 search 또는 filesystem 이어야 합니다.' }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'MCP 호출 실패';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
