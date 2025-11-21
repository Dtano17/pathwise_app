import { db } from '../storage.js';
import { userCredits, creditTransactions, users } from '../../shared/schema.js';
import { eq, desc, and, gte, sql } from 'drizzle-orm';

/**
 * Credit Service - Manages the share-to-earn rewards system
 *
 * Credit Economy Rules:
 * - Base: 5 free AI plans/month for non-participants
 * - Earn: +3 for publishing, +5 for adoption, +10 for completion, +15 for 100+ shares
 * - Spend: 1 credit = 1 additional AI plan creation
 * - Paid tier: Unlimited (bypasses credit system)
 */

export interface CreditBalance {
  userId: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  lastReset: Date;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: string;
  activityId?: string | null;
  description?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
}

export class CreditService {
  /**
   * Get or create user credit balance
   */
  static async getBalance(userId: string): Promise<CreditBalance> {
    let [credit] = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .limit(1);

    if (!credit) {
      // Create initial balance
      [credit] = await db
        .insert(userCredits)
        .values({
          userId,
          balance: 0,
          lifetimeEarned: 0,
          lifetimeSpent: 0,
        })
        .returning();
    }

    return {
      userId: credit.userId,
      balance: credit.balance,
      lifetimeEarned: credit.lifetimeEarned,
      lifetimeSpent: credit.lifetimeSpent,
      lastReset: credit.lastReset || new Date(),
    };
  }

  /**
   * Award credits for publishing a plan to Community Discovery
   */
  static async awardPublishCredits(userId: string, activityId: string): Promise<number> {
    const amount = 3;
    await this.addCredits(userId, amount, 'earn_publish', activityId,
      'Published plan to Community Discovery');
    return amount;
  }

  /**
   * Award credits when someone adopts/copies a user's plan
   */
  static async awardAdoptionCredits(
    creatorUserId: string,
    activityId: string,
    adopterUserId: string
  ): Promise<number> {
    const amount = 5;
    await this.addCredits(
      creatorUserId,
      amount,
      'earn_adoption',
      activityId,
      'Someone adopted your plan',
      { adopterUserId }
    );
    return amount;
  }

  /**
   * Award credits when someone completes an adopted plan
   */
  static async awardCompletionCredits(
    creatorUserId: string,
    activityId: string,
    completerUserId: string
  ): Promise<number> {
    const amount = 10;
    await this.addCredits(
      creatorUserId,
      amount,
      'earn_completion',
      activityId,
      'Someone completed your adopted plan',
      { completerUserId }
    );
    return amount;
  }

  /**
   * Award credits for share milestones (100, 500, 1000 shares)
   */
  static async awardShareMilestoneCredits(
    userId: string,
    activityId: string,
    shareCount: number
  ): Promise<number> {
    let amount = 0;
    let milestone = '';

    if (shareCount === 100) {
      amount = 15;
      milestone = '100 shares';
    } else if (shareCount === 500) {
      amount = 50;
      milestone = '500 shares';
    } else if (shareCount === 1000) {
      amount = 100;
      milestone = '1000 shares';
    } else {
      return 0; // Not a milestone
    }

    await this.addCredits(
      userId,
      amount,
      'earn_shares',
      activityId,
      `Milestone reached: ${milestone}`,
      { shareCount }
    );
    return amount;
  }

  /**
   * Deduct credits when user creates an additional AI plan
   */
  static async spendPlanCredit(userId: string, activityId?: string): Promise<boolean> {
    const credit = await this.getBalance(userId);

    if (credit.balance < 1) {
      return false; // Insufficient credits
    }

    await this.deductCredits(userId, 1, 'spend_plan', activityId,
      'Created additional AI plan');
    return true;
  }

  /**
   * Award bonus credits (admin action or promotion)
   */
  static async awardBonusCredits(
    userId: string,
    amount: number,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.addCredits(userId, amount, 'bonus', undefined, description, metadata);
  }

