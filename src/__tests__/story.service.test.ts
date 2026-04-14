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

// Helper to create a mock client for transaction callbacks
const createMockClient = () => ({
  query: jest.fn(),
});

const createAtMock = new Date('2026-01-01T00:00:00Z');
const updatedAtMock = new Date('2026-01-02T00:00:00Z');
const mockWorldResponse: WorldResponse = {
  worldId: WORLD_ID,
  userId: USER_ID,
  title: 'Test World',
  stories: [],
  createdAt: createAtMock,
  updatedAt: updatedAtMock,
};

describe('upsertDocument', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new document when no documentId is provided', async () => {
    const mockClient = createMockClient();
    mockClient.query.mockResolvedValueOnce({ rows: [{ world_id: WORLD_ID }] }); // INSERT world
    mockClient.query.mockResolvedValueOnce({ rows: [{ story_id: STORY_ID }] }); // INSERT story
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT documents for predecessor
    mockClient.query.mockResolvedValueOnce({ rows: [{ document_id: DOC_ID }] }); // INSERT document
    mockFetchWorldById.mockResolvedValueOnce(mockWorldResponse);

    mockWithTransaction.mockImplementation((callback) => callback(mockClient as any));

    const result = await upsertDocument(USER_ID, { title: 'Chapter 1', body: 'Content' });

    expect(result).toEqual(mockWorldResponse);
    expect(mockFetchWorldById).toHaveBeenCalledWith(WORLD_ID);
  });

  it('should throw StoryNotFoundError when storyId is provided but story does not exist', async () => {
    const mockClient = createMockClient();
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // Story doesn't exist

    mockWithTransaction.mockImplementation((callback) => callback(mockClient as any));

    await expect(
      upsertDocument(USER_ID, { title: 'Chapter 1', body: '', storyId: STORY_ID }),
    ).rejects.toThrow(StoryNotFoundError);
  });

  it('should update an existing document', async () => {
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
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
    }); // Document exists
    mockClient.query.mockResolvedValueOnce({}); // UPDATE document
    mockFetchWorldById.mockResolvedValueOnce(mockWorldResponse);

    mockWithTransaction.mockImplementation((callback) => callback(mockClient as any));

    const result = await upsertDocument(USER_ID, {
      documentId: DOC_ID,
      title: 'Updated Chapter',
      body: 'Updated content',
    });

    expect(result).toEqual(mockWorldResponse);
  });

  it('should return a world with documents in stories', async () => {
    const mockClient = createMockClient();
    mockClient.query.mockResolvedValueOnce({ rows: [{ world_id: WORLD_ID }] }); // INSERT world
    mockClient.query.mockResolvedValueOnce({ rows: [{ story_id: STORY_ID }] }); // INSERT story
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT documents for predecessor
    mockClient.query.mockResolvedValueOnce({ rows: [{ document_id: DOC_ID }] }); // INSERT document
    mockFetchWorldById.mockResolvedValueOnce(mockWorldResponse);

    mockWithTransaction.mockImplementation((callback) => callback(mockClient as any));

    const result = await upsertDocument(USER_ID, { title: 'Chapter 1', body: '' });

    expect(result).toEqual(mockWorldResponse);
    expect(result).toHaveProperty('stories');
  });
});

describe('upsertStory', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new story when no storyId is provided', async () => {
    const mockClient = createMockClient();
    mockClient.query.mockResolvedValueOnce({ rows: [{ world_id: WORLD_ID }] }); // INSERT world
    mockClient.query.mockResolvedValueOnce({}); // INSERT story
    mockFetchWorldById.mockResolvedValueOnce(mockWorldResponse);

    mockWithTransaction.mockImplementation((callback) => callback(mockClient as any));

    const result = await upsertStory(USER_ID, { title: 'New Story' });

    expect(result).toEqual(mockWorldResponse);
    expect(mockFetchWorldById).toHaveBeenCalledWith(WORLD_ID);
  });

  it('should throw WorldNotFoundError when worldId is provided but does not exist', async () => {
    const mockClient = createMockClient();
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // World doesn't exist

    mockWithTransaction.mockImplementation((callback) => callback(mockClient as any));

    await expect(upsertStory(USER_ID, { title: 'New Story', worldId: WORLD_ID })).rejects.toThrow(
      WorldNotFoundError,
    );
  });

  it('should update an existing story', async () => {
    const mockClient = createMockClient();
    mockClient.query.mockResolvedValueOnce({
      rows: [
        {
          world_id: WORLD_ID,
          user_id: USER_ID,
          story_id: STORY_ID,
          title: 'Old Story',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
    }); // Story exists
    mockClient.query.mockResolvedValueOnce({}); // UPDATE query
    mockFetchWorldById.mockResolvedValueOnce(mockWorldResponse);

    mockWithTransaction.mockImplementation((callback) => callback(mockClient as any));

    const result = await upsertStory(USER_ID, { storyId: STORY_ID, title: 'Updated Story' });

    expect(result).toEqual(mockWorldResponse);
  });

  it('should return a world with stories array', async () => {
    const mockClient = createMockClient();
    mockClient.query.mockResolvedValueOnce({ rows: [{ world_id: WORLD_ID }] }); // INSERT world
    mockClient.query.mockResolvedValueOnce({}); // INSERT story
    mockFetchWorldById.mockResolvedValueOnce(mockWorldResponse);

    mockWithTransaction.mockImplementation((callback) => callback(mockClient as any));

    const result = await upsertStory(USER_ID, { title: 'New Story' });

    expect(result).toEqual(mockWorldResponse);
    expect(result).toHaveProperty('stories');
  });
});

describe('upsertWorld', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('creating a new world', () => {
    it('should insert a new world when no worldId is provided', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ world_id: WORLD_ID }] });
      mockFetchWorldById.mockResolvedValueOnce(mockWorldResponse);

      const result = await upsertWorld(USER_ID, { title: 'Test World' });

      expect(result).toEqual(mockWorldResponse);
    });
  });

  describe('updating an existing world', () => {
    it('should update a world when worldId is provided and exists', async () => {
      const updatedResponse = { ...mockWorldResponse, title: 'Updated World' };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ world_id: WORLD_ID }] }); // Check exists
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
    });

    it('should throw WorldNotFoundError when worldId is provided but does not exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // World doesn't exist

      await expect(
        upsertWorld(USER_ID, { worldId: WORLD_ID, title: 'Updated World' }),
      ).rejects.toThrow(WorldNotFoundError);
    });
  });

  describe('response format', () => {
    it('should return the complete world structure with nested stories and documents', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ world_id: WORLD_ID }] });
      mockFetchWorldById.mockResolvedValueOnce(mockWorldResponse);

      const result = await upsertWorld(USER_ID, { title: 'New World' });

      expect(result).toEqual(mockWorldResponse);
      expect(result).toHaveProperty('worldId');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('stories');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });
  });
});
