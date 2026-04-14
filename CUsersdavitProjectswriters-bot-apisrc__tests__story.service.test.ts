jest.mock('@/config/database');
jest.mock('@/utils/legacy');

import { upsertWorld, WorldNotFoundError } from '@/services/story.service';
import pool from '@/config/database';
import { fetchWorldById } from '@/utils/legacy';

const mockPool = pool as jest.Mocked<typeof pool>;
const mockFetchWorldById = fetchWorldById as jest.MockedFunction<typeof fetchWorldById>;

const USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const WORLD_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

const mockWorldResponse = {
  worldId: WORLD_ID,
  userId: USER_ID,
  title: 'Test World',
  stories: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('upsertWorld', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('creating a new world', () => {
    it('should insert a new world when no worldId is provided', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ world_id: WORLD_ID }] });
      mockFetchWorldById.mockResolvedValueOnce(mockWorldResponse);

      const result = await upsertWorld(USER_ID, { title: 'New World' });

      expect(result).toEqual(mockWorldResponse);
      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO worlds (user_id, title) VALUES ($1, $2) RETURNING world_id',
        [USER_ID, 'New World'],
      );
      expect(mockFetchWorldById).toHaveBeenCalledWith(WORLD_ID);
    });
  });

  describe('updating an existing world', () => {
    it('should update a world when worldId is provided and exists', async () => {
      const updatedResponse = { ...mockWorldResponse, title: 'Updated World' };
      mockPool.query.mockResolvedValueOnce({ rows: [{ world_id: WORLD_ID }] }); // Check exists
      mockFetchWorldById.mockResolvedValueOnce(updatedResponse);

      const result = await upsertWorld(USER_ID, { worldId: WORLD_ID, title: 'Updated World' });

      expect(result).toEqual(updatedResponse);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT 1 FROM worlds WHERE world_id = $1 AND user_id = $2',
        [WORLD_ID, USER_ID],
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE worlds SET title = $1, updated_at = NOW() WHERE world_id = $2',
        ['Updated World', WORLD_ID],
      );
    });

    it('should throw WorldNotFoundError when worldId is provided but does not exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // World doesn't exist

      await expect(upsertWorld(USER_ID, { worldId: WORLD_ID, title: 'Updated World' })).rejects.toThrow(
        WorldNotFoundError,
      );
    });
  });

  describe('response format', () => {
    it('should return the complete world structure with nested stories and documents', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ world_id: WORLD_ID }] });
      mockFetchWorldById.mockResolvedValueOnce(mockWorldResponse);

      const result = await upsertWorld(USER_ID, { title: 'New World' });

      expect(result).toHaveProperty('worldId');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('stories');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(Array.isArray(result.stories)).toBe(true);
    });
  });
});
