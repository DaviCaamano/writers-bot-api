import type { DocumentResponse, StoryResponse, WorldResponse } from '@/types/response';
import type { DocumentRow, StoryRow, WorldRow } from '@/types/database';
export { mockPool } from '@/__tests__/constants/mock-database';

export const MOCK_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
export const MOCK_WORLD_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
export const MOCK_STORY_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
export const MOCK_DOC_ID = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

export const mockDate = new Date('2026-01-01T00:00:00Z');

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
