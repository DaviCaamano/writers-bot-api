import pool from '@/config/database';
import { DocumentRow, StoryRow, StoryRowWithDocuments, WorldRow } from '@/types/database';
import { WorldResponse } from '@/types/response';
import { mapWorldResponse } from '@/utils/story/map-story';

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

  const worldIds = worldsResult.rows.map((w) => w.world_id);

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
