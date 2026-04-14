jest.mock('@/config/database');
jest.mock('@/utils/legacy');
jest.mock('@/utils/withTransaction');

import {
  upsertWorld,
  upsertStory,
  upsertDocument,
  WorldNotFoundError,
  StoryNotFoundError,
} from '@/services/story.service';
import pool from '@/config/database';
import { fetchWorldById } from '@/utils/legacy';
import { withTransaction } from '@/utils/withTransaction';
import type { WorldResponse } from '@/types/response';

const mockPool = pool as jest.Mocked<typeof pool>;
const mockFetchWorldById = fetchWorldById as jest.MockedFunction<typeof fetchWorldById>;
const mockWithTransaction = withTransaction as jest.MockedFunction<typeof withTransaction>;

const USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const WORLD_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
const STORY_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
const DOC_ID = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

const createMockClient = () => ({
  query: jest.fn(),
});

const mockDate = new Date('2026-01-01T00:00:00Z');
const mockWorldResponse: WorldResponse = {
  worldId: WORLD_ID,
  userId: USER_ID,
  title: 'Test World',
  stories: [],
  createdAt: mockDate,
  updatedAt: mockDate,
};

describe('upsertWorld', () => {
  it('should insert a new world when no worldId is provided', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ world_id: WORLD_ID }] });
    mockFetchWorldById.mockResolvedValueOnce(mockWorldResponse);

    const result = await upsertWorld(USER_ID, { title: 'Test World' });

    expect(result).toEqual(mockWorldResponse);
    expect(mockPool.query).toHaveBeenCalledWith(
      'INSERT INTO worlds (user_id, title) VALUES ($1, $2) RETURNING world_id',
      [USER_ID, 'Test World'],
    );
    expect(mockFetchWorldById).toHaveBeenCalledWith(WORLD_ID);
  });

  it('should update a world when worldId is provided and exists', async () => {
    const updatedResponse = { ...mockWorldResponse, title: 'Updated World' };
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ world_id: WORLD_ID }] });
    mockFetchWorldById.mockResolvedValueOnce(updatedResponse);

    const result = await upsertWorld(USER_ID, { worldId: WORLD_ID, title: 'Updated World' });

    expect(result).toEqual(updatedResponse);
    expect(mockPool.query).toHaveBeenCalledWith(
      'SELECT 1 FROM worlds WHERE world_id = $1 AND user_id = $2',
      [WORLD_ID, USER_ID],
    );
    expect(mockPool.query).toHaveBeenCalledWith(
      'UPDATE worlds SET title = $1, updated_at = NOW() WHERE world_id = $2',
      ['Updated World', WORLD_ID],
    );
    expect(mockFetchWorldById).toHaveBeenCalledWith(WORLD_ID);
  });

  it('should throw WorldNotFoundError when worldId does not exist', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    await expect(
      upsertWorld(USER_ID, { worldId: WORLD_ID, title: 'Updated World' }),
    ).rejects.toThrow(WorldNotFoundError);

    expect(mockFetchWorldById).not.toHaveBeenCalled();
  });
});

