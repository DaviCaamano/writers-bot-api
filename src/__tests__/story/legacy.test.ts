jest.mock('@/config/database');

import type { WorldRow, StoryRow, DocumentRow } from '@/types/database';
import { fetchLegacy } from '@/utils/story/world';
import {
  MOCK_DOC_ID,
  MOCK_STORY_ID,
  MOCK_USER_ID,
  MOCK_WORLD_ID,
  MOCK_DOC,
  MOCK_STORY,
  MOCK_WORLD,
} from '@/__tests__/constants/mock-story';
import { mockPool } from '@/__tests__/constants/mock-database';
import { mockClear } from '@/__tests__/utils/test-wrappers';
import { MOCK_DATE } from '@/__tests__/constants/mock-basic';

describe(
  'fetchLegacy',
  mockClear(() => {
    it('should return an empty array when user has no worlds', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      expect(await fetchLegacy(MOCK_USER_ID)).toEqual([]);
    });

    it('should return worlds with nested stories and documents', async () => {
      (mockPool.query as jest.Mock)
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
      const world2Id = 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
      const story2Id = 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66';
      const story3Id = 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a77';
      const story4Id = 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a88';
      const story5Id = 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a99';
      const doc2Id = 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a00';

      const world2: WorldRow = { ...MOCK_WORLD, world_id: world2Id, title: 'World 2' };
      const story1: StoryRow = {
        ...MOCK_STORY,
        world_id: MOCK_WORLD_ID,
        successor_id: story2Id,
      };
      const story2: StoryRow = {
        ...MOCK_STORY,
        story_id: story2Id,
        world_id: MOCK_WORLD_ID,
        predecessor_id: MOCK_STORY.story_id,
        successor_id: null,
        title: 'Story 2',
      };
      const story3: StoryRow = {
        ...MOCK_STORY,
        story_id: story3Id,
        world_id: world2Id,
        successor_id: story4Id,
        title: 'Story 3',
      };
      const story4: StoryRow = {
        ...MOCK_STORY,
        story_id: story4Id,
        world_id: world2Id,
        predecessor_id: story3Id,
        successor_id: story5Id,
        title: 'Story 4',
      };
      const story5: StoryRow = {
        ...MOCK_STORY,
        story_id: story5Id,
        world_id: world2Id,
        predecessor_id: story4Id,
        successor_id: null,
        title: 'Story 5',
      };
      const doc1: DocumentRow = {
        ...MOCK_DOC,
        story_id: MOCK_STORY.story_id,
        predecessor_id: null,
        successor_id: doc2Id,
      };
      const doc2: DocumentRow = {
        ...MOCK_DOC,
        document_id: doc2Id,
        story_id: MOCK_STORY.story_id,
        predecessor_id: MOCK_DOC.document_id,
        successor_id: null,
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [MOCK_WORLD, world2] })
        .mockResolvedValueOnce({ rows: [story1, story2, story3, story4, story5] })
        .mockResolvedValueOnce({ rows: [doc1, doc2] });

      const result = await fetchLegacy(MOCK_USER_ID);

      expect(result).toHaveLength(2);
      expect(result[0].worldId).toBe(MOCK_WORLD_ID);
      expect(result[1].worldId).toBe(world2Id);
      expect(result[0].stories).toHaveLength(2);
      expect(result[0].stories[0].storyId).toBe(MOCK_STORY.story_id);
      expect(result[0].stories[1].storyId).toBe(story2.story_id);
      expect(result[0].stories[0].documents).toHaveLength(2);
      expect(result[0].stories[1].documents).toHaveLength(0);
      expect(result[0].stories[0].documents[0].documentId).toBe(MOCK_DOC.document_id);
      expect(result[0].stories[0].documents[1].documentId).toBe(doc2Id);
      expect(result[1].stories).toHaveLength(3);
      expect(result[1].stories[0].storyId).toBe(story3Id);
      expect(result[1].stories[1].storyId).toBe(story4Id);
      expect(result[1].stories[2].storyId).toBe(story5Id);
    });

    it('should skip the documents query when there are no stories', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [MOCK_WORLD] })
        .mockResolvedValueOnce({ rows: [] }); // no stories — documents query should NOT fire

      const result = await fetchLegacy(MOCK_USER_ID);

      expect(result[0].stories).toEqual([]);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
  }),
);
