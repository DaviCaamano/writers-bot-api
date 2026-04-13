import Stripe from 'stripe';

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

const stripe = new Stripe(stripeKey);

export default stripe;
