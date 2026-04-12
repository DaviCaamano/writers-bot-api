import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AuthRequest } from '../types';
import {
  UpsertDocumentSchema, UpsertDocumentBody,
  UpsertStorySchema, UpsertStoryBody,
  UpsertWorldSchema, UpsertWorldBody,
} from '../schemas/story.schemas';
import {
  upsertDocument,
  upsertStory,
  upsertWorld,
  StoryNotFoundError,
  WorldNotFoundError,
} from '../services/story.service';

const router = Router();

router.post('/document', authMiddleware, validate(UpsertDocumentSchema), async (req: AuthRequest, res: Response): Promise<void> => {
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
});

router.post('/story', authMiddleware, validate(UpsertStorySchema), async (req: AuthRequest, res: Response): Promise<void> => {
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
});

router.post('/world', authMiddleware, validate(UpsertWorldSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const world = await upsertWorld(req.userId!, req.body as UpsertWorldBody);
  res.json(world);
});

export default router;
