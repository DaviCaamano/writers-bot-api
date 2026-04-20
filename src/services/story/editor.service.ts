import pool from '@/config/database';
import anthropic from '@/config/anthropic';
import { ClaudeModel } from '@/constants/anthropic-models';
import { DocumentRow } from '@/types/database';
import { DocumentNotFoundError, InvalidSelectionError } from '@/constants/error/custom-errors';
import { Response } from 'express';

async function fetchContextDocuments(userId: string, documentId: string): Promise<DocumentRow[]> {
  const result = await pool.query<DocumentRow>(
    `SELECT d2.document_id, d2.title, d2.body, d2.predecessor_id, d2.successor_id,
            d2.story_id, d2.created_at, d2.updated_at
     FROM documents d
     JOIN stories s ON s.story_id = d.story_id
     JOIN worlds w ON w.world_id = s.world_id
     JOIN documents d2 ON d2.story_id = d.story_id
       AND (
         d2.document_id = d.document_id
         OR d2.document_id = d.predecessor_id
         OR d2.document_id = d.successor_id
       )
     WHERE d.document_id = $1 AND w.user_id = $2
     ORDER BY CASE
       WHEN d2.document_id = d.predecessor_id THEN 0
       WHEN d2.document_id = d.document_id    THEN 1
       WHEN d2.document_id = d.successor_id   THEN 2
     END`,
    [documentId, userId],
  );

  if (result.rows.length === 0) throw new DocumentNotFoundError();
  return result.rows;
}

export async function editText(
  userId: string,
  documentId: string,
  selection: { start: number; end: number },
  prompt: string,
  res: Response,
): Promise<void> {
  const documents = await fetchContextDocuments(userId, documentId);
  const current = documents.find((d) => d.document_id === documentId)!;
  const body = current.body ?? '';

  if (selection.end > body.length) {
    throw new InvalidSelectionError();
  }

  const selectionText = body.slice(selection.start, selection.end);

  const storyContext = documents
    .map((doc) => `# ${doc.title}\n\n${doc.body ?? ''}`)
    .join('\n\n---\n\n');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const stream = anthropic.messages.stream({
    model: process.env.NODE_ENV === 'development' ? ClaudeModel.Haiku4_5 : ClaudeModel.Opus4_7,
    max_tokens: 1000,
    system: `You are an expert creative writing assistant. The user will provide you with story context, a selected passage, and instructions for how to rewrite it. Return ONLY the replacement text — no preamble, no explanation, no quotation marks around the output.`,
    messages: [
      {
        role: 'user',
        content: `<story>\n${storyContext}\n</story>\n\n<selection>\n${selectionText}\n</selection>\n\n<instructions>\n${prompt}\n</instructions>`,
      },
    ],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
    }
  }

  res.write('data: [DONE]\n\n');
  res.end();
}
