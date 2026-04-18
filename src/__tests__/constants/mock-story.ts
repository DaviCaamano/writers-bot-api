import type { DocumentResponse, StoryResponse, WorldResponse } from '@/types/response';
import type { DocumentRow, StoryRow, WorldRow } from '@/types/database';
import { mockDate } from '@/__tests__/constants/mock-basic';
export { mockPool } from '@/__tests__/constants/mock-database';

export const MOCK_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
export const MOCK_WORLD_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
export const MOCK_WORLD_IDs = ['380a22', '380a23', '380a24', '380a25'];
export const MOCK_STORY_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
export const MOCK_DOC_ID = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

export const mockWorld: WorldRow = {
  world_id: MOCK_WORLD_ID,
  user_id: MOCK_USER_ID,
  title: 'Test World',
  created_at: mockDate,
  updated_at: mockDate,
};

export const mockWorldResponse: WorldResponse = {
  worldId: MOCK_WORLD_ID,
  userId: MOCK_USER_ID,
  title: 'Test World',
  stories: [],
  createdAt: mockDate,
  updatedAt: mockDate,
};

export const mockStory: StoryRow = {
  story_id: MOCK_STORY_ID,
  world_id: MOCK_WORLD_ID,
  title: 'Test Story',
  predecessor_id: null,
  successor_id: null,
  created_at: mockDate,
  updated_at: mockDate,
};

export const mockStoryResponse: StoryResponse = {
  storyId: MOCK_STORY_ID,
  worldId: MOCK_WORLD_ID,
  title: 'Test Story',
  predecessorId: null,
  successorId: null,
  documents: [],
  createdAt: mockDate,
  updatedAt: mockDate,
};

export const mockDoc: DocumentRow = {
  document_id: MOCK_DOC_ID,
  story_id: MOCK_STORY_ID,
  title: 'Test Document',
  body: 'Test content',
  predecessor_id: null,
  successor_id: null,
  created_at: mockDate,
  updated_at: mockDate,
};

export const mockDocResponse: DocumentResponse = {
  documentId: MOCK_DOC_ID,
  storyId: MOCK_STORY_ID,
  title: 'Test Document',
  body: 'Test content',
  predecessorId: null,
  successorId: null,
  createdAt: mockDate,
  updatedAt: mockDate,
};

export const mockLegacyStoryIds = 'storyId';
export const mockLegacyDocumentId = 'docId';

export const mockStoryResponseList = (
  prefix: string,
  documentCounts: number[],
): StoryResponse[] => {
  const id = (suffix: number) => prefix + '-' + mockLegacyStoryIds + '-' + suffix;
  const docLengths = documentCounts.length;
  return [
    {
      ...mockStoryResponse,
      storyId: id(0),
      successorId: docLengths > 0 ? id(1) : null,
      documents: mockDocResponseList(prefix + 'doc0', documentCounts[0]),
    },
    ...(Array.from({ length: Math.max(0, docLengths - 2) }) as number[]).map((index: number) => ({
      ...mockStoryResponse,
      documentId: id(index + 1),
      predecessorId: id(index),
      successorId: docLengths - 2 > index ? id(index + 1) : null,
      documents: mockDocResponseList(prefix + 'doc' + index + 1, documentCounts[index + 1]),
    })),
    docLengths > 1
      ? {
          ...mockStoryResponse,
          documentId: id(docLengths - 1),
          predecessorId: id(Math.max(0, docLengths - 2)),
          successorId: null,
          documents: mockDocResponseList(
            prefix + 'doc' + (docLengths - 1),
            documentCounts[docLengths - 1],
          ),
        }
      : undefined,
  ].filter(Boolean) as StoryResponse[];
};
export const mockDocResponseList = (prefix: string, length: number): DocumentResponse[] => {
  const id = (suffix: number) => prefix + '-' + mockLegacyDocumentId + '-' + suffix;
  return [
    {
      ...mockDocResponse,
      documentId: id(0),
      successorId: length > 0 ? id(1) : null,
    },
    ...(Array.from({ length: Math.max(0, length - 2) }) as number[]).map((index: number) => ({
      ...mockDocResponse,
      documentId: id(index + 1),
      predecessorId: id(index),
      successorId: length - 2 > index ? id(index + 2) : null,
    })),
    length > 1
      ? {
          ...mockDocResponse,
          documentId: id(length - 1),
          predecessorId: id(Math.max(0, length - 2)),
          successorId: null,
        }
      : undefined,
  ].filter(Boolean) as DocumentResponse[];
};

const exampleDocumentPerStory = [
  [0, 1, 2, 3, 4],
  [0, 0, 0, 0],
  [5, 6, 7, 8],
  [1, 1, 1, 1],
  [11, 22, 33, 44],
];
export const mockLegacy: WorldResponse[] = MOCK_WORLD_IDs.map((id, index) => ({
  ...mockWorldResponse,
  worldId: id,
  stories: mockStoryResponseList(id, exampleDocumentPerStory[index]),
}));
