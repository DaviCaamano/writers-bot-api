jest.mock('@/services/story.service');
jest.mock('@/config/database', () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));
jest.mock('@/config/stripe', () => ({ __esModule: true, default: {} }));

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '@/app';
import * as storyService from '@/services/story.service';
import pool from '@/config/database';

const mockUpsertDocument = storyService.upsertDocument as jest.Mock;
const mockUpsertStory = storyService.upsertStory as jest.Mock;
const mockUpsertWorld = storyService.upsertWorld as jest.Mock;

const WORLD_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const STORY_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
const USER_ID  = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

const mockWorld = {
  worldId: WORLD_ID, userId: USER_ID, title: 'Test World',
  stories: [], createdAt: new Date(), updatedAt: new Date(),
};

function authHeaders(userId = USER_ID) {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ user_id: userId }] });
  return { Authorization: `Bearer ${token}` };
}

// POST /story/world
describe('POST /story/world', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/story/world').send({ title: 'My World' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when title is missing', async () => {
    const headers = authHeaders();
    const res = await request(app).post('/story/world').set(headers).send({});
    expect(res.status).toBe(400);
    expect(res.body.details.properties).toHaveProperty('title');
  });

  it('returns 200 when creating a new world', async () => {
    const headers = authHeaders();
    (pool.query as jest.Mock)
      // Mock First Query - retrieve existing world => no existing world
      .mockResolvedValueOnce({ rows: [] })
      // Mock subsequent Insert Query
      .mockResolvedValueOnce({ rows: [ { world_id: WORLD_ID }] });

    const res = await request(app).post('/story/world').set(headers).send({ title: 'My World' });

    expect(res.status).toBe(200);
    expect(res.body.worldId).toBe(WORLD_ID);
    expect(mockUpsertWorld).toHaveBeenCalledWith(USER_ID, { title: 'My World' });
  });

  it('returns 200 when updating an existing world', async () => {
    const headers = authHeaders();
    // Mock world already exists
    mockUpsertWorld.mockResolvedValueOnce({ ...mockWorld, title: 'Updated World' });

    const res = await request(app)
      .post('/story/world')
      .set(headers)
      .send({ worldId: WORLD_ID, title: 'Updated World' });

    expect(res.status).toBe(200);
  });
});

// POST /story/story
describe('POST /story/story', () => {
  it('returns 400 when title is missing', async () => {
    const headers = authHeaders();
    const res = await request(app).post('/story/story').set(headers).send({});
    expect(res.status).toBe(400);
  });

  it('returns 200 on success', async () => {
    const headers = authHeaders();
    mockUpsertStory.mockResolvedValueOnce(mockWorld);

    const res = await request(app).post('/story/story').set(headers).send({ title: 'My Story' });

    expect(res.status).toBe(200);
    expect(mockUpsertStory).toHaveBeenCalledWith(USER_ID, { title: 'My Story' });
  });

  it('returns 404 when world is not found', async () => {
    const headers = authHeaders();
    mockUpsertStory.mockRejectedValueOnce(new storyService.WorldNotFoundError());

    const res = await request(app)
      .post('/story/story')
      .set(headers)
      .send({ title: 'My Story', worldId: WORLD_ID });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('World not found');
  });
});

// POST /story/document
describe('POST /story/document', () => {
  it('returns 400 when title is missing', async () => {
    const headers = authHeaders();
    const res = await request(app).post('/story/document').set(headers).send({ body: 'content' });
    expect(res.status).toBe(400);
    expect(res.body.details.properties).toHaveProperty('title');
  });

  it('returns 200 on success', async () => {
    const headers = authHeaders();
    mockUpsertDocument.mockResolvedValueOnce(mockWorld);

    const res = await request(app)
      .post('/story/document')
      .set(headers)
      .send({ title: 'Chapter 1', body: 'Once upon a time...' });

    expect(res.status).toBe(200);
    expect(mockUpsertDocument).toHaveBeenCalledWith(USER_ID, { title: 'Chapter 1', body: 'Once upon a time...' });
  });

  it('returns 404 when story is not found', async () => {
    const headers = authHeaders();
    mockUpsertDocument.mockRejectedValueOnce(new storyService.StoryNotFoundError());

    const res = await request(app)
      .post('/story/document')
      .set(headers)
      .send({ title: 'Chapter 1', storyId: STORY_ID });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Story not found');
  });
});
