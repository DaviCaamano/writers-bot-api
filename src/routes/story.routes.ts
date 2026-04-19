import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { aiLimiter, generalLimiter } from '@/config/rate-limiters';
import {
  UpsertDocumentSchema,
  UpsertDocumentBody,
  UpsertStorySchema,
  UpsertStoryBody,
  UpsertWorldSchema,
  UpsertWorldBody,
  EditorSchema,
  EditorBody,
} from '@/schemas/story.schemas';
import { upsertStory } from '@/services/story/story.service';
import { AuthRequest } from '@/types/request';
import { upsertDocument } from '@/services/story/document.service';
import {
  DocumentNotFoundError,
  InvalidSelectionError,
  StoryNotFoundError,
  WorldNotFoundError,
} from '@/constants/error/custom-errors';
import { upsertWorld } from '@/services/story/world.service';
import { editText } from '@/services/story/editor.service';
import { RouteResponse, StoryResponse, WorldResponse } from '@/types/response';

const router = Router();

router.post(
  '/document',
  authMiddleware,
  generalLimiter,
  validate(UpsertDocumentSchema),
  async (req: AuthRequest, res: RouteResponse<WorldResponse | null>): Promise<void> => {
    try {
      const world = await upsertDocument(req.userId!, req.body as UpsertDocumentBody);
      res.json(world);
    } catch (err) {
      if (err instanceof StoryNotFoundError) {
        res.status(404).json({ error: 'Story not found' });
        return;
      }
      throw err;
    }
  },
);

router.post(
  '/story',
  authMiddleware,
  generalLimiter,
  validate(UpsertStorySchema),
  async (req: AuthRequest, res: RouteResponse<StoryResponse>): Promise<void> => {
    try {
      const world = await upsertStory(req.userId!, req.body as UpsertStoryBody);
      res.json(world);
    } catch (err) {
      if (err instanceof WorldNotFoundError) {
        res.status(404).json({ error: 'World not found' });
        return;
      }
      throw err;
    }
  },
);

router.post(
  '/world',
  authMiddleware,
  generalLimiter,
  validate(UpsertWorldSchema),
  async (req: AuthRequest, res: RouteResponse<WorldResponse | null>): Promise<void> => {
    try {
      const world = await upsertWorld(req.userId!, req.body as UpsertWorldBody);
      res.json(world);
    } catch (err) {
      if (err instanceof WorldNotFoundError) {
        res.status(404).json({ error: 'World not found' });
      } else {
        throw err;
      }
    }
  },
);

router.post(
  '/editor',
  authMiddleware,
  aiLimiter,
  validate(EditorSchema),
  async (req: AuthRequest, res: RouteResponse<never>): Promise<void> => {
    try {
      const body = req.body as EditorBody;
      await editText(req.userId!, body.documentId, body.selection, body.prompt, res);
    } catch (err) {
      if (err instanceof DocumentNotFoundError) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }
      if (err instanceof InvalidSelectionError) {
        res.status(400).json({ error: 'Invalid selection range' });
        return;
      }
      throw err;
    }
  },
);

export default router;
