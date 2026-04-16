import { WorldNotFoundError } from '@/utils/error/custom-errors';

jest.mock('@/utils/database/with-transaction');
jest.mock('@/utils/database/with-query');

import { upsertStory, fetchStory, fetchStoryWithDocuments } from '@/services/story.service';
import { withTransaction } from '@/utils/database/with-transaction';
import { withQuery } from '@/utils/database/with-query';
import {
  MOCK_STORY_ID,
  MOCK_USER_ID,
  MOCK_WORLD_ID,
  mockDate,
  mockDoc,
  mockStory,
  mockStoryResponse,
} from '@/__tests__/constants/mock-story';
import { createMockClient } from '@/__tests__/constants/mock-database';
import { PoolClient } from 'pg';

const mockWithTransaction = withTransaction as jest.MockedFunction<typeof withTransaction>;
const mockWithQuery = withQuery as jest.MockedFunction<typeof withQuery>;

describe('fetchStory', () => {
  it('should fetch a story by its ID', async () => {
    const mockClient = createMockClient();
    mockClient.query.mockResolvedValueOnce({ rows: [mockStory] });
    mockWithQuery.mockImplementation((callback) => callback(mockClient as PoolClient));

    const result = await fetchStory(MOCK_STORY_ID);
    expect(result).toEqual(mockStory);
  });
});

describe('fetchStoryWithDocuments', () => {
  it('should return a story with its documents', async () => {
    const storyWithDocs = { ...mockStory, documents: [mockDoc] };
    const mockClient = createMockClient();
    mockClient.query.mockResolvedValueOnce({ rows: [storyWithDocs] });
    mockWithQuery.mockImplementation((callback) => callback(mockClient as PoolClient));

    const result = await fetchStoryWithDocuments(MOCK_STORY_ID);
    expect(result).toEqual(storyWithDocs);
  });

  it('should return a story with an empty documents array when there are no documents', async () => {
    const storyWithNoDocs = { ...mockStory, documents: [] };
    const mockClient = createMockClient();
    mockClient.query.mockResolvedValueOnce({ rows: [storyWithNoDocs] });
    mockWithQuery.mockImplementation((callback) => callback(mockClient as PoolClient));

    const result = await fetchStoryWithDocuments(MOCK_STORY_ID);
    expect(result).toEqual(storyWithNoDocs);
  });

  it('should throw an error when the story is not found', async () => {
    const mockClient = createMockClient();
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    mockWithQuery.mockImplementation((callback) => callback(mockClient as PoolClient));

    await expect(fetchStoryWithDocuments(MOCK_STORY_ID)).rejects.toThrow('Story not found');
  });
});

describe('upsertStory', () => {
  it('should create a new story with a new world when neither storyId nor worldId is provided', async () => {
    const mockTransactionClient = createMockClient();
    mockTransactionClient.query.mockResolvedValueOnce({ rows: [{ world_id: MOCK_WORLD_ID }] }); // INSERT world
    mockTransactionClient.query.mockResolvedValueOnce({ rows: [{ story_id: MOCK_STORY_ID }] }); // INSERT story

    mockWithTransaction.mockImplementation((callback) => callback(mockTransactionClient as any));

    const mockQueryClient = createMockClient();
    mockQueryClient.query.mockResolvedValueOnce({ rows: [mockStory] }); // fetchStory SELECT
    mockWithQuery.mockImplementation((callback) => callback(mockQueryClient as any));

    const result = await upsertStory(MOCK_USER_ID, { title: 'New Story' });

    expect(result).toEqual(mockStoryResponse);
    expect(mockTransactionClient.query).toHaveBeenCalledWith(
      'INSERT INTO worlds (user_id, title) VALUES ($1, $2) RETURNING world_id',
      [MOCK_USER_ID, 'Untitled World'],
    );
    expect(mockTransactionClient.query).toHaveBeenCalledWith(
      'INSERT INTO stories (world_id, title) VALUES ($1, $2) RETURNING story_id',
      [MOCK_WORLD_ID, 'New Story'],
    );
  });

  it('should update an existing story when storyId is provided', async () => {
    const mockTransactionClient = createMockClient();
    mockTransactionClient.query.mockResolvedValueOnce({
      rows: [
        {
          world_id: MOCK_WORLD_ID,
          user_id: MOCK_USER_ID,
          story_id: MOCK_STORY_ID,
          title: 'Old Story',
          predecessor_id: null,
          successor_id: null,
          created_at: mockDate,
          updated_at: mockDate,
        },
      ],
    }); // SELECT existing story
    mockTransactionClient.query.mockResolvedValueOnce({}); // UPDATE

    mockWithTransaction.mockImplementation((callback) => callback(mockTransactionClient as any));

    const updatedStoryRow = { ...mockStory, title: 'Updated Story' };
    const mockQueryClient = createMockClient();
    mockQueryClient.query.mockResolvedValueOnce({ rows: [updatedStoryRow] }); // fetchStory SELECT
    mockWithQuery.mockImplementation((callback) => callback(mockQueryClient as any));

    const result = await upsertStory(MOCK_USER_ID, {
      storyId: MOCK_STORY_ID,
      title: 'Updated Story',
    });

    expect(result).toEqual({ ...mockStoryResponse, title: 'Updated Story' });
    expect(mockTransactionClient.query).toHaveBeenCalledWith(
      'UPDATE stories SET title = $1, updated_at = NOW() WHERE story_id = $2',
      ['Updated Story', MOCK_STORY_ID],
    );
  });

  it('should throw WorldNotFoundError when worldId does not exist', async () => {
    const mockTransactionClient = createMockClient();
    mockTransactionClient.query.mockResolvedValueOnce({ rows: [] }); // worldCheck fails

    mockWithTransaction.mockImplementation((callback) => callback(mockTransactionClient as any));

    await expect(
      upsertStory(MOCK_USER_ID, { title: 'New Story', worldId: MOCK_WORLD_ID }),
    ).rejects.toThrow(WorldNotFoundError);
  });
});
