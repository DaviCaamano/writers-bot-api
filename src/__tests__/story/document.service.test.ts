import { withTransaction } from '@/utils/database/with-transaction';
import { withQuery } from '@/utils/database/with-query';
import { fetchDocument, upsertDocument } from '@/services/story/document.service';
import { StoryNotFoundError } from '@/constants/error/custom-errors';
import { fetchWorld } from '@/services/story/world.service';
import {
  MOCK_DOC_ID,
  MOCK_STORY_ID,
  MOCK_USER_ID,
  MOCK_WORLD_ID,
  mockDoc,
  mockDocResponse,
  mockWorldResponse,
} from '@/__tests__/constants/mock-story';
import { createMockClient } from '@/__tests__/constants/mock-database';

jest.mock('@/config/database');
jest.mock('@/services/story/world.service');
jest.mock('@/utils/database/with-transaction');
jest.mock('@/utils/database/with-query');

const mockFetchWorld = fetchWorld as jest.MockedFunction<typeof fetchWorld>;
const mockWithTransaction = withTransaction as jest.MockedFunction<typeof withTransaction>;
const mockWithQuery = withQuery as jest.MockedFunction<typeof withQuery>;

describe('fetchDocument', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch a document by its ID', async () => {
    const mockClient = createMockClient();
    mockClient.query.mockResolvedValueOnce({
      rows: [mockDoc],
    });
    mockWithQuery.mockImplementation((callback) => callback(mockClient as any));

    const result = await fetchDocument(MOCK_DOC_ID);
    expect(result).toEqual(mockDocResponse);
  });
});

describe('upsertDocument', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new document with a new world and story when no IDs are provided', async () => {
    const mockClient = createMockClient();

    mockClient.query.mockResolvedValueOnce({ rows: [{ world_id: MOCK_WORLD_ID }] }); // INSERT world
    mockClient.query.mockResolvedValueOnce({ rows: [{ story_id: MOCK_STORY_ID }] }); // INSERT story
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT predecessor
    mockClient.query.mockResolvedValueOnce({ rows: [{ document_id: MOCK_DOC_ID }] }); // INSERT document
    mockFetchWorld.mockResolvedValueOnce(mockWorldResponse);

    mockWithTransaction.mockImplementation((callback) => callback(mockClient));

    const result = await upsertDocument(MOCK_USER_ID, { title: 'Chapter 1', body: 'Content' });

    expect(result).toEqual(mockWorldResponse);
    expect(mockFetchWorld).toHaveBeenCalledWith(MOCK_WORLD_ID);
  });

  it('should update an existing document when documentId is provided', async () => {
    const mockClient = createMockClient();
    mockClient.query.mockResolvedValueOnce({
      rows: [
        {
          ...mockDoc,
          user_id: MOCK_USER_ID,
          world_id: MOCK_WORLD_ID,
        },
      ],
    }).mockResolvedValueOnce({});
    mockFetchWorld.mockResolvedValueOnce(mockWorldResponse);

    mockWithTransaction.mockImplementation((callback) => callback(mockClient as any));

    const result = await upsertDocument(MOCK_USER_ID, {
      documentId: MOCK_DOC_ID,
      title: 'Updated Chapter',
      body: 'Updated content',
    });

    expect(result).toEqual(mockWorldResponse);
    expect(mockFetchWorld).toHaveBeenCalledWith(MOCK_WORLD_ID);
    expect(mockClient.query).toHaveBeenCalledWith(
      'UPDATE documents SET title = $1, body = $2, updated_at = NOW() WHERE document_id = $3',
      ['Updated Chapter', 'Updated content', MOCK_DOC_ID],
    );
  });

  it('should throw StoryNotFoundError when storyId does not exist', async () => {
    const mockClient = createMockClient();
    mockClient.query.mockResolvedValueOnce({ rows: [] });

    mockWithTransaction.mockImplementation((callback) => callback(mockClient as any));

    await expect(
      upsertDocument(MOCK_USER_ID, { title: 'Chapter 1', body: '', storyId: MOCK_STORY_ID }),
    ).rejects.toThrow(StoryNotFoundError);

    expect(mockFetchWorld).not.toHaveBeenCalled();
  });
});
