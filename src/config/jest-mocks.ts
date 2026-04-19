jest.mock('@/config/database', () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));
