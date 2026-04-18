import { DocumentRow, StoryRow } from '@/types/database';
import { UpsertDocumentBody } from '@/schemas/story.schemas';
import { withTransaction } from '@/utils/database/with-transaction';
import { DocumentNotFoundError, StoryNotFoundError } from '@/constants/error/custom-errors';
import { DocumentResponse } from '@/types/response';
import { fetchWorld } from '@/services/story/world.service';
import pool from '@/config/database';

export async function fetchDocument(documentId: string): Promise<DocumentResponse> {
  const result = await pool.query<DocumentRow>(
    `SELECT d.*, s.world_id FROM documents d
     JOIN stories s ON s.story_id = d.story_id
     WHERE d.document_id = $1`,
    [documentId],
  );
  if (result.rows.length === 0) {
    throw new DocumentNotFoundError();
  }
  const row = result.rows[0];
  return {
    documentId: row.document_id,
    storyId: row.story_id,
    title: row.title,
    body: row.body ?? '',
    predecessorId: row.predecessor_id,
    successorId: row.successor_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function upsertDocument(userId: string, data: UpsertDocumentBody) {
  const { documentId, title, body, storyId } = data;

  return withTransaction(async (client) => {
    let targetStoryId = storyId;
    let worldId: string;

    // If documentId is provided, update the existing document
    if (documentId) {
      const existingDoc = await client.query<DocumentRow & { user_id: string; world_id: string }>(
        `SELECT d.*, w.user_id, s.world_id FROM documents d
         JOIN stories s ON s.story_id = d.story_id 
         JOIN (SELECT w2.world_id, w2.user_id FROM worlds w2 WHERE w2.user_id = $1) w ON w.world_id = s.world_id
         WHERE d.document_id = $2`,
        [userId, documentId],
      );

      if (existingDoc.rows.length === 0) {
        throw new DocumentNotFoundError();
      }

      await client.query(
        'UPDATE documents SET title = $1, body = $2, updated_at = NOW() WHERE document_id = $3',
        [title, body ?? existingDoc.rows[0].body, documentId],
      );

      worldId = existingDoc.rows[0].world_id;
      return fetchWorld(worldId);
    }

    // Create a new document: determine or create the story
    if (!targetStoryId) {
      const worldResult = await client.query(
        'INSERT INTO worlds (user_id, title) VALUES ($1, $2) RETURNING world_id',
        [userId, 'Untitled World'],
      );
      worldId = worldResult.rows[0].world_id;
      const storyResult = await client.query(
        'INSERT INTO stories (world_id, title) VALUES ($1, $2) RETURNING story_id',
        [worldId, 'Untitled Story'],
      );
      targetStoryId = storyResult.rows[0].story_id;
    } else {
      const storyResult = await client.query<StoryRow>(
        `SELECT s.* FROM stories s
         JOIN worlds w ON w.world_id = s.world_id
         WHERE s.story_id = $1 AND w.user_id = $2`,
        [targetStoryId, userId],
      );
      if (storyResult.rows.length === 0) {
        throw new StoryNotFoundError();
      }
      worldId = storyResult.rows[0].world_id;
    }

    // Get the last document in the chain with row-level locking to prevent race conditions
    const lastDocResult = await client.query<DocumentRow>(
      `SELECT * FROM documents WHERE story_id = $1 AND successor_id IS NULL
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [targetStoryId],
    );
    const predecessorId = lastDocResult.rows.length > 0 ? lastDocResult.rows[0].document_id : null;

    // Insert new document
    const result = await client.query(
      `INSERT INTO documents (story_id, title, body, predecessor_id)
       VALUES ($1, $2, $3, $4) RETURNING document_id`,
      [targetStoryId, title, body, predecessorId],
    );
    const newDocId = result.rows[0].document_id;

    // Update predecessor's successor if one exists
    if (predecessorId) {
      await client.query(
        'UPDATE documents SET successor_id = $1, updated_at = NOW() WHERE document_id = $2',
        [newDocId, predecessorId],
      );
    }

    return fetchWorld(worldId);
  });
}
