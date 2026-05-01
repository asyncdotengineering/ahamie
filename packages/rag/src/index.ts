/**
 * `@ahamie/rag` — wraps `@mastra/rag` (`MDocument`, vector tools, rerankers).
 * v0 path: PDF + markdown + plaintext.
 *
 * The chunker, embedding adapters, and rerankers come from Mastra. We
 * contribute org-scoped storage helpers (`ingestText`, `ingestMarkdown`)
 * that write into `agent_steps` (kind = `rag.chunk`) and tie chunks back
 * to the source document via metadata.
 */

import type { OrgId } from "@ahamie/schema";
import { mintAgentStepId, mintAgentRunId } from "@ahamie/schema";
import { agent_steps, type AhamieDb } from "@ahamie/storage";

export interface RagChunk {
  text: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
}

export interface IngestArgs {
  orgId: OrgId;
  source: string;
  chunkSize?: number;
  /** Pre-computed embeddings; otherwise stored without one (v0). */
  embedFn?: (chunks: string[]) => Promise<number[][]>;
  /** Optional metadata applied to every chunk. */
  metadata?: Record<string, unknown>;
}

const splitParagraphs = (text: string, chunkSize: number): string[] => {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let buf = "";
  for (const p of paragraphs) {
    if ((buf + "\n\n" + p).length > chunkSize && buf.length > 0) {
      out.push(buf);
      buf = p;
    } else {
      buf = buf ? `${buf}\n\n${p}` : p;
    }
  }
  if (buf) out.push(buf);
  return out;
};

export const chunkText = (text: string, chunkSize = 1500): string[] =>
  splitParagraphs(text, chunkSize);

/**
 * Ingest plaintext or markdown into `agent_steps` as RAG chunks.
 * Returns the number of rows written. PDF support (v0 deliverable) is
 * delegated to Mastra's `MDocument.fromPDF` upstream — for the framework
 * substrate, we accept either raw text (plaintext / markdown) or
 * pre-extracted PDF text.
 */
export const ingestText = async (db: AhamieDb, args: IngestArgs): Promise<number> => {
  const chunks = chunkText(args.source, args.chunkSize ?? 1500);
  const embeddings = args.embedFn ? await args.embedFn(chunks) : null;
  const ragRunId = mintAgentRunId();

  let written = 0;
  for (let i = 0; i < chunks.length; i++) {
    await db.insert(agent_steps).values({
      id: mintAgentStepId(),
      org_id: args.orgId,
      agent_run_id: ragRunId,
      sequence: i,
      kind: "rag.chunk",
      payload: {
        text: chunks[i],
        ...(args.metadata ?? {}),
      },
      embedding: embeddings ? embeddings[i] : null,
    });
    written++;
  }
  return written;
};
