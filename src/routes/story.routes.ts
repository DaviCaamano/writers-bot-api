import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { generalLimiter } from '../config/rateLimiters';
import {
  UpsertDocumentSchema,
  UpsertDocumentBody,
  UpsertStorySchema,
  UpsertStoryBody,
  UpsertWorldSchema,
  UpsertWorldBody,
} from '../schemas/story.schemas';
import {
  upsertDocument,
  upsertStory,
  upsertWorld,
  StoryNotFoundError,
  WorldNotFoundError,
} from '../services/story.service';
import { AuthRequest } from '../types/Request';

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
    const world = await upsertWorld(req.userId!, req.body as UpsertWorldBody);
    res.json(world);
  },
);

export default router;
