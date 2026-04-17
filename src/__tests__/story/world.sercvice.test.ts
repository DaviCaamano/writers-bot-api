import {
  MOCK_DOC_ID,
  MOCK_STORY_ID,
  MOCK_USER_ID,
  MOCK_WORLD_ID,
  mockDoc,
  mockStory,
  mockWorld,
  mockWorldResponse,
} from '@/__tests__/constants/mock-story';

jest.mock('@/config/database');

import { WorldNotFoundError } from '@/constants/error/custom-errors';
import { fetchWorld, upsertWorld } from '@/services/story/world.service';
import { DocumentRow, StoryRow } from '@/types/database';
import { mockPool } from '@/__tests__/constants/mock-database';
import { mockDate } from '@/__tests__/constants/mock-basic';

describe('upsertWorld', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should insert a new world when no worldId is provided', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ world_id: MOCK_WORLD_ID }] }) // INSERT worlds
      .mockResolvedValueOnce({ rows: [mockWorld] }) // fetchWorld: SELECT worlds
      .mockResolvedValueOnce({ rows: [] }); // fetchWorld: SELECT stories

    const result = await upsertWorld(MOCK_USER_ID, { title: 'Test World' });

    expect(result).toEqual(mockWorldResponse);
    expect(mockPool.query).toHaveBeenCalledWith(
      'INSERT INTO worlds (user_id, title) VALUES ($1, $2) RETURNING world_id',
      [MOCK_USER_ID, 'Test World'],
    );
  });

  it('should update a world when worldId is provided and exists', async () => {
    const updatedWorldRow = { ...mockWorld, title: 'Updated World' };
    const updatedResponse = { ...mockWorldResponse, title: 'Updated World' };

    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{}] }) // SELECT 1 (ownership check)
      .mockResolvedValueOnce({}) // UPDATE worlds
      .mockResolvedValueOnce({ rows: [updatedWorldRow] }) // fetchWorld: SELECT worlds
      .mockResolvedValueOnce({ rows: [] }); // fetchWorld: SELECT stories

    const result = await upsertWorld(MOCK_USER_ID, {
      worldId: MOCK_WORLD_ID,
      title: 'Updated World',
    });

    expect(result).toEqual(updatedResponse);
    expect(mockPool.query).toHaveBeenCalledWith(
      'SELECT 1 FROM worlds WHERE world_id = $1 AND user_id = $2',
      [MOCK_WORLD_ID, MOCK_USER_ID],
    );
    expect(mockPool.query).toHaveBeenCalledWith(
      'UPDATE worlds SET title = $1, updated_at = NOW() WHERE world_id = $2',
      ['Updated World', MOCK_WORLD_ID],
    );
  });

  it('should throw WorldNotFoundError when worldId does not exist', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    await expect(
      upsertWorld(MOCK_USER_ID, { worldId: MOCK_WORLD_ID, title: 'Updated World' }),
    ).rejects.toThrow(WorldNotFoundError);
  });
});

describe('fetchWorld', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when the world does not exist', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const result = await fetchWorld(MOCK_WORLD_ID);
    expect(result).toBeNull();
  });

  it('should return the world with nested stories and documents', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockWorld] })
      .mockResolvedValueOnce({ rows: [mockStory] })
      .mockResolvedValueOnce({ rows: [mockDoc] });

    const result = await fetchWorld(MOCK_WORLD_ID);

    expect(result).toEqual({
      worldId: MOCK_WORLD_ID,
      userId: MOCK_USER_ID,
      title: 'Test World',
      stories: [
        {
          storyId: MOCK_STORY_ID,
          worldId: MOCK_WORLD_ID,
          title: 'Test Story',
          predecessorId: null,
          successorId: null,
          documents: [
            {
              documentId: MOCK_DOC_ID,
              storyId: MOCK_STORY_ID,
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

  it('should return a mapped world with no stories', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockWorld] }) // SELECT worlds
      .mockResolvedValueOnce({ rows: [] }); // SELECT stories

    const result = await fetchWorld(MOCK_WORLD_ID);
    expect(result).toEqual(mockWorldResponse);
  });

  it('should skip the documents query when there are no stories', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockWorld] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await fetchWorld(MOCK_WORLD_ID);

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

    const result = await fetchWorld(MOCK_WORLD_ID);

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
      predecessor_id: MOCK_STORY_ID,
      successor_id: null,
    };

    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockWorld] })
      .mockResolvedValueOnce({ rows: [story1, story2] })
      .mockResolvedValueOnce({ rows: [mockDoc] }); // only belongs to MOCK_STORY_ID

    const result = await fetchWorld(MOCK_WORLD_ID);

    expect(result!.stories).toHaveLength(2);
    expect(result!.stories[0].documents).toHaveLength(1);
    expect(result!.stories[1].documents).toHaveLength(0);
  });
});
