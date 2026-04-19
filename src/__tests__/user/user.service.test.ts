jest.mock('@/utils/database/with-transaction');
jest.mock('@/utils/database/with-query');
jest.mock('@/config/stripe', () => ({
  __esModule: true,
  default: {
    customers: { create: jest.fn() },
    paymentMethods: { attach: jest.fn() },
    paymentIntents: { create: jest.fn() },
  },
}));

import { addGenres, createUser, subscribe, updateUser } from '@/services/user/user.service';
import {
  MOCK_GENRE,
  MOCK_GENRES,
  MOCK_NEW_USER,
  MOCK_PLAN,
  MOCK_SUBSCRIPTION_REQUEST,
  MOCK_UPDATING_USER,
  MOCK_USER,
  MOCK_USER_ID,
} from '@/__tests__/constants/mock-user';
import { createMockClient, mockPool } from '@/__tests__/constants/mock-database';
import { EmailTakenError, StripePaymentFailed } from '@/constants/error/custom-errors';
import { PoolClient } from 'pg';
import { withQuery } from '@/utils/database/with-query';
import { withTransaction } from '@/utils/database/with-transaction';
import stripe from '@/config/stripe';
import { mockStripCustomer, mockStripePaymentIntent } from '@/__tests__/constants/mock-stripe';
import { mockClear } from '@/__tests__/utils/test-wrappers';
const mockWithQuery = withQuery as jest.MockedFunction<typeof withQuery>;
const mockWithTransaction = withTransaction as jest.MockedFunction<typeof withTransaction>;

describe(
  'user service: createUser',
  mockClear(() => {
    it('should create a new user', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce(undefined);
      await expect(createUser(MOCK_NEW_USER)).resolves.not.toThrow();
    });

    it('throw EmailTakenError error if email is taken', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [MOCK_USER] });
      await expect(createUser(MOCK_NEW_USER)).rejects.toThrow(EmailTakenError);
    });
  }),
);

describe(
  'user service: updateUser',
  mockClear(() => {
    it('should update a user', async () => {
      const mockClient = createMockClient();
      mockClient.query
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [MOCK_USER] })
        .mockResolvedValueOnce({ rows: [MOCK_PLAN] });

      mockWithTransaction.mockImplementation((callback) => callback(mockClient as PoolClient));

      await expect(updateUser(MOCK_USER_ID, MOCK_UPDATING_USER)).resolves.not.toThrow();
    });
  }),
);

describe(
  'user service: addGenres',
  mockClear(() => {
    it('should add genres to a user', async () => {
      const mockClient = createMockClient();
      mockClient.query
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [MOCK_GENRE] });
      mockWithQuery.mockImplementation((callback) => callback(mockClient as PoolClient));
      await expect(addGenres(MOCK_USER_ID, MOCK_GENRES)).resolves.not.toThrow();
    });
  }),
);

describe(
  'user service: subscribe',
  mockClear(() => {
    it('should subscribe user to pro-plan', async () => {
      const mockClient = createMockClient();
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
        .mockResolvedValueOnce({ rows: [MOCK_USER] })
        .mockResolvedValueOnce(undefined) // updatePlanQuery
        .mockResolvedValueOnce(undefined) // insertPlanQuery
        .mockResolvedValueOnce(undefined); // insertBillingQuery
      mockWithTransaction.mockImplementation((callback) => callback(mockClient as PoolClient));
      (stripe.paymentMethods.attach as jest.Mock).mockResolvedValueOnce({});
      (stripe.paymentIntents.create as jest.Mock).mockResolvedValueOnce(mockStripePaymentIntent);
      await expect(subscribe(MOCK_USER_ID, MOCK_SUBSCRIPTION_REQUEST)).resolves.not.toThrow();
    });

    it('should update users stripe customer id', async () => {
      const mockClient = createMockClient();
      // pool.query: calculatePrice billing count, user lookup (no stripe_customer_id), update stripe_customer_id
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
        .mockResolvedValueOnce({ rows: [{ ...MOCK_USER, stripe_customer_id: null }] })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined) // updatePlanQuery
        .mockResolvedValueOnce(undefined) // insertPlanQuery
        .mockResolvedValueOnce(undefined); // insertBillingQuery
      mockWithTransaction.mockImplementation((callback) => callback(mockClient as PoolClient));
      (stripe.customers.create as jest.Mock).mockResolvedValueOnce(mockStripCustomer);
      (stripe.paymentMethods.attach as jest.Mock).mockResolvedValueOnce({});
      (stripe.paymentIntents.create as jest.Mock).mockResolvedValueOnce(mockStripePaymentIntent);
      await expect(subscribe(MOCK_USER_ID, MOCK_SUBSCRIPTION_REQUEST)).resolves.not.toThrow();
    });

    it('throw StripePaymentFailed error if stripe paymentIntent failed', async () => {
      const mockClient = createMockClient();
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
        .mockResolvedValueOnce({ rows: [{ ...MOCK_USER, stripe_customer_id: null }] })
        .mockResolvedValueOnce(undefined);
      mockWithTransaction.mockImplementation((callback) => callback(mockClient as PoolClient));
      (stripe.customers.create as jest.Mock).mockResolvedValueOnce(mockStripCustomer);
      (stripe.paymentMethods.attach as jest.Mock).mockResolvedValueOnce({});
      (stripe.paymentIntents.create as jest.Mock).mockResolvedValueOnce({
        ...mockStripePaymentIntent,
        status: 'canceled',
      });
      await expect(subscribe(MOCK_USER_ID, MOCK_SUBSCRIPTION_REQUEST)).rejects.toThrow(
        StripePaymentFailed,
      );
    });
  }),
);
