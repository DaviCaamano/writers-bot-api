import {
  MOCK_DOC_ID,
  MOCK_STORY_ID,
  MOCK_USER_ID,
  MOCK_WORLD_ID,
  MOCK_DOC,
  MOCK_STORY,
  MOCK_WORLD,
  MOCK_WORLD_RESPONSE,
} from '@/__tests__/constants/mock-story';

jest.mock('@/config/database');

import { WorldNotFoundError } from '@/constants/error/custom-errors';
import { DocumentRow, StoryRow } from '@/types/database';
import { mockPool } from '@/__tests__/constants/mock-database';
import { MOCK_DATE } from '@/__tests__/constants/mock-basic';
import { mockClear } from '@/__tests__/utils/test-wrappers';

import * as worldService from '@/services/story/world.service';
describe(
  'upsertWorld',
  mockClear(() => {
    it('should insert a new world when no worldId is provided', async () => {
      const mockFetch = jest.fn().mockResolvedValueOnce(MOCK_WORLD_RESPONSE);
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ world_id: MOCK_WORLD_ID }] }); // INSERT worlds

      const result = await worldService.upsertWorld(
        MOCK_USER_ID,
        { title: 'Test World' },
        mockFetch,
      );
      expect(mockFetch).toHaveBeenCalledWith(MOCK_WORLD_ID);
      expect(result).toEqual(MOCK_WORLD_RESPONSE);
    });

    it('should update a world when worldId is provided and exists', async () => {
      const updatedResponse = { ...MOCK_WORLD_RESPONSE, title: 'Updated World' };
      const mockFetch = jest.fn().mockResolvedValueOnce(updatedResponse);

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{}] }) // SELECT 1 (ownership check)
        .mockResolvedValueOnce({}); // UPDATE worlds

      const result = await worldService.upsertWorld(
        MOCK_USER_ID,
        { worldId: MOCK_WORLD_ID, title: 'Updated World' },
        mockFetch,
      );

      expect(mockFetch).toHaveBeenCalledWith(MOCK_WORLD_ID);
      expect(result).toEqual(updatedResponse);
    });

    it('throw WorldNotFoundError when worldId does not exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        worldService.upsertWorld(MOCK_USER_ID, { worldId: MOCK_WORLD_ID, title: 'Updated World' }),
      ).rejects.toThrow(WorldNotFoundError);
    });
  }),
);

describe(
  'fetchWorld',
  mockClear(() => {
    it('should return null when the world does not exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await worldService.fetchWorld(MOCK_WORLD_ID);
      expect(result).toBeNull();
    });

    it('should return the world with nested stories and documents', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [MOCK_WORLD] })
        .mockResolvedValueOnce({ rows: [MOCK_STORY] })
        .mockResolvedValueOnce({ rows: [MOCK_DOC] });

      const result = await worldService.fetchWorld(MOCK_WORLD_ID);

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
                createdAt: MOCK_DATE,
                updatedAt: MOCK_DATE,
              },
            ],
            createdAt: MOCK_DATE,
            updatedAt: MOCK_DATE,
          },
        ],
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
      });
    });

    it('should return a mapped world with no stories', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [MOCK_WORLD] }) // SELECT worlds
        .mockResolvedValueOnce({ rows: [] }); // SELECT stories

      const result = await worldService.fetchWorld(MOCK_WORLD_ID);
      expect(result).toEqual(MOCK_WORLD_RESPONSE);
    });

    it('should skip the documents query when there are no stories', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [MOCK_WORLD] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await worldService.fetchWorld(MOCK_WORLD_ID);

      expect(result?.stories).toEqual([]);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should map predecessor and successor IDs correctly', async () => {
      const linkedDoc1Id = 'e5eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
      const linkedDoc2Id = 'e5eebc99-9c0b-4ef8-bb6d-6bb9bd380a56';
      const linkedDoc3Id = 'e5eebc99-9c0b-4ef8-bb6d-6bb9bd380a57';
      const linkedDoc1: DocumentRow = {
        ...MOCK_DOC,
        document_id: linkedDoc1Id,
        predecessor_id: null,
        successor_id: linkedDoc2Id,
      };
      const linkedDoc2: DocumentRow = {
        ...MOCK_DOC,
        document_id: linkedDoc2Id,
        predecessor_id: linkedDoc1Id,
        successor_id: linkedDoc3Id,
      };
      const linkedDoc3: DocumentRow = {
        ...MOCK_DOC,
        document_id: linkedDoc3Id,
        predecessor_id: linkedDoc2Id,
        successor_id: null,
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [MOCK_WORLD] })
        .mockResolvedValueOnce({ rows: [MOCK_STORY] })
        .mockResolvedValueOnce({ rows: [linkedDoc1, linkedDoc2, linkedDoc3] });

      const result = await worldService.fetchWorld(MOCK_WORLD_ID);

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
      const story1: StoryRow = { ...MOCK_STORY, successor_id: story2Id };
      const story2: StoryRow = {
        ...MOCK_STORY,
        story_id: story2Id,
        title: 'Story 2',
        predecessor_id: MOCK_STORY_ID,
        successor_id: null,
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [MOCK_WORLD] })
        .mockResolvedValueOnce({ rows: [story1, story2] })
        .mockResolvedValueOnce({ rows: [MOCK_DOC] }); // only belongs to MOCK_STORY_ID

      const result = await worldService.fetchWorld(MOCK_WORLD_ID);

      expect(result!.stories).toHaveLength(2);
      expect(result!.stories[0].documents).toHaveLength(1);
      expect(result!.stories[1].documents).toHaveLength(0);
    });
  }),
);
