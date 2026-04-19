import { WorldNotFoundError } from '@/constants/error/custom-errors';
import { UpsertWorldBody } from '@/schemas/story.schemas';
import { WorldResponse } from '@/types/response';
import pool from '@/config/database';
import { DocumentRow, StoryRow, StoryRowWithDocuments, WorldRow } from '@/types/database';
import { mapWorldResponse } from '@/utils/story/map-story';

export const upsertWorld = async (
  userId: string,
  data: UpsertWorldBody,
  fetchWorldResponse = fetchWorld,
): Promise<WorldResponse | null> => {
  const { worldId, title } = data;

  if (worldId) {
    const existing = await pool.query('SELECT 1 FROM worlds WHERE world_id = $1 AND user_id = $2', [
      worldId,
      userId,
    ]);
    if (existing.rows.length === 0) {
      throw new WorldNotFoundError();
    }
    await pool.query('UPDATE worlds SET title = $1, updated_at = NOW() WHERE world_id = $2', [
      title,
      worldId,
    ]);
    return fetchWorldResponse(worldId);
  } else {
    const newWorld = await pool.query<WorldRow>(
      'INSERT INTO worlds (user_id, title) VALUES ($1, $2) RETURNING world_id',
      [userId, title],
    );
    return fetchWorldResponse(newWorld.rows[0].world_id);
  }
};

/**
 * Fetches a single world with all nested stories and documents.
 */
export const fetchWorld = async (worldId: string): Promise<WorldResponse | null> => {
  const worldResult = await pool.query<WorldRow>('SELECT * FROM worlds WHERE world_id = $1', [
    worldId,
  ]);

  if (worldResult.rows.length === 0) return null;

  const world = worldResult.rows[0];

  const storiesResult = await pool.query<StoryRow>(
    'SELECT * FROM stories WHERE world_id = $1 ORDER BY created_at',
    [worldId],
  );

  const storyIds = storiesResult.rows.map((s) => s.story_id);

  let documentRows: DocumentRow[] = [];
  if (storyIds.length > 0) {
    const docsResult = await pool.query<DocumentRow>(
      'SELECT * FROM documents WHERE story_id = ANY($1) ORDER BY created_at',
      [storyIds],
    );
    documentRows = docsResult.rows;
  }

  const docsByStory = new Map<string, DocumentRow[]>();
  for (const doc of documentRows) {
    const arr = docsByStory.get(doc.story_id) ?? [];
    arr.push(doc);
    docsByStory.set(doc.story_id, arr);
  }

  const stories: StoryRowWithDocuments[] = storiesResult.rows.map((story) => ({
    ...story,
    documents: docsByStory.get(story.story_id) ?? [],
  }));

  return mapWorldResponse(world, stories);
};

/**
 * Fetches all worlds (with nested stories and documents) for a user.
 * This is the user's "Legacy."
 */
export async function fetchLegacy(userId: string): Promise<WorldResponse[]> {
  const worldsResult = await pool.query<WorldRow>(
    'SELECT * FROM worlds WHERE user_id = $1 ORDER BY created_at',
    [userId],
  );

  if (worldsResult.rows.length === 0) return [];
  const worldIds = worldsResult.rows.map((w: WorldRow) => w.world_id);

  const storiesResult = await pool.query<StoryRow>(
    'SELECT * FROM stories WHERE world_id = ANY($1) ORDER BY created_at',
    [worldIds],
  );

  const storyIds = storiesResult.rows.map((s) => s.story_id);

  let documentRows: DocumentRow[] = [];
  if (storyIds.length > 0) {
    const docsResult = await pool.query<DocumentRow>(
      'SELECT * FROM documents WHERE story_id = ANY($1) ORDER BY created_at',
      [storyIds],
    );
    documentRows = docsResult.rows;
  }

  // Group documents by story
  const docsByStory = new Map<string, DocumentRow[]>();
  for (const doc of documentRows) {
    const arr = docsByStory.get(doc.story_id) ?? [];
    arr.push(doc);
    docsByStory.set(doc.story_id, arr);
  }

  // Group stories by world
  const storiesByWorld = new Map<string, StoryRowWithDocuments[]>();
  for (const story of storiesResult.rows) {
    const arr: StoryRowWithDocuments[] = (storiesByWorld.get(story.world_id) ??
      []) as StoryRowWithDocuments[];
    arr.push({ ...story, documents: docsByStory.get(story.story_id) ?? [] });
    storiesByWorld.set(story.world_id, arr);
  }

  return worldsResult.rows.map((world) =>
    mapWorldResponse(world, storiesByWorld.get(world.world_id) ?? []),
  );
}
