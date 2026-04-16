import { DocumentResponse, StoryResponse, WorldResponse } from '@/types/response';
import {
  DocumentRow,
  StoryRow,
  StoryRowWithDocuments,
  WorldRow,
  WorldRowWithStories,
} from '@/types/database';
import { orderLinkedDocs } from '@/utils/order-linked-docs';

export const mapDocumentResponse = (row: DocumentRow): DocumentResponse => {
  return {
    documentId: row.document_id,
    storyId: row.story_id,
    title: row.title,
    body: row.body,
    predecessorId: row.predecessor_id,
    successorId: row.successor_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const mapStoryResponse = (
  row: StoryRow | StoryRowWithDocuments,
  documents: DocumentRow[] = [],
): StoryResponse => {
  const rowWithDocs = ((row as StoryRowWithDocuments).documents ?? documents)?.map(
    mapDocumentResponse,
  );
  return {
    storyId: row.story_id,
    worldId: row.world_id,
    title: row.title,
    predecessorId: row.predecessor_id,
    successorId: row.successor_id,
    documents: orderLinkedDocs(rowWithDocs, (doc) => doc.documentId),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const mapWorldResponse = (
  row: WorldRow | WorldRowWithStories,
  stories: StoryRow | StoryRowWithDocuments[] = [],
): WorldResponse => {
  const rowWithStories = ((row as WorldRowWithStories).stories ?? stories)?.map((world) =>
    mapStoryResponse(world),
  );
  return {
    worldId: row.world_id,
    userId: row.user_id,
    title: row.title,
    stories: orderLinkedDocs(rowWithStories, (doc) => doc.storyId),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};
