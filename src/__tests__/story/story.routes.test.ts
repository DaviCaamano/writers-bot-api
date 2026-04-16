import { StoryNotFoundError, WorldNotFoundError } from '@/utils/error/custom-errors';

jest.mock('@/services/story/story.service');
jest.mock('@/services/story/document.service');
jest.mock('@/services/story/world.service');
jest.mock('@/config/database', () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));
jest.mock('@/config/stripe', () => ({ __esModule: true, default: {} }));

import request from 'supertest';
import app from '@/app';
import * as documentService from '@/services/story/document.service';
import * as storyService from '@/services/story/story.service';
import * as worldService from '@/services/story/world.service';
import { mockAuthHeaders } from '@/__tests__/constants/mock-auth-headers';

const mockUpsertDocument = documentService.upsertDocument as jest.Mock;
const mockUpsertStory = storyService.upsertStory as jest.Mock;
const mockUpsertWorld = worldService.upsertWorld as jest.Mock;

const MOCK_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // must match mockLoginResponse.userId
const MOCK_WORLD_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
const MOCK_STORY_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

const mockWorldResponse = {
  worldId: MOCK_WORLD_ID,
  userId: MOCK_USER_ID,
  title: 'Test World',
  stories: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('POST /story/world', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/story/world').send({ title: 'My World' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when title is missing', async () => {
    const headers = mockAuthHeaders();
    const res = await request(app).post('/story/world').set(headers).send({});
    expect(res.status).toBe(400);
    expect(res.body.details.properties).toHaveProperty('title');
  });

  it('returns 200 with world data on success', async () => {
    const headers = mockAuthHeaders();
    mockUpsertWorld.mockResolvedValueOnce(mockWorldResponse);

    const res = await request(app).post('/story/world').set(headers).send({ title: 'Test World' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ worldId: MOCK_WORLD_ID, title: 'Test World' });
    expect(mockUpsertWorld).toHaveBeenCalledWith(MOCK_USER_ID, { title: 'Test World' });
  });

  it('returns 404 when world is not found', async () => {
    const headers = mockAuthHeaders();
    mockUpsertWorld.mockRejectedValueOnce(new WorldNotFoundError());

    const res = await request(app)
      .post('/story/world')
      .set(headers)
      .send({ worldId: MOCK_WORLD_ID, title: 'Updated World' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('World not found');
  });
});

describe('POST /story/story', () => {
  it('returns 400 when title is missing', async () => {
    const headers = mockAuthHeaders();
    const res = await request(app).post('/story/story').set(headers).send({});
    expect(res.status).toBe(400);
  });

  it('returns 200 with world data on success', async () => {
    const headers = mockAuthHeaders();
    mockUpsertStory.mockResolvedValueOnce(mockWorldResponse);

    const res = await request(app).post('/story/story').set(headers).send({ title: 'New Story' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ worldId: MOCK_WORLD_ID });
    expect(mockUpsertStory).toHaveBeenCalledWith(MOCK_USER_ID, { title: 'New Story' });
  });

  it('returns 404 when world is not found', async () => {
    const headers = mockAuthHeaders();
    mockUpsertStory.mockRejectedValueOnce(new WorldNotFoundError());

    const res = await request(app)
      .post('/story/story')
      .set(headers)
      .send({ title: 'My Story', worldId: MOCK_WORLD_ID });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('World not found');
  });
});

describe('POST /story/document', () => {
  it('returns 400 when title is missing', async () => {
    const headers = mockAuthHeaders();
    const res = await request(app).post('/story/document').set(headers).send({ body: 'content' });
    expect(res.status).toBe(400);
    expect(res.body.details.properties).toHaveProperty('title');
  });

  it('returns 200 with world data on success', async () => {
    const headers = mockAuthHeaders();
    mockUpsertDocument.mockResolvedValueOnce(mockWorldResponse);

    const res = await request(app)
      .post('/story/document')
      .set(headers)
      .send({ title: 'Chapter 1' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ worldId: MOCK_WORLD_ID });
    expect(mockUpsertDocument).toHaveBeenCalledWith(MOCK_USER_ID, { title: 'Chapter 1', body: '' });
  });

  it('returns 404 when story is not found', async () => {
    const headers = mockAuthHeaders();
    mockUpsertDocument.mockRejectedValueOnce(new StoryNotFoundError());

    const res = await request(app)
      .post('/story/document')
      .set(headers)
      .send({ title: 'Chapter 1', storyId: MOCK_STORY_ID });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Story not found');
  });
});
