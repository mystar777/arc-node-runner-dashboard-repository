import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const ARC_MCP_URL = 'https://docs.arc.io/mcp';

export type McpSearchHit = { title?: string; link?: string; page?: string; snippet?: string };

function parseSearchContent(content: unknown): McpSearchHit[] {
  if (!Array.isArray(content)) return [];
  const hits: McpSearchHit[] = [];
  for (const block of content) {
    if (typeof block !== 'object' || block === null) continue;
    const b = block as { type?: string; text?: string };
    if (b.type !== 'text' || typeof b.text !== 'string') continue;
    const t = b.text;
    const title = t.match(/Title:\s*(.+)/)?.[1]?.trim();
    const link = t.match(/Link:\s*(.+)/)?.[1]?.trim();
    const page = t.match(/Page:\s*(.+)/)?.[1]?.trim();
    const contentIdx = t.indexOf('Content:');
    const snippet =
      contentIdx >= 0 ? t.slice(contentIdx + 'Content:'.length).trim().slice(0, 600) : t.slice(0, 600);
    hits.push({ title, link, page, snippet });
  }
  return hits;
}

async function connectArcMcp(): Promise<Client> {
  const baseUrl = new URL(ARC_MCP_URL);
  const clientA = new Client({ name: 'arc-node-dashboard', version: '0.1.0' });
  try {
    await clientA.connect(new StreamableHTTPClientTransport(baseUrl));
    return clientA;
  } catch {
    await clientA.close().catch(() => {});
    const clientB = new Client({ name: 'arc-node-dashboard', version: '0.1.0' });
    await clientB.connect(new SSEClientTransport(baseUrl));
    return clientB;
  }
}

export async function arcMcpSearch(query: string): Promise<{ hits: McpSearchHit[]; rawText: string }> {
  const client = await connectArcMcp();
  try {
    const result = await client.callTool({
      name: 'search_arc_docs',
      arguments: { query }
    });
    const textParts: string[] = [];
    if (Array.isArray(result.content)) {
      for (const c of result.content) {
        if (typeof c === 'object' && c !== null && 'text' in c && typeof (c as { text: unknown }).text === 'string') {
          textParts.push((c as { text: string }).text);
        }
      }
    }
    return { hits: parseSearchContent(result.content), rawText: textParts.join('\n\n---\n\n') };
  } finally {
    await client.close();
  }
}

export async function arcMcpFilesystem(command: string): Promise<string> {
  const client = await connectArcMcp();
  try {
    const result = await client.callTool({
      name: 'query_docs_filesystem_arc_docs',
      arguments: { command }
    });
    const textParts: string[] = [];
    if (Array.isArray(result.content)) {
      for (const c of result.content) {
        if (typeof c === 'object' && c !== null && 'text' in c && typeof (c as { text: unknown }).text === 'string') {
          textParts.push((c as { text: string }).text);
        }
      }
    }
    return textParts.join('\n') || JSON.stringify(result);
  } finally {
    await client.close();
  }
}
