import { MOCK_USER_ID } from '@/__tests__/constants/mock-user';

jest.mock('@/services/story/world.service');
jest.mock('@/utils/database/with-transaction');
jest.mock('@/utils/database/with-query');

import { withTransaction } from '@/utils/database/with-transaction';
import { withQuery } from '@/utils/database/with-query';
import { fetchDocument, upsertDocument } from '@/services/story/document.service';
import { DocumentNotFoundError, StoryNotFoundError } from '@/constants/error/custom-errors';
import { fetchWorld } from '@/services/story/world.service';
import {
  MOCK_DOC_ID,
  MOCK_STORY_ID,
  MOCK_WORLD_ID,
  MOCK_DOC,
  MOCK_DOCK_RESPONSE,
  MOCK_WORLD_RESPONSE,
  mockPool,
} from '@/__tests__/constants/mock-story';
import { createMockClient } from '@/__tests__/constants/mock-database';
import { mockClear } from '@/__tests__/utils/test-wrappers';

const mockFetchWorld = fetchWorld as jest.MockedFunction<typeof fetchWorld>;
const mockWithTransaction = withTransaction as jest.MockedFunction<typeof withTransaction>;
const mockWithQuery = withQuery as jest.MockedFunction<typeof withQuery>;

describe(
  'fetchDocument',
  mockClear(() => {
    it('should fetch a document by its ID', async () => {
      mockWithQuery.mockImplementation((callback) => callback(mockClient as any));
      const mockClient = createMockClient();
      mockPool.query.mockResolvedValueOnce({ rows: [MOCK_DOC] });
      expect(await fetchDocument(MOCK_DOC_ID)).toEqual(MOCK_DOCK_RESPONSE);
    });
  }),
);

describe(
  'upsertDocument',
  mockClear(() => {
    it('should create a new document with a new world and story when no IDs are provided', async () => {
      mockWithTransaction.mockImplementation((callback) => callback(mockClient));
      const mockClient = createMockClient();
      mockClient.query.mockResolvedValueOnce({ rows: [{ world_id: MOCK_WORLD_ID }] }); // INSERT world
      mockClient.query.mockResolvedValueOnce({ rows: [{ story_id: MOCK_STORY_ID }] }); // INSERT story
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT predecessor
      mockClient.query.mockResolvedValueOnce({ rows: [{ document_id: MOCK_DOC_ID }] }); // INSERT document
      mockFetchWorld.mockResolvedValueOnce(MOCK_WORLD_RESPONSE);

      expect(await upsertDocument(MOCK_USER_ID, { title: 'Chapter 1', body: 'Content' })).toEqual(
        MOCK_WORLD_RESPONSE,
      );
      expect(mockFetchWorld).toHaveBeenCalledWith(MOCK_WORLD_ID);
    });

    it('should update an existing document when documentId is provided', async () => {
      mockWithTransaction.mockImplementation((callback) => callback(mockClient as any));
      const mockClient = createMockClient();
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              ...MOCK_DOC,
              user_id: MOCK_USER_ID,
              world_id: MOCK_WORLD_ID,
            },
          ],
        })
        .mockResolvedValueOnce({});
      mockFetchWorld.mockResolvedValueOnce(MOCK_WORLD_RESPONSE);

      const result = await upsertDocument(MOCK_USER_ID, {
        documentId: MOCK_DOC_ID,
        title: 'Updated Chapter',
        body: 'Updated content',
      });

      expect(result).toEqual(MOCK_WORLD_RESPONSE);
      expect(mockFetchWorld).toHaveBeenCalledWith(MOCK_WORLD_ID);
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE documents SET title = $1, body = $2, updated_at = NOW() WHERE document_id = $3',
        ['Updated Chapter', 'Updated content', MOCK_DOC_ID],
      );
    });

    it('throw DocumentNotFoundError error if provided documentId do not exist in the database', async () => {
      mockWithTransaction.mockImplementation((callback) => callback(mockClient));
      const mockClient = createMockClient();
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // Get document, story, and world for documentId

      await expect(
        upsertDocument(MOCK_USER_ID, {
          title: 'Chapter 1',
          body: 'Content',
          documentId: MOCK_DOC_ID,
        }),
      ).rejects.toThrow(DocumentNotFoundError);
    });

    it('throw StoryNotFoundError when storyId does not exist', async () => {
      mockWithTransaction.mockImplementation((callback) => callback(mockClient as any));
      const mockClient = createMockClient();
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        upsertDocument(MOCK_USER_ID, { title: 'Chapter 1', body: '', storyId: MOCK_STORY_ID }),
      ).rejects.toThrow(StoryNotFoundError);

      expect(mockFetchWorld).not.toHaveBeenCalled();
    });
  }),
);
