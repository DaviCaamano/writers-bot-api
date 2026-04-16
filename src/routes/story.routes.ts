import { Router, Response } from 'express';
import { authMiddleware } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { generalLimiter } from '@/config/rate-limiters';
import {
  UpsertDocumentSchema,
  UpsertDocumentBody,
  UpsertStorySchema,
  UpsertStoryBody,
  UpsertWorldSchema,
  UpsertWorldBody,
} from '@/schemas/story.schemas';
import { upsertStory } from '@/services/story.service';
import { AuthRequest } from '@/types/request';
import { upsertDocument } from '@/services/document.service';
import { StoryNotFoundError, WorldNotFoundError } from '@/utils/error/custom-errors';
import { upsertWorld } from '@/services/world.service';

const router = Router();

router.post(
  '/document',
  authMiddleware,
  generalLimiter,
  validate(UpsertDocumentSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
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
  async (req: AuthRequest, res: Response): Promise<void> => {
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
  async (req: AuthRequest, res: Response): Promise<void> => {
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

export default router;
