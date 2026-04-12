import pool from '../config/database';
import { fetchWorldById } from '../helpers/legacy';
import { DocumentRow, StoryRow } from '../types';
import type { UpsertDocumentBody, UpsertStoryBody, UpsertWorldBody } from '../schemas/story.schemas';

export class StoryNotFoundError extends Error {}
export class WorldNotFoundError extends Error {}
export class DocumentNotFoundError extends Error {}

// ── Document ─────────────────────────────────────────────────────

export async function upsertDocument(userId: string, data: UpsertDocumentBody) {
  const { documentId, title, body, storyId } = data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let targetStoryId = storyId;
    let worldId: string;

    // If documentId is provided, update the existing document
    if (documentId) {
      const existingDoc = await client.query<DocumentRow & { user_id: string; world_id: string }>(
        `SELECT d.*, w.user_id, s.world_id FROM documents d
         JOIN stories s ON s.story_id = d.story_id
         JOIN worlds w ON w.world_id = s.world_id
         WHERE d.document_id = $1`,
        [documentId],
      );

      if (existingDoc.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new DocumentNotFoundError();
      }

      // Verify user owns this document
      if (existingDoc.rows[0].user_id !== userId) {
        await client.query('ROLLBACK');
        throw new DocumentNotFoundError();
      }

      await client.query(
        'UPDATE documents SET title = $1, body = $2, updated_at = NOW() WHERE document_id = $3',
        [title, body ?? existingDoc.rows[0].body, documentId],
      );

      worldId = existingDoc.rows[0].world_id;
      await client.query('COMMIT');
      return fetchWorldById(worldId);
    }

    // Create new document: determine or create the story
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
        await client.query('ROLLBACK');
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

    await client.query('COMMIT');
    return fetchWorldById(worldId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Story ────────────────────────────────────────────────────────

export async function upsertStory(userId: string, data: UpsertStoryBody) {
  const { storyId, title, worldId } = data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let resultWorldId: string;

    if (storyId) {
      const existing = await client.query<StoryRow & { user_id: string }>(
        `SELECT s.*, w.user_id FROM stories s
         JOIN worlds w ON w.world_id = s.world_id
         WHERE s.story_id = $1 AND w.user_id = $2`,
        [storyId, userId],
      );

      if (existing.rows.length > 0) {
        await client.query(
          'UPDATE stories SET title = $1, updated_at = NOW() WHERE story_id = $2',
          [title, storyId],
        );
        resultWorldId = existing.rows[0].world_id;

        if (worldId && worldId !== resultWorldId) {
          const targetWorld = await client.query(
            'SELECT 1 FROM worlds WHERE world_id = $1 AND user_id = $2',
            [worldId, userId],
          );
          if (targetWorld.rows.length === 0) {
            await client.query('ROLLBACK');
            throw new WorldNotFoundError();
          }
          await client.query(
            'UPDATE stories SET world_id = $1, updated_at = NOW() WHERE story_id = $2',
            [worldId, storyId],
          );
          resultWorldId = worldId;
        }

        await client.query('COMMIT');
        return fetchWorldById(resultWorldId);
      }
    }

    if (worldId) {
      const worldCheck = await client.query(
        'SELECT 1 FROM worlds WHERE world_id = $1 AND user_id = $2',
        [worldId, userId],
      );
      if (worldCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new WorldNotFoundError();
      }
      resultWorldId = worldId;
    } else {
      const newWorld = await client.query(
        'INSERT INTO worlds (user_id, title) VALUES ($1, $2) RETURNING world_id',
        [userId, 'Untitled World'],
      );
      resultWorldId = newWorld.rows[0].world_id;
    }

    await client.query('INSERT INTO stories (world_id, title) VALUES ($1, $2)', [resultWorldId, title]);
    await client.query('COMMIT');
    return fetchWorldById(resultWorldId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── World ────────────────────────────────────────────────────────

export async function upsertWorld(userId: string, data: UpsertWorldBody) {
  const { worldId, title } = data;

  let resultWorldId: string;

  if (worldId) {
    const existing = await pool.query(
      'SELECT 1 FROM worlds WHERE world_id = $1 AND user_id = $2',
      [worldId, userId],
    );
    if (existing.rows.length > 0) {
      await pool.query('UPDATE worlds SET title = $1, updated_at = NOW() WHERE world_id = $2', [title, worldId]);
      resultWorldId = worldId;
    } else {
      const newWorld = await pool.query(
        'INSERT INTO worlds (user_id, title) VALUES ($1, $2) RETURNING world_id',
        [userId, title],
      );
      resultWorldId = newWorld.rows[0].world_id;
    }
  } else {
    const newWorld = await pool.query(
      'INSERT INTO worlds (user_id, title) VALUES ($1, $2) RETURNING world_id',
      [userId, title],
    );
    resultWorldId = newWorld.rows[0].world_id;
  }

  return fetchWorldById(resultWorldId);
}
