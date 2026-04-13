import pool from '../config/database';
import { DocumentRow, StoryRow, WorldRow } from '../types/database';
import { DocumentResponse, StoryResponse, WorldResponse } from '../types/response';

function mapDocument(row: DocumentRow): DocumentResponse {
  return {
    documentId: row.document_id,
    storyId: row.story_id,
    title: row.title,
    body: row.body,
    predecessorId: row.predecessor_id,
    successorId: row.successor_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStory(row: StoryRow, documents: DocumentResponse[]): StoryResponse {
  return {
    storyId: row.story_id,
    worldId: row.world_id,
    title: row.title,
    documents,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWorld(row: WorldRow, stories: StoryResponse[]): WorldResponse {
  return {
    worldId: row.world_id,
    userId: row.user_id,
    title: row.title,
    stories,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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
  const docsByStory = new Map<string, DocumentResponse[]>();
  for (const doc of documentRows) {
    const arr = docsByStory.get(doc.story_id) ?? [];
    arr.push(mapDocument(doc));
    docsByStory.set(doc.story_id, arr);
  }

  // Group stories by world
  const storiesByWorld = new Map<string, StoryResponse[]>();
  for (const story of storiesResult.rows) {
    const arr = storiesByWorld.get(story.world_id) ?? [];
    arr.push(mapStory(story, docsByStory.get(story.story_id) ?? []));
    storiesByWorld.set(story.world_id, arr);
  }

  return worldsResult.rows.map((world) =>
    mapWorld(world, storiesByWorld.get(world.world_id) ?? []),
  );
}

/**
 * Fetches a single world with all nested stories and documents.
 */
export async function fetchWorldById(worldId: string): Promise<WorldResponse | null> {
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

  const docsByStory = new Map<string, DocumentResponse[]>();
  for (const doc of documentRows) {
    const arr = docsByStory.get(doc.story_id) ?? [];
    arr.push(mapDocument(doc));
    docsByStory.set(doc.story_id, arr);
  }

  const stories = storiesResult.rows.map((story) =>
    mapStory(story, docsByStory.get(story.story_id) ?? []),
  );

  return mapWorld(world, stories);
}
