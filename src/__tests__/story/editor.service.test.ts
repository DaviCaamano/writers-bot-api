jest.mock('@/config/anthropic', () => ({
  __esModule: true,
  default: { messages: { stream: jest.fn() } },
}));

import anthropic from '@/config/anthropic';
import { editText } from '@/services/story/editor.service';
import { DocumentNotFoundError, InvalidSelectionError } from '@/constants/error/custom-errors';
import { MOCK_USER_ID } from '@/__tests__/constants/mock-user';
import { MOCK_DOC, MOCK_DOC_ID, mockPool } from '@/__tests__/constants/mock-story';
import { mockClear } from '@/__tests__/utils/test-wrappers';
import type { Response } from 'express';

const mockStream = anthropic.messages.stream as jest.Mock;

const createMockRes = () =>
  ({
    setHeader: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
  }) as unknown as Response & { setHeader: jest.Mock; write: jest.Mock; end: jest.Mock };

const asyncIter = (events: unknown[]) => ({
  async *[Symbol.asyncIterator]() {
    for (const e of events) yield e;
  },
});

describe(
  'editText',
  mockClear(() => {
    it('[fetchContextDocuments] throws DocumentNotFoundError when no rows match', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        editText(MOCK_USER_ID, MOCK_DOC_ID, { start: 0, end: 5 }, 'rewrite', createMockRes()),
      ).rejects.toThrow(DocumentNotFoundError);
    });

    it('[fetchContextDocuments] throws InvalidSelectionError when end exceeds body length', async () => {
      const body = 'short';
      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...MOCK_DOC, body }],
      });

      await expect(
        editText(
          MOCK_USER_ID,
          MOCK_DOC_ID,
          { start: 0, end: body.length + 1 },
          'rewrite',
          createMockRes(),
        ),
      ).rejects.toThrow(InvalidSelectionError);
    });

    it('streams text deltas as SSE data then writes [DONE]', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...MOCK_DOC, body: 'Hello world' }],
      });
      mockStream.mockReturnValueOnce(
        asyncIter([
          { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hi ' } },
          { type: 'content_block_delta', delta: { type: 'text_delta', text: 'there' } },
          { type: 'message_stop' },
        ]),
      );

      const res = createMockRes();
      await editText(MOCK_USER_ID, MOCK_DOC_ID, { start: 0, end: 5 }, 'rewrite', res);

      expect(res.write).toHaveBeenCalledWith(`data: ${JSON.stringify({ text: 'Hi ' })}\n\n`);
      expect(res.write).toHaveBeenCalledWith(`data: ${JSON.stringify({ text: 'there' })}\n\n`);
      expect(res.write).toHaveBeenCalledWith('data: [DONE]\n\n');
      expect(res.end).toHaveBeenCalled();
    });

    it('passes the sliced selection text to anthropic', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...MOCK_DOC, body: 'Hello world' }],
      });
      mockStream.mockReturnValueOnce(asyncIter([]));

      await editText(
        MOCK_USER_ID,
        MOCK_DOC_ID,
        { start: 6, end: 11 },
        'make it louder',
        createMockRes(),
      );

      const args = mockStream.mock.calls[0][0];
      expect(args.messages[0].content).toContain('<selection>\nworld\n</selection>');
      expect(args.messages[0].content).toContain('<instructions>\nmake it louder\n</instructions>');
    });
  }),
);
