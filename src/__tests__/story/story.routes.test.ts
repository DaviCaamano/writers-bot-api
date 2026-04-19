import { StoryNotFoundError, WorldNotFoundError } from '@/constants/error/custom-errors';

jest.mock('@/services/story/story.service');
jest.mock('@/services/story/document.service');
jest.mock('@/services/story/world.service');
jest.mock('@/config/stripe', () => ({ __esModule: true, default: {} }));

import request from 'supertest';
import app from '@/app';
import * as documentService from '@/services/story/document.service';
import * as storyService from '@/services/story/story.service';
import * as worldService from '@/services/story/world.service';
import { mockAuthHeaders } from '@/__tests__/constants/mock-auth-headers';
import { testAuth } from '@/__tests__/utils/test-wrappers';
import { MOCK_WORLD_RESPONSE } from '@/__tests__/constants/mock-story';

const mockUpsertDocument = documentService.upsertDocument as jest.Mock;
const mockUpsertStory = storyService.upsertStory as jest.Mock;
const mockUpsertWorld = worldService.upsertWorld as jest.Mock;

const MOCK_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // must match MOCK_LOGIN_RESPONSE.userId
const MOCK_WORLD_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
const MOCK_STORY_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

describe(
  'POST /story/world',
  testAuth('/story/world', 'post', { title: 'My World' }, () => {
    it('returns 400 when title is missing', async () => {
      const res = await request(app).post('/story/world').set(mockAuthHeaders()).send({});
      expect(res.status).toBe(400);
      expect(res.body.details.properties).toHaveProperty('title');
    });

    it('returns 200 with world data on success', async () => {
      mockUpsertWorld.mockResolvedValueOnce(MOCK_WORLD_RESPONSE);

      const res = await request(app)
        .post('/story/world')
        .set(mockAuthHeaders())
        .send({ title: 'Test World' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ worldId: MOCK_WORLD_ID, title: 'Test World' });
      expect(mockUpsertWorld).toHaveBeenCalledWith(MOCK_USER_ID, { title: 'Test World' });
    });

    it('returns 404 when world is not found', async () => {
      mockUpsertWorld.mockRejectedValueOnce(new WorldNotFoundError());

      const res = await request(app)
        .post('/story/world')
        .set(mockAuthHeaders())
        .send({ worldId: MOCK_WORLD_ID, title: 'Updated World' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('World not found');
    });
  }),
);

describe(
  'POST /story/story',
  testAuth('/story/story', 'post', { title: 'New Story' }, () => {
    it('returns 400 when title is missing', async () => {
      const res = await request(app).post('/story/story').set(mockAuthHeaders()).send({});
      expect(res.status).toBe(400);
    });

    it('returns 200 with world data on success', async () => {
      mockUpsertStory.mockResolvedValueOnce(MOCK_WORLD_RESPONSE);

      const res = await request(app)
        .post('/story/story')
        .set(mockAuthHeaders())
        .send({ title: 'New Story' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ worldId: MOCK_WORLD_ID });
      expect(mockUpsertStory).toHaveBeenCalledWith(MOCK_USER_ID, { title: 'New Story' });
    });

    it('returns 404 when world is not found', async () => {
      mockUpsertStory.mockRejectedValueOnce(new WorldNotFoundError());

      const res = await request(app)
        .post('/story/story')
        .set(mockAuthHeaders())
        .send({ title: 'My Story', worldId: MOCK_WORLD_ID });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('World not found');
    });
  }),
);

describe(
  'POST /story/document',
  testAuth('/story/document', 'post', { title: 'Chapter 1' }, () => {
    it('returns 400 when title is missing', async () => {
      const res = await request(app)
        .post('/story/document')
        .set(mockAuthHeaders())
        .send({ body: 'content' });
      expect(res.status).toBe(400);
      expect(res.body.details.properties).toHaveProperty('title');
    });

    it('returns 200 with world data on success', async () => {
      mockUpsertDocument.mockResolvedValueOnce(MOCK_WORLD_RESPONSE);

      const res = await request(app)
        .post('/story/document')
        .set(mockAuthHeaders())
        .send({ title: 'Chapter 1' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ worldId: MOCK_WORLD_ID });
      expect(mockUpsertDocument).toHaveBeenCalledWith(MOCK_USER_ID, {
        title: 'Chapter 1',
        body: '',
      });
    });

    it('returns 404 when story is not found', async () => {
      mockUpsertDocument.mockRejectedValueOnce(new StoryNotFoundError());

      const res = await request(app)
        .post('/story/document')
        .set(mockAuthHeaders())
        .send({ title: 'Chapter 1', storyId: MOCK_STORY_ID });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Story not found');
    });
  }),
);