  /**
   * Add credits to user balance
   */
  private static async addCredits(
    userId: string,
    amount: number,
    type: string,
    activityId?: string,
    description?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await db.transaction(async (tx) => {
      // Update balance
      await tx
        .update(userCredits)
        .set({
          balance: sql`${userCredits.balance} + ${amount}`,
          lifetimeEarned: sql`${userCredits.lifetimeEarned} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(userCredits.userId, userId));

      // Record transaction
      await tx.insert(creditTransactions).values({
        userId,
        amount,
        type,
        activityId: activityId || null,
        description: description || null,
        metadata: metadata || null,
      });
    });
  }

  /**
   * Deduct credits from user balance
   */
  private static async deductCredits(
    userId: string,
    amount: number,
    type: string,
    activityId?: string,
    description?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await db.transaction(async (tx) => {
      // Update balance
      await tx
        .update(userCredits)
        .set({
          balance: sql`${userCredits.balance} - ${amount}`,
          lifetimeSpent: sql`${userCredits.lifetimeSpent} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(userCredits.userId, userId));

      // Record transaction (negative amount for spending)
      await tx.insert(creditTransactions).values({
        userId,
        amount: -amount,
        type,
        activityId: activityId || null,
        description: description || null,
        metadata: metadata || null,
      });
    });
  }

  /**
   * Get user's credit transaction history
   */
  static async getTransactionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<CreditTransaction[]> {
    const transactions = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    return transactions.map(tx => ({
      id: tx.id,
      userId: tx.userId,
      amount: tx.amount,
      type: tx.type,
      activityId: tx.activityId,
      description: tx.description,
      metadata: tx.metadata,
      createdAt: tx.createdAt || new Date(),
    }));
  }

  /**
   * Get leaderboard of top earners (for gamification)
   */
  static async getLeaderboard(limit: number = 10): Promise<Array<{
    userId: string;
    username: string;
    lifetimeEarned: number;
    balance: number;
  }>> {
    const leaderboard = await db
      .select({
        userId: userCredits.userId,
        username: users.username,
        lifetimeEarned: userCredits.lifetimeEarned,
        balance: userCredits.balance,
      })
      .from(userCredits)
      .leftJoin(users, eq(userCredits.userId, users.id))
      .orderBy(desc(userCredits.lifetimeEarned))
      .limit(limit);

    return leaderboard.map(entry => ({
      userId: entry.userId,
      username: entry.username || 'Anonymous',
      lifetimeEarned: entry.lifetimeEarned,
      balance: entry.balance,
    }));
  }

  /**
   * Get user's badge level based on lifetime earned credits
   */
  static async getBadgeLevel(userId: string): Promise<{
    level: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';
    nextMilestone: number;
    progress: number;
  }> {
    const credit = await this.getBalance(userId);
    const earned = credit.lifetimeEarned;

    let level: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';
    let nextMilestone: number;
    let progress: number;

    if (earned >= 1000) {
      level = 'platinum';
      nextMilestone = 0;
      progress = 100;
    } else if (earned >= 500) {
      level = 'gold';
      nextMilestone = 1000;
      progress = ((earned - 500) / 500) * 100;
    } else if (earned >= 100) {
      level = 'silver';
      nextMilestone = 500;
      progress = ((earned - 100) / 400) * 100;
    } else if (earned >= 25) {
      level = 'bronze';
      nextMilestone = 100;
      progress = ((earned - 25) / 75) * 100;
    } else {
      level = 'none';
      nextMilestone = 25;
      progress = (earned / 25) * 100;
    }

    return { level, nextMilestone, progress: Math.round(progress) };
  }

  /**
   * Check if user can create an AI plan (considering credits and subscription)
   */
  static async canCreatePlan(
    userId: string,
    subscriptionTier: string,
    currentMonthPlans: number,
    freePlanLimit: number = 5
  ): Promise<{
    allowed: boolean;
    reason?: string;
    creditsAvailable?: number;
  }> {
    // Paid tier bypasses everything
    if (subscriptionTier === 'pro' || subscriptionTier === 'family') {
      return { allowed: true };
    }

    // Check if within free plan limit
    if (currentMonthPlans < freePlanLimit) {
      return { allowed: true };
    }

    // Check if user has credits
    const credit = await this.getBalance(userId);
    if (credit.balance >= 1) {
      return {
        allowed: true,
        creditsAvailable: credit.balance
      };
    }

    // No credits, cannot create
    return {
      allowed: false,
      reason: `You've reached your ${freePlanLimit} free plans this month. Share plans to earn credits or upgrade to Pro for unlimited plans.`,
      creditsAvailable: 0,
    };
  }
}
