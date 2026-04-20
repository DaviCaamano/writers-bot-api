import { DocumentNotFoundError, InvalidSelectionError } from '@/constants/error/custom-errors';

jest.mock('@/services/story/editor.service');
jest.mock('@/config/stripe', () => ({ __esModule: true, default: {} }));

import request from 'supertest';
import app from '@/app';
import * as editorService from '@/services/story/editor.service';
import { mockAuthHeaders } from '@/__tests__/constants/mock-auth-headers';
import { testAuth } from '@/__tests__/utils/test-wrappers';
import { MOCK_DOC_ID } from '@/__tests__/constants/mock-story';
import { MOCK_USER_ID } from '@/__tests__/constants/mock-user';

const mockEditText = editorService.editText as jest.Mock;

const validBody = {
  documentId: MOCK_DOC_ID,
  selection: { start: 0, end: 5 },
  prompt: 'rewrite this',
};

describe(
  'POST /story/editor',
  testAuth('/story/editor', 'post', validBody, () => {
    it('returns 400 when selection.end <= selection.start', async () => {
      const res = await request(app)
        .post('/story/editor')
        .set(mockAuthHeaders())
        .send({ ...validBody, selection: { start: 5, end: 5 } });
      expect(res.status).toBe(400);
    });

    it('returns 400 when prompt is missing', async () => {
      const res = await request(app)
        .post('/story/editor')
        .set(mockAuthHeaders())
        .send({ documentId: MOCK_DOC_ID, selection: { start: 0, end: 5 } });
      expect(res.status).toBe(400);
    });

    it('returns 404 when document is not found', async () => {
      mockEditText.mockRejectedValueOnce(new DocumentNotFoundError());

      const res = await request(app).post('/story/editor').set(mockAuthHeaders()).send(validBody);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Document not found');
    });

    it('returns 400 when selection range is invalid', async () => {
      mockEditText.mockRejectedValueOnce(new InvalidSelectionError());

      const res = await request(app).post('/story/editor').set(mockAuthHeaders()).send(validBody);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid selection range');
    });

    it('delegates to editText on success', async () => {
      mockEditText.mockImplementationOnce(async (_u, _d, _s, _p, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.write('data: [DONE]\n\n');
        res.end();
      });

      const res = await request(app).post('/story/editor').set(mockAuthHeaders()).send(validBody);

      expect(res.status).toBe(200);
      expect(mockEditText).toHaveBeenCalledWith(
        MOCK_USER_ID,
        MOCK_DOC_ID,
        { start: 0, end: 5 },
        'rewrite this',
        expect.anything(),
      );
    });
  }),
);
