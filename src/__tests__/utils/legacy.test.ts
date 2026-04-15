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
  predecessor_id: null,
  successor_id: null,
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
    expect(await fetchLegacy(USER_ID)).toEqual([]);
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
          predecessorId: null,
          successorId: null,
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
    const story3Id = 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a77';
    const story4Id = 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a88';
    const story5Id = 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a99';
    const doc2Id = 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a00';

    const world2: WorldRow = { ...mockWorld, world_id: world2Id, title: 'World 2' };
    const story1: StoryRow = {
      ...mockStory,
      world_id: WORLD_ID,
      successor_id: story2Id,
    };
    const story2: StoryRow = {
      ...mockStory,
      story_id: story2Id,
      world_id: WORLD_ID,
      predecessor_id: mockStory.story_id,
      successor_id: null,
      title: 'Story 2',
    };
    const story3: StoryRow = {
      ...mockStory,
      story_id: story3Id,
      world_id: world2Id,
      successor_id: story4Id,
      title: 'Story 3',
    };
    const story4: StoryRow = {
      ...mockStory,
      story_id: story4Id,
      world_id: world2Id,
      predecessor_id: story3Id,
      successor_id: story5Id,
      title: 'Story 4',
    };
    const story5: StoryRow = {
      ...mockStory,
      story_id: story5Id,
      world_id: world2Id,
      predecessor_id: story4Id,
      successor_id: null,
      title: 'Story 5',
    };
    const doc1: DocumentRow = {
      ...mockDoc,
      story_id: mockStory.story_id,
      predecessor_id: null,
      successor_id: doc2Id,
    };
    const doc2: DocumentRow = {
      ...mockDoc,
      document_id: doc2Id,
      story_id: mockStory.story_id,
      predecessor_id: mockDoc.document_id,
      successor_id: null,
    };

    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockWorld, world2] })
      .mockResolvedValueOnce({ rows: [story1, story2, story3, story4, story5] })
      .mockResolvedValueOnce({ rows: [doc1, doc2] });

    const result = await fetchLegacy(USER_ID);

    expect(result).toHaveLength(2);
    expect(result[0].worldId).toBe(WORLD_ID);
    expect(result[1].worldId).toBe(world2Id);
    expect(result[0].stories).toHaveLength(2);
    expect(result[0].stories[0].storyId).toBe(mockStory.story_id);
    expect(result[0].stories[1].storyId).toBe(story2.story_id);
    expect(result[0].stories[0].documents).toHaveLength(2);
    expect(result[0].stories[1].documents).toHaveLength(0);
    expect(result[0].stories[0].documents[0].documentId).toBe(mockDoc.document_id);
    expect(result[0].stories[0].documents[1].documentId).toBe(doc2Id);
    expect(result[1].stories).toHaveLength(3);
    expect(result[1].stories[0].storyId).toBe(story3Id);
    expect(result[1].stories[1].storyId).toBe(story4Id);
    expect(result[1].stories[2].storyId).toBe(story5Id);

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
          predecessorId: null,
          successorId: null,
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
    const linkedDoc1Id = 'e5eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
    const linkedDoc2Id = 'e5eebc99-9c0b-4ef8-bb6d-6bb9bd380a56';
    const linkedDoc3Id = 'e5eebc99-9c0b-4ef8-bb6d-6bb9bd380a57';
    const linkedDoc1: DocumentRow = {
      ...mockDoc,
      document_id: linkedDoc1Id,
      predecessor_id: null,
      successor_id: linkedDoc2Id,
    };
    const linkedDoc2: DocumentRow = {
      ...mockDoc,
      document_id: linkedDoc2Id,
      predecessor_id: linkedDoc1Id,
      successor_id: linkedDoc3Id,
    };
    const linkedDoc3: DocumentRow = {
      ...mockDoc,
      document_id: linkedDoc3Id,
      predecessor_id: linkedDoc2Id,
      successor_id: null,
    };

    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockWorld] })
      .mockResolvedValueOnce({ rows: [mockStory] })
      .mockResolvedValueOnce({ rows: [linkedDoc1, linkedDoc2, linkedDoc3] });

    const result = await fetchWorldById(WORLD_ID);

    const document1 = result!.stories[0].documents[0];
    const document2 = result!.stories[0].documents[1];
    const document3 = result!.stories[0].documents[2];
    expect(document1.documentId).toBe(linkedDoc1Id);
    expect(document1.predecessorId).toBeNull();
    expect(document1.successorId).toBe(linkedDoc2Id);
    expect(document2.documentId).toBe(linkedDoc2Id);
    expect(document2.predecessorId).toBe(linkedDoc1Id);
    expect(document2.successorId).toBe(linkedDoc3Id);
    expect(document3.documentId).toBe(linkedDoc3Id);
    expect(document3.predecessorId).toBe(linkedDoc2Id);
    expect(document3.successorId).toBeNull();
  });

  it('should assign documents to the correct story', async () => {
    const story2Id = 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
    const story1: StoryRow = { ...mockStory, successor_id: story2Id };
    const story2: StoryRow = {
      ...mockStory,
      story_id: story2Id,
      title: 'Story 2',
      predecessor_id: STORY_ID,
      successor_id: null,
    };

    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockWorld] })
      .mockResolvedValueOnce({ rows: [story1, story2] })
      .mockResolvedValueOnce({ rows: [mockDoc] }); // only belongs to STORY_ID

    const result = await fetchWorldById(WORLD_ID);

    expect(result!.stories).toHaveLength(2);
    expect(result!.stories[0].documents).toHaveLength(1);
    expect(result!.stories[1].documents).toHaveLength(0);
  });
});
