import {
  MOCK_DOC_ID,
  MOCK_STORY_ID,
  MOCK_WORLD_ID,
  MOCK_DOC,
  MOCK_STORY,
  MOCK_WORLD,
  MOCK_WORLD_RESPONSE,
} from '@/__tests__/constants/mock-story';

import { WorldNotFoundError } from '@/constants/error/custom-errors';
import {
  DocumentRow,
  StoryRow,
  StoryRowWithDocuments,
  WorldRowWithStories,
} from '@/types/database';
import { mockPool } from '@/__tests__/constants/mock-database';
import { MOCK_DATE } from '@/__tests__/constants/mock-basic';
import { mockClear } from '@/__tests__/utils/test-wrappers';

import * as worldService from '@/services/story/world.service';
import { DocType, checkLegacyStructure, mockLegacy } from '@/__tests__/utils/mock-linked-documents';
import { fetchLegacy } from '@/services/story/world.service';
import { MOCK_USER_ID } from '@/__tests__/constants/mock-user';

describe(
  'upsertWorld',
  mockClear(() => {
    it('should insert a new world when no worldId is provided', async () => {
      const mockFetch = jest.fn().mockResolvedValueOnce(MOCK_WORLD_RESPONSE);
      mockPool.query.mockResolvedValueOnce({ rows: [{ world_id: MOCK_WORLD_ID }] }); // INSERT worlds

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

      mockPool.query
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
      mockPool.query.mockResolvedValueOnce({ rows: [] });

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
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await worldService.fetchWorld(MOCK_WORLD_ID);
      expect(result).toBeNull();
    });

    it('should return the world with nested stories and documents', async () => {
      mockPool.query
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
      mockPool.query
        .mockResolvedValueOnce({ rows: [MOCK_WORLD] }) // SELECT worlds
        .mockResolvedValueOnce({ rows: [] }); // SELECT stories

      const result = await worldService.fetchWorld(MOCK_WORLD_ID);
      expect(result).toEqual(MOCK_WORLD_RESPONSE);
    });

    it('should map predecessor and successor IDs correctly', async () => {
      const worlds: WorldRowWithStories[] = mockLegacy([
        [3, 7, 1, 4],
        [0, 5, 9, 2, 6],
        [8, 1, 3],
        [4, 6, 0, 7, 2],
        [9, 3, 5, 1],
      ]);

      // fetchWorld handles one world at a time — provide only the first world's stories/docs
      const singleWorld = worlds[0];
      const worldList = [{ ...singleWorld, stories: undefined }];
      const storyList = (singleWorld.stories as StoryRowWithDocuments[]).map(
        ({ documents: _, ...story }) => story,
      );
      const documentList = (singleWorld.stories as StoryRowWithDocuments[]).reduce<DocumentRow[]>(
        (acc, story) => [...acc, ...story.documents],
        [],
      );

      mockPool.query
        .mockResolvedValueOnce({ rows: worldList })
        .mockResolvedValueOnce({ rows: storyList })
        .mockResolvedValueOnce({ rows: documentList });

      const result = await worldService.fetchWorld(MOCK_WORLD_ID);
      expect(result).not.toBeNull();
      expect(checkLegacyStructure([result!], DocType.worldResponse)).toBe(true);
    });
  }),
);

describe(
  'fetchLegacy',
  mockClear(() => {
    it('should return an empty array when user has no worlds', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      expect(await fetchLegacy(MOCK_USER_ID)).toEqual([]);
    });

    it('should return worlds with nested stories and documents', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [MOCK_WORLD] })
        .mockResolvedValueOnce({ rows: [MOCK_STORY] })
        .mockResolvedValueOnce({ rows: [MOCK_DOC] });

      const result = await fetchLegacy(MOCK_USER_ID);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
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

    it('should group stories and documents under the correct world', async () => {
      const worlds = mockLegacy([
        [2, 0],
        [3, 1, 4],
      ]);

      const worldList = worlds.map((world) => ({ ...world, stories: undefined }));
      const storyList = worlds.reduce<StoryRow[]>(
        (acc, world) => [
          ...acc,
          ...(world.stories as StoryRowWithDocuments[]).map(({ documents: _, ...story }) => story),
        ],
        [],
      );
      const documentList = worlds
        .reduce<
          StoryRowWithDocuments[]
        >((acc, world) => [...acc, ...(world.stories as StoryRowWithDocuments[])], [])
        .reduce<DocumentRow[]>((acc, story) => [...acc, ...story.documents], []);

      mockPool.query
        .mockResolvedValueOnce({ rows: worldList })
        .mockResolvedValueOnce({ rows: storyList })
        .mockResolvedValueOnce({ rows: documentList });

      const result = await fetchLegacy(MOCK_USER_ID);

      expect(result).toHaveLength(2);
      expect(result[0].stories).toHaveLength(2);
      expect(result[1].stories).toHaveLength(3);
      expect(checkLegacyStructure(result, DocType.worldResponse)).toBe(true);
    });

    it('should skip the documents query when there are no stories', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [MOCK_WORLD] })
        .mockResolvedValueOnce({ rows: [] }); // no stories — documents query should NOT fire

      const result = await fetchLegacy(MOCK_USER_ID);

      expect(result[0].stories).toEqual([]);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
  }),
);
