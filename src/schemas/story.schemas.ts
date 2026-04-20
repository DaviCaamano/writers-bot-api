import { z } from '@/config/zod-extended';

export const UpsertDocumentSchema = z.object({
  documentId: z.uuid('documentId must be a valid UUID').optional(),
  title: z.string().min(1, 'Title is required').max(500),
  body: z.string().optional().default(''),
  storyId: z.uuid('storyId must be a valid UUID').optional(),
});

export const UpsertStorySchema = z.object({
  storyId: z.uuid('storyId must be a valid UUID').optional(),
  title: z.string().min(1, 'Title is required').max(500),
  worldId: z.uuid('worldId must be a valid UUID').optional(),
});

export const UpsertWorldSchema = z.object({
  worldId: z.uuid('worldId must be a valid UUID').optional(),
  title: z.string().min(1, 'Title is required').max(500),
});

export const EditorSchema = z
  .object({
    documentId: z.uuid('documentId must be a valid UUID'),
    selection: z.object({
      start: z.number().int().min(0),
      end: z.number().int().min(0),
    }),
    prompt: z.string().max(1000),
  })
  .refine((data) => data.selection.end > data.selection.start, {
    message: 'selection.end must be greater than selection.start',
    path: ['selection'],
  });

export type UpsertDocumentBody = z.infer<typeof UpsertDocumentSchema>;
export type UpsertStoryBody = z.infer<typeof UpsertStorySchema>;
export type UpsertWorldBody = z.infer<typeof UpsertWorldSchema>;
export type EditorBody = z.infer<typeof EditorSchema>;