describe('upsertStory', () => {
  it('should create a new story with a new world when neither storyId nor worldId is provided', async () => {
    const mockClient = createMockClient();
    mockClient.query.mockResolvedValueOnce({ rows: [{ world_id: WORLD_ID }] }); // INSERT world
    mockClient.query.mockResolvedValueOnce({}); // INSERT story
    mockFetchWorldById.mockResolvedValueOnce(mockWorldResponse);

    mockWithTransaction.mockImplementation((callback) => callback(mockClient as any));

    const result = await upsertStory(USER_ID, { title: 'New Story' });

    expect(result).toEqual(mockWorldResponse);
    expect(mockFetchWorldById).toHaveBeenCalledWith(WORLD_ID);
    expect(mockClient.query).toHaveBeenCalledWith(
      'INSERT INTO worlds (user_id, title) VALUES ($1, $2) RETURNING world_id',
      [USER_ID, 'Untitled World'],
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      'INSERT INTO stories (world_id, title) VALUES ($1, $2)',
      [WORLD_ID, 'New Story'],
    );
  });

  it('should update an existing story when storyId is provided', async () => {
    const mockClient = createMockClient();
    mockClient.query.mockResolvedValueOnce({
      rows: [
        {
          world_id: WORLD_ID,
          user_id: USER_ID,
          story_id: STORY_ID,
          title: 'Old Story',
          created_at: mockDate,
          updated_at: mockDate,
        },
      ],
    });
    mockClient.query.mockResolvedValueOnce({}); // UPDATE
    mockFetchWorldById.mockResolvedValueOnce(mockWorldResponse);

    mockWithTransaction.mockImplementation((callback) => callback(mockClient as any));

    const result = await upsertStory(USER_ID, { storyId: STORY_ID, title: 'Updated Story' });

    expect(result).toEqual(mockWorldResponse);
    expect(mockFetchWorldById).toHaveBeenCalledWith(WORLD_ID);
    expect(mockClient.query).toHaveBeenCalledWith(
      'UPDATE stories SET title = $1, updated_at = NOW() WHERE story_id = $2',
      ['Updated Story', STORY_ID],
    );
  });

  it('should throw WorldNotFoundError when worldId does not exist', async () => {
    const mockClient = createMockClient();
    mockClient.query.mockResolvedValueOnce({ rows: [] });

    mockWithTransaction.mockImplementation((callback) => callback(mockClient as any));

    await expect(
      upsertStory(USER_ID, { title: 'New Story', worldId: WORLD_ID }),
    ).rejects.toThrow(WorldNotFoundError);

    expect(mockFetchWorldById).not.toHaveBeenCalled();
  });
});

describe('upsertDocument', () => {
  it('should create a new document with a new world and story when no IDs are provided', async () => {
    const mockClient = createMockClient();
    mockClient.query.mockResolvedValueOnce({ rows: [{ world_id: WORLD_ID }] }); // INSERT world
    mockClient.query.mockResolvedValueOnce({ rows: [{ story_id: STORY_ID }] }); // INSERT story
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT predecessor
    mockClient.query.mockResolvedValueOnce({ rows: [{ document_id: DOC_ID }] }); // INSERT document
    mockFetchWorldById.mockResolvedValueOnce(mockWorldResponse);

    mockWithTransaction.mockImplementation((callback) => callback(mockClient as any));

    const result = await upsertDocument(USER_ID, { title: 'Chapter 1', body: 'Content' });

    expect(result).toEqual(mockWorldResponse);
    expect(mockFetchWorldById).toHaveBeenCalledWith(WORLD_ID);
  });

  it('should update an existing document when documentId is provided', async () => {
    const mockClient = createMockClient();
    mockClient.query.mockResolvedValueOnce({
      rows: [
        {
          user_id: USER_ID,
          world_id: WORLD_ID,
          document_id: DOC_ID,
          story_id: STORY_ID,
          title: 'Old Chapter',
          body: 'Old content',
          predecessor_id: null,
          successor_id: null,
          created_at: mockDate,
          updated_at: mockDate,
        },
      ],
    });
    mockClient.query.mockResolvedValueOnce({}); // UPDATE
    mockFetchWorldById.mockResolvedValueOnce(mockWorldResponse);

    mockWithTransaction.mockImplementation((callback) => callback(mockClient as any));

    const result = await upsertDocument(USER_ID, {
      documentId: DOC_ID,
      title: 'Updated Chapter',
      body: 'Updated content',
    });

    expect(result).toEqual(mockWorldResponse);
    expect(mockFetchWorldById).toHaveBeenCalledWith(WORLD_ID);
    expect(mockClient.query).toHaveBeenCalledWith(
      'UPDATE documents SET title = $1, body = $2, updated_at = NOW() WHERE document_id = $3',
      ['Updated Chapter', 'Updated content', DOC_ID],
    );
  });

  it('should throw StoryNotFoundError when storyId does not exist', async () => {
    const mockClient = createMockClient();
    mockClient.query.mockResolvedValueOnce({ rows: [] });

    mockWithTransaction.mockImplementation((callback) => callback(mockClient as any));

    await expect(
      upsertDocument(USER_ID, { title: 'Chapter 1', body: '', storyId: STORY_ID }),
    ).rejects.toThrow(StoryNotFoundError);

    expect(mockFetchWorldById).not.toHaveBeenCalled();
  });
});
