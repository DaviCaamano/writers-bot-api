import { orderLinkedDocs } from '@/utils/order-linked-docs';
import { DocumentResponse } from '@/types/response';

const MOCK_STORY_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
const MOCK_DOC_ID = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
const mockDate = new Date('2026-01-01T00:00:00Z');

const mockDoc: DocumentResponse = {
  documentId: MOCK_DOC_ID,
  storyId: MOCK_STORY_ID,
  title: 'Test Document',
  body: 'Test content',
  predecessorId: null,
  successorId: null,
  createdAt: mockDate,
  updatedAt: mockDate,
};
const getId = (doc: DocumentResponse) => doc.documentId;

const invalidLinkedDocId = '-1';
const cyclicalLinkedDoc = '??';
const linkedDoc1Id = '1';
const linkedDoc2Id = '2';
const linkedDoc3Id = '3';
const linkedDoc1: DocumentResponse = {
  ...mockDoc,
  documentId: linkedDoc1Id,
  predecessorId: null,
  successorId: linkedDoc2Id,
};
const linkedDoc2: DocumentResponse = {
  ...mockDoc,
  documentId: linkedDoc2Id,
  predecessorId: linkedDoc1Id,
  successorId: linkedDoc3Id,
};
const linkedDoc3: DocumentResponse = {
  ...mockDoc,
  documentId: linkedDoc3Id,
  predecessorId: linkedDoc2Id,
  successorId: null,
};

describe('orderLinkedDocs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return an empty array when there are no linked documents', () => {
    // Returns an empty array when given an empty array
    expect(orderLinkedDocs([], getId)).toEqual([]);
  });

  it('Sorts the linked elements correctly', () => {
    expect(orderLinkedDocs([linkedDoc3, linkedDoc2, linkedDoc1], getId)).toEqual([
      linkedDoc1,
      linkedDoc2,
      linkedDoc3,
    ]);
  });

  it('Throws an error if linked-list has no head', () => {
    expect(() =>
      orderLinkedDocs(
        [linkedDoc3, linkedDoc2, { ...linkedDoc1, predecessorId: invalidLinkedDocId }],
        getId,
      ),
    ).toThrow('No head node found');
  });

  it('Throws an error if linked-list has a cyclical link', () => {
    expect(() =>
      orderLinkedDocs(
        [linkedDoc3, linkedDoc2, { ...linkedDoc1, successorId: invalidLinkedDocId }],
        getId,
      ),
    ).toThrow('Broken chain: successor not found');
  });

  it('Throws an error if there is a cycle existing within the list', () => {
    expect(() =>
      orderLinkedDocs(
        [
          linkedDoc1,
          { ...linkedDoc2, successorId: cyclicalLinkedDoc },
          {
            ...linkedDoc1,
            documentId: cyclicalLinkedDoc,
            predecessorId: linkedDoc2Id,
            successorId: linkedDoc1Id,
          },
          //Never reach this doc, prevented by an infinite cycle
          linkedDoc3,
        ],
        getId,
      ),
    ).toThrow('Cycle detected in linked list');
  });
});
