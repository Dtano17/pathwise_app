import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { storage } from './storage';

// Initialize Stripe only if keys are configured
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-09-30.clover'
  });
}

/**
 * Stripe webhook handler - must receive RAW body buffer for signature verification
 * This handler is registered in server/index.ts with express.raw() middleware
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  if (!stripe) {
    return res.status(500).send('Stripe not configured');
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // req.body is a Buffer when using express.raw()
    event = stripe.webhooks.constructEvent(
      req.body,
      sig as string,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier;
        
        if (userId) {
          // CRITICAL: ALWAYS store Stripe IDs first, regardless of tier - this ensures future webhooks can find the user
          const updates: any = {};
          
          if (session.subscription) {
            updates.stripeSubscriptionId = session.subscription;
          }
          if (session.customer) {
            updates.stripeCustomerId = session.customer;
          }
          
          // Only set tier/status if we have tier metadata
          if (tier) {
            updates.subscriptionTier = tier;
            updates.subscriptionStatus = 'trialing';
            
            // Set trial end date (7 days from now)
            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + 7);
            updates.trialEndsAt = trialEnd;
            
            // Reset plan count
            updates.planCount = 0;
            const resetDate = new Date();
            resetDate.setMonth(resetDate.getMonth() + 1);
            updates.planCountResetDate = resetDate;
          }
          
          // Atomic update of all fields
          await storage.updateUser(userId, updates);
          
          console.log('[WEBHOOK] Checkout completed - stored Stripe IDs:', { 
            userId, 
            subscriptionId: session.subscription, 
            customerId: session.customer,
            tier 
          });
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const subscription = event.data.object as any;
        let userId = subscription.metadata?.userId;
        
        // FALLBACK: If metadata.userId is missing, look up user by subscription ID or customer ID
        if (!userId && subscription.id) {
          try {
            let user = await storage.getUserByStripeSubscriptionId(subscription.id);
            if (user) {
              userId = user.id;
              console.log('[WEBHOOK] Found user by subscription ID:', { subscriptionId: subscription.id, userId });
            } else if (subscription.customer) {
              // Try looking up by customer ID as a second fallback
              user = await storage.getUserByStripeCustomerId(subscription.customer);
              if (user) {
                userId = user.id;
                console.log('[WEBHOOK] Found user by customer ID:', { customerId: subscription.customer, userId });
              } else {
                console.warn('[WEBHOOK] No user found for subscription:', { subscriptionId: subscription.id, customerId: subscription.customer });
              }
            }
          } catch (err) {
            console.error('[WEBHOOK] Error looking up user by Stripe IDs:', err);
          }
        }
        
        if (userId) {
          const previousStatus = event.type === 'customer.subscription.updated' 
            ? (event.data as any).previous_attributes?.status 
            : null;
          
          // Build atomic update object
          const updates: any = {
            subscriptionStatus: subscription.status
          };
          
          // ALWAYS store/update Stripe IDs for future webhook lookups
          if (subscription.id) {
            updates.stripeSubscriptionId = subscription.id;
          }
          if (subscription.customer) {
            updates.stripeCustomerId = subscription.customer;
          }
          
          // Derive tier from Stripe price ID if metadata tier is missing
          let tier = subscription.metadata?.tier;
          if (!tier && subscription.items?.data?.[0]?.price?.id) {
            const priceId = subscription.items.data[0].price.id;
            const proMonthly = process.env.VITE_STRIPE_PRICE_PRO_MONTHLY;
            const proAnnual = process.env.VITE_STRIPE_PRICE_PRO_ANNUAL;
            const familyMonthly = process.env.VITE_STRIPE_PRICE_FAMILY_MONTHLY;
            const familyAnnual = process.env.VITE_STRIPE_PRICE_FAMILY_ANNUAL;
            
            if (priceId === proMonthly || priceId === proAnnual) {
              tier = 'pro';
            } else if (priceId === familyMonthly || priceId === familyAnnual) {
              tier = 'family';
            }
            
            console.log('[WEBHOOK] Derived tier from price ID:', { priceId, tier });
          }
          
          // Update subscription tier if we have it
          if (tier) {
            updates.subscriptionTier = tier;
            console.log('[WEBHOOK] Updated subscription tier:', { userId, tier });
          }
          
          if (subscription.status === 'active') {
            updates.trialEndsAt = null;
          }
          
          // Atomic update of all fields
          await storage.updateUser(userId, updates);
          console.log('[WEBHOOK] Subscription updated:', { userId, updates });
          
          // Send Pro welcome email when subscription FIRST becomes active (after update)
          if (subscription.status === 'active') {
            const isNewlyActive = event.type === 'customer.subscription.created' || 
                                (event.type === 'customer.subscription.updated' && previousStatus !== 'active');
            
            if (isNewlyActive && tier) {
              try {
                const user = await storage.getUser(userId);
                if (user && user.email && (user.subscriptionTier === 'pro' || user.subscriptionTier === 'family')) {
                  const { sendProWelcomeEmail } = await import('./emailService.js');
                  await sendProWelcomeEmail(
                    user.email,
                    user.firstName || user.username || 'there'
                  );
                  console.log('[WEBHOOK] Pro welcome email sent to:', user.email);
                }
              } catch (emailError) {
                console.error('[WEBHOOK] Failed to send Pro welcome email:', emailError);
                // Don't fail the webhook - email is non-critical
              }
            }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        let userId = subscription.metadata?.userId;
        
        // FALLBACK: If metadata.userId is missing, look up user by subscription ID or customer ID
        if (!userId && subscription.id) {
          try {
            let user = await storage.getUserByStripeSubscriptionId(subscription.id);
            if (user) {
              userId = user.id;
              console.log('[WEBHOOK] Found user by subscription ID for deletion:', { subscriptionId: subscription.id, userId });
            } else if (subscription.customer) {
              user = await storage.getUserByStripeCustomerId(subscription.customer);
              if (user) {
                userId = user.id;
                console.log('[WEBHOOK] Found user by customer ID for deletion:', { customerId: subscription.customer, userId });
              }
            }
          } catch (err) {
            console.error('[WEBHOOK] Error looking up user by Stripe IDs:', err);
          }
        }
        
        if (userId) {
          // Atomic update when subscription is deleted
          await storage.updateUser(userId, {
            subscriptionTier: 'free',
            subscriptionStatus: 'canceled',
            subscriptionEndsAt: new Date(),
            planCount: 0
          });
          console.log('[WEBHOOK] Subscription deleted - user downgraded to free:', userId);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription;
        const billingReason = invoice.billing_reason; // 'subscription_create' or 'subscription_cycle'
        
        console.log('[WEBHOOK] invoice.payment_succeeded:', {
          subscriptionId,
          billingReason,
          amount: invoice.amount_paid,
          currency: invoice.currency
        });
        
        if (subscriptionId) {
          try {
            // Find user by subscription ID
            const users = await (storage as any).getAllUsers?.() || [];
            const user = users.find((u: any) => u.stripeSubscriptionId === subscriptionId);
            
            if (user) {
              // Update subscription status to active
              await storage.updateUserField(user.id, 'subscriptionStatus', 'active');
              
              // If this is a renewal (subscription_cycle), reset monthly plan count
              if (billingReason === 'subscription_cycle') {
                console.log('[WEBHOOK] Resetting plan count for renewal user:', user.id);
                await storage.updateUserField(user.id, 'planCount', 0);
                
                // Set next reset date to one month from now
                const nextResetDate = new Date();
                nextResetDate.setMonth(nextResetDate.getMonth() + 1);
                await storage.updateUserField(user.id, 'planCountResetDate', nextResetDate);
              }
              
              // Clear trial end date on first payment
              if (billingReason === 'subscription_create') {
                await storage.updateUserField(user.id, 'trialEndsAt', null);
              }
              
              console.log('[WEBHOOK] Successfully processed payment for user:', user.id);
            } else {
              console.warn('[WEBHOOK] No user found for subscription:', subscriptionId);
            }
          } catch (err) {
            console.error('[WEBHOOK] Error processing invoice.payment_succeeded:', err);
            // Don't throw - continue processing other events
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription;
        const reason = invoice.last_payment_error?.message || 'Unknown payment failure';
        
        console.log('[WEBHOOK] invoice.payment_failed:', {
          subscriptionId,
          reason,
          attemptsRemaining: invoice.attempt_count
        });
        
        if (subscriptionId) {
          try {
            // Find user by subscription ID
            const users = await (storage as any).getAllUsers?.() || [];
            const user = users.find((u: any) => u.stripeSubscriptionId === subscriptionId);
            
            if (user) {
              // Update subscription status to past_due
              await storage.updateUserField(user.id, 'subscriptionStatus', 'past_due');
              
              console.log('[WEBHOOK] Payment failed for user:', user.id, 'Reason:', reason);
              
              // In a full implementation, you would:
              // 1. Send email notification to user
              // 2. Store failure details for admin review
              // 3. Implement grace period logic (allow limited access while resolving)
              // 4. Trigger retries via Stripe's built-in retry logic
            } else {
              console.warn('[WEBHOOK] No user found for failed payment subscription:', subscriptionId);
            }
          } catch (err) {
            console.error('[WEBHOOK] Error processing invoice.payment_failed:', err);
            // Don't throw - continue processing other events
          }
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: error.message });
  }
}
