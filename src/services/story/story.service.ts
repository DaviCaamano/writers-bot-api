import type { UpsertStoryBody } from '@/schemas/story.schemas';
import { withTransaction } from '@/utils/database/with-transaction';
import { StoryRow, StoryRowWithDocuments } from '@/types/database';
import { StoryNotFoundError, WorldNotFoundError } from '@/constants/error/custom-errors';
import { withQuery } from '@/utils/database/with-query';
import { StoryResponse } from '@/types/response';
import { mapStoryResponse } from '@/utils/story/map-story';
import pool from '@/config/database';

export const fetchStory = async (storyId: string): Promise<StoryRowWithDocuments> => {
  const result = await pool.query<StoryRowWithDocuments>(
    `SELECT *
      FROM stories s
      WHERE s.story_id = $1;`,
    [storyId],
  );
  if (result.rows.length === 0) {
    throw new StoryNotFoundError();
  }
  return result.rows[0];
};

export const fetchStoryWithDocuments = async (storyId: string): Promise<StoryRowWithDocuments> => {
  return withQuery<StoryRowWithDocuments>(async (client) => {
    const result = await client.query<StoryRowWithDocuments>(
      `SELECT
      s.*
      COALESCE(
        json_agg(ORDER BY d.created_at) FILTER (WHERE d.document_id IS NOT NULL),
        '[]'
      ) AS documents
      FROM stories s
      LEFT JOIN documents d ON d.story_id = s.story_id
      WHERE s.story_id = $1
      GROUP BY s.story_id;`,
      [storyId],
    );
    if (result.rows.length === 0) {
      throw new StoryNotFoundError();
    }
    return result.rows[0];
  });
};

export async function upsertStory(userId: string, data: UpsertStoryBody): Promise<StoryResponse> {
  let { worldId } = data;
  const { storyId, title } = data;

  return withTransaction(async (client) => {
    let resultWorldId: string;

    if (storyId) {
      const existing = await client.query<StoryRow & { user_id: string }>(
        `SELECT s.*, w.user_id FROM stories s
         JOIN worlds w ON w.world_id = s.world_id
         WHERE s.story_id = $1 AND w.user_id = $2`,
        [storyId, userId],
      );

      if (existing.rows.length === 0) {
        throw new StoryNotFoundError();
      }

      if (title && title !== existing.rows[0].title) {
        await client.query(
          'UPDATE stories SET title = $1, updated_at = NOW() WHERE story_id = $2',
          [title, storyId],
        );
      }
      resultWorldId = existing.rows[0].world_id;

      if (worldId && worldId !== resultWorldId) {
        const targetWorld = await client.query(
          'SELECT 1 FROM worlds WHERE world_id = $1 AND user_id = $2',
          [worldId, userId],
        );
        if (targetWorld.rows.length === 0) {
          throw new WorldNotFoundError();
        }
        await client.query(
          'UPDATE stories SET world_id = $1, updated_at = NOW() WHERE story_id = $2',
          [worldId, storyId],
        );
      }

      return mapStoryResponse(await fetchStory(storyId));
    }

    if (worldId) {
      const worldCheck = await client.query(
        'SELECT 1 FROM worlds WHERE world_id = $1 AND user_id = $2',
        [worldId, userId],
      );
      if (worldCheck.rows.length === 0) {
        throw new WorldNotFoundError();
      }
    } else {
      const newWorld = await client.query(
        'INSERT INTO worlds (user_id, title) VALUES ($1, $2) RETURNING world_id',
        [userId, 'Untitled World'],
      );
      worldId = newWorld.rows[0].world_id;
    }

    const newStory = await client.query(
      'INSERT INTO stories (world_id, title) VALUES ($1, $2) RETURNING story_id',
      [worldId!, title],
    );
    const newStoryId = newStory.rows[0].story_id;
    return mapStoryResponse(await fetchStory(newStoryId));
  });
}
