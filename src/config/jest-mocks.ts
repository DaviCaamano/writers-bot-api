jest.mock('@/config/database', () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));

jest.mock('@/config/anthropic', () => ({
  __esModule: true,
  default: { messages: { stream: jest.fn() } },
}));
