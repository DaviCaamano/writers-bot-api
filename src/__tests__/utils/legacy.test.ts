jest.mock('@/config/database');

import pool from '@/config/database';
import { fetchLegacy, fetchWorldById } from '@/utils/legacy';
import type { WorldRow, StoryRow, DocumentRow } from '@/types/database';

const mockPool = pool as jest.Mocked<typeof pool>;

const USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const WORLD_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
const STORY_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
const DOC_ID = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

const mockDate = new Date('2026-01-01T00:00:00Z');

const mockWorld: WorldRow = {
  world_id: WORLD_ID,
  user_id: USER_ID,
  title: 'Test World',
  created_at: mockDate,
  updated_at: mockDate,
};

const mockStory: StoryRow = {
  story_id: STORY_ID,
  world_id: WORLD_ID,
  title: 'Test Story',
  created_at: mockDate,
  updated_at: mockDate,
};

const mockDoc: DocumentRow = {
  document_id: DOC_ID,
  story_id: STORY_ID,
  title: 'Test Document',
  body: 'Test content',
  predecessor_id: null,
  successor_id: null,
  created_at: mockDate,
  updated_at: mockDate,
};

describe('fetchLegacy', () => {
  it('should return an empty array when user has no worlds', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const result = await fetchLegacy(USER_ID);

    expect(result).toEqual([]);
    expect(mockPool.query).toHaveBeenCalledWith(
      'SELECT * FROM worlds WHERE user_id = $1 ORDER BY created_at',
      [USER_ID],
    );
  });

  it('should return worlds with nested stories and documents', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockWorld] })
      .mockResolvedValueOnce({ rows: [mockStory] })
      .mockResolvedValueOnce({ rows: [mockDoc] });

    const result = await fetchLegacy(USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      worldId: WORLD_ID,
      userId: USER_ID,
      title: 'Test World',
      stories: [
        {
          storyId: STORY_ID,
          worldId: WORLD_ID,
          title: 'Test Story',
          documents: [
            {
              documentId: DOC_ID,
              storyId: STORY_ID,
              title: 'Test Document',
              body: 'Test content',
              predecessorId: null,
              successorId: null,
              createdAt: mockDate,
              updatedAt: mockDate,
            },
          ],
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      ],
      createdAt: mockDate,
      updatedAt: mockDate,
    });
  });

  it('should group stories and documents under the correct world', async () => {
    const world2Id = 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
    const story2Id = 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66';

    const world2: WorldRow = { ...mockWorld, world_id: world2Id, title: 'World 2' };
    const story2: StoryRow = { ...mockStory, story_id: story2Id, world_id: world2Id, title: 'Story 2' };
    const doc2: DocumentRow = { ...mockDoc, document_id: 'g6eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', story_id: story2Id };

    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockWorld, world2] })
      .mockResolvedValueOnce({ rows: [mockStory, story2] })
      .mockResolvedValueOnce({ rows: [mockDoc, doc2] });

    const result = await fetchLegacy(USER_ID);

    expect(result).toHaveLength(2);
    expect(result[0].worldId).toBe(WORLD_ID);
    expect(result[0].stories[0].documents).toHaveLength(1);
    expect(result[1].worldId).toBe(world2Id);
    expect(result[1].stories[0].documents).toHaveLength(1);
  });

  it('should skip the documents query when there are no stories', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockWorld] })
      .mockResolvedValueOnce({ rows: [] }); // no stories — documents query should NOT fire

    const result = await fetchLegacy(USER_ID);

    expect(result[0].stories).toEqual([]);
    expect(mockPool.query).toHaveBeenCalledTimes(2);
  });
});

describe('fetchWorldById', () => {
  it('should return null when the world does not exist', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const result = await fetchWorldById(WORLD_ID);

    expect(result).toBeNull();
    expect(mockPool.query).toHaveBeenCalledWith(
      'SELECT * FROM worlds WHERE world_id = $1',
      [WORLD_ID],
    );
  });

  it('should return the world with nested stories and documents', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockWorld] })
      .mockResolvedValueOnce({ rows: [mockStory] })
      .mockResolvedValueOnce({ rows: [mockDoc] });

    const result = await fetchWorldById(WORLD_ID);

    expect(result).toEqual({
      worldId: WORLD_ID,
      userId: USER_ID,
      title: 'Test World',
      stories: [
        {
          storyId: STORY_ID,
          worldId: WORLD_ID,
          title: 'Test Story',
          documents: [
            {
              documentId: DOC_ID,
              storyId: STORY_ID,
              title: 'Test Document',
              body: 'Test content',
              predecessorId: null,
              successorId: null,
              createdAt: mockDate,
              updatedAt: mockDate,
            },
          ],
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      ],
      createdAt: mockDate,
      updatedAt: mockDate,
    });
  });

  it('should skip the documents query when there are no stories', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockWorld] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await fetchWorldById(WORLD_ID);

    expect(result?.stories).toEqual([]);
    expect(mockPool.query).toHaveBeenCalledTimes(2);
  });

  it('should map predecessor and successor IDs correctly', async () => {
    const predecessorId = 'e5eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
    const successorId = 'f6eebc99-9c0b-4ef8-bb6d-6bb9bd380a66';
    const linkedDoc: DocumentRow = { ...mockDoc, predecessor_id: predecessorId, successor_id: successorId };

    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockWorld] })
      .mockResolvedValueOnce({ rows: [mockStory] })
      .mockResolvedValueOnce({ rows: [linkedDoc] });

    const result = await fetchWorldById(WORLD_ID);

    const document = result!.stories[0].documents[0];
    expect(document.predecessorId).toBe(predecessorId);
    expect(document.successorId).toBe(successorId);
  });

  it('should assign documents to the correct story', async () => {
    const story2Id = 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
    const story2: StoryRow = { ...mockStory, story_id: story2Id, title: 'Story 2' };

    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockWorld] })
      .mockResolvedValueOnce({ rows: [mockStory, story2] })
      .mockResolvedValueOnce({ rows: [mockDoc] }); // only belongs to STORY_ID

    const result = await fetchWorldById(WORLD_ID);

    expect(result!.stories).toHaveLength(2);
    expect(result!.stories[0].documents).toHaveLength(1);
    expect(result!.stories[1].documents).toHaveLength(0);
  });
});
