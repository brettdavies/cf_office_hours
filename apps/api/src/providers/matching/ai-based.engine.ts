/**
 * AI-Based Matching Engine V1
 *
 * Uses OpenAI to score mentor-mentee matches based on:
 * - Mentor bio vs Mentee's company description
 * - Evaluates conversation quality potential
 * - Evaluates mentor's ability to answer mentee's questions
 *
 * ARCHITECTURE:
 * - Extends BaseMatchingEngine for common infrastructure
 * - Writes pre-calculated scores to user_match_cache table
 * - Runs in background (event-driven or scheduled)
 * - Algorithm version: 'ai-based-v1'
 *
 * REQUIREMENTS:
 * - OPENAI_API_KEY environment variable must be set
 * - Mentor must have bio (user_profiles.bio)
 * - Mentee must have portfolio company with description
 *
 * SCORE RANGE:
 * - 0-100 (provided by AI)
 * - Returns 0 if either bio or company description is null
 */

// External dependencies
import type { SupabaseClient } from "@supabase/supabase-js";

// Internal modules
import type { MatchExplanation } from "./interface";
import { BaseMatchingEngine, type BaseUserData } from "./base.engine";

/**
 * User with profile and company data (enriched for AI matching)
 */
interface UserWithProfile extends BaseUserData {
  user_profiles: {
    bio: string | null;
    portfolio_company_id: string | null;
  };
  portfolio_company: {
    description: string | null;
  } | null;
}

/**
 * AI response structure from OpenAI
 */
interface AIMatchResponse {
  score: number;
  reasoning: string;
}

/**
 * AI-based matching engine implementation (Version 1)
 *
 * Uses OpenAI to evaluate mentor-mentee compatibility based on bios and company descriptions.
 *
 * @example
 * const engine = new AiBasedMatchingEngineV1(supabaseClient, openaiApiKey);
 * await engine.recalculateMatches('user-123'); // Recalculate for one user
 * await engine.recalculateAllMatches({ batchSize: 10 }); // Slower due to API calls
 */
export class AiBasedMatchingEngineV1
  extends BaseMatchingEngine<UserWithProfile> {
  protected readonly ALGORITHM_VERSION = "ai-based-v1";

  /**
   * Creates an AI-based matching engine instance
   *
   * @param db - Supabase client for database operations
   * @param openaiApiKey - OpenAI API key for AI scoring (required)
   * @throws {Error} If OpenAI API key is not provided
   *
   * @example
   * const engine = new AiBasedMatchingEngineV1(
   *   supabaseClient,
   *   process.env.OPENAI_API_KEY
   * );
   */
  constructor(
    db: SupabaseClient,
    private readonly openaiApiKey: string,
  ) {
    super(db);

    // Validate OpenAI API key
    if (!openaiApiKey || openaiApiKey.trim() === "") {
      throw new Error(
        "[MATCHING:AI] OPENAI_API_KEY is required for AI-based matching engine",
      );
    }
  }

  // ============================================================================
  // ABSTRACT METHOD IMPLEMENTATIONS (required by BaseMatchingEngine)
  // ============================================================================

  /**
   * Fetch user with profile and company data
   *
   * @param userId - User ID to fetch
   * @returns User with profile/company, or null if not found
   */
  protected async fetchUserWithTags(
    userId: string,
  ): Promise<UserWithProfile | null> {
    if (process.env.NODE_ENV === "development") {
      console.log(`[MATCHING:AI] Fetching user with profile`, { userId });
    }

    // Fetch user with profile
    const { data: user, error: userError } = await this.db
      .from("users")
      .select("*, user_profiles(*)")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      if (process.env.NODE_ENV === "development") {
        console.error(`[MATCHING:AI] Failed to fetch user`, {
          userId,
          error: userError,
        });
      }
      return null;
    }

    // Fetch portfolio company if mentee
    let portfolioCompany = null;
    if (user.role === "mentee" && user.user_profiles?.portfolio_company_id) {
      const { data: company } = await this.db
        .from("portfolio_companies")
        .select("description")
        .eq("id", user.user_profiles.portfolio_company_id)
        .single();

      portfolioCompany = company || null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active ?? true,
      last_activity_at: user.last_activity_at
        ? new Date(user.last_activity_at)
        : null,
      deleted_at: user.deleted_at ? new Date(user.deleted_at) : null,
      user_profiles: {
        bio: user.user_profiles?.bio || null,
        portfolio_company_id: user.user_profiles?.portfolio_company_id || null,
      },
      portfolio_company: portfolioCompany,
    };
  }

  /**
   * Calculate match score using OpenAI (async version)
   *
   * @param user1 - First user (the one requesting matches)
   * @param user2 - Second user (potential match)
   * @returns Match score (0-100 from AI, or 0 if data missing)
   */
  private async calculateScoreAsync(
    user1: UserWithProfile,
    user2: UserWithProfile,
  ): Promise<number> {
    // Determine mentor and mentee
    const mentor = user1.role === "mentor" ? user1 : user2;
    const mentee = user1.role === "mentee" ? user1 : user2;

    // Check required data
    const mentorBio = mentor.user_profiles.bio;
    const companyDescription = mentee.portfolio_company?.description;

    if (!mentorBio || !companyDescription) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[MATCHING:AI] Missing data for AI scoring`, {
          user1Id: user1.id,
          user2Id: user2.id,
          hasMentorBio: !!mentorBio,
          hasCompanyDescription: !!companyDescription,
        });
      }
      return 0;
    }

    // Call OpenAI API
    try {
      const score = await this.callOpenAI(mentorBio, companyDescription);
      return score;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error(`[MATCHING:AI] OpenAI call failed`, { error });
      }
      return 0;
    }
  }

  /**
   * Calculate match score (synchronous stub required by base class)
   *
   * NOTE: This method is not used - we override recalculateMatches to handle async scoring
   *
   * @param _user1 - First user (unused)
   * @param _user2 - Second user (unused)
   * @returns Always returns 0 (not used)
   */
  protected calculateScore(
    _user1: UserWithProfile,
    _user2: UserWithProfile,
  ): number {
    // Stub - actual scoring happens in calculateScoreAsync via recalculateMatches override
    return 0;
  }

  /**
   * Recalculate matches for a user using async AI scoring
   *
   * Overrides base implementation to handle async OpenAI API calls.
   * Processes potential matches in chunks with delays to respect API rate limits.
   *
   * @param userId - User ID to recalculate matches for
   * @param options - Optional configuration
   * @param options.chunkSize - Number of matches to process per chunk (default: 5)
   * @param options.chunkDelay - Delay in ms between chunks (default: 500ms)
   *
   * @example
   * // Recalculate with default settings
   * await engine.recalculateMatches('user-123');
   *
   * @example
   * // Recalculate with custom chunk size (slower for API rate limits)
   * await engine.recalculateMatches('user-123', { chunkSize: 3, chunkDelay: 1000 });
   */
  async recalculateMatches(
    userId: string,
    options?: { chunkSize?: number; chunkDelay?: number },
  ): Promise<void> {
    // Use smaller defaults for API rate limiting (5 per chunk, 500ms delay)
    const chunkSize = options?.chunkSize ?? 5;
    const chunkDelay = options?.chunkDelay ?? 500;

    if (process.env.NODE_ENV === "development") {
      console.log("[MATCHING:AI] recalculateMatches", {
        userId,
        algorithmVersion: this.ALGORITHM_VERSION,
      });
    }

    // Fetch user with required data
    const user = await this.fetchUserWithTags(userId);
    if (!user) {
      if (process.env.NODE_ENV === "development") {
        console.error("[MATCHING:AI] User not found or inactive", { userId });
      }
      return;
    }

    // Fetch potential matches
    const potentialMatches = await this.fetchPotentialMatches(
      userId,
      user.role,
    );

    if (process.env.NODE_ENV === "development") {
      console.log("[MATCHING:AI] Fetched potential matches", {
        userId,
        potentialMatchCount: potentialMatches.length,
      });
    }

    // Process matches in chunks
    const chunks = this.chunkArray(potentialMatches, chunkSize);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      if (process.env.NODE_ENV === "development") {
        console.log("[MATCHING:AI] Processing chunk", {
          userId,
          chunkNum: i + 1,
          totalChunks: chunks.length,
          chunkSize: chunk.length,
        });
      }

      // Calculate scores for this chunk (ASYNC)
      const cacheEntries = await Promise.all(
        chunk.map(async (matchUser) => {
          const score = await this.calculateScoreAsync(user, matchUser);
          const explanation = this.generateExplanation(user, matchUser, score);

          return {
            user_id: userId,
            recommended_user_id: matchUser.id,
            match_score: score,
            match_explanation: explanation,
            algorithm_version: this.ALGORITHM_VERSION,
            calculated_at: new Date(),
          };
        }),
      );

      // Write chunk to cache
      await this.writeToCacheAtomic(userId, cacheEntries);

      // Delay between chunks (except last chunk)
      if (i < chunks.length - 1 && chunkDelay > 0) {
        await this.delay(chunkDelay);
      }
    }
  }

  /**
   * Generate match explanation
   *
   * @param user1 - First user
   * @param user2 - Second user
   * @param score - Calculated match score
   * @returns Match explanation object
   */
  protected generateExplanation(
    user1: UserWithProfile,
    user2: UserWithProfile,
    score: number,
  ): MatchExplanation {
    const strength = score >= 70
      ? "Excellent"
      : score >= 50
      ? "Good"
      : score >= 30
      ? "Fair"
      : "Weak";

    // Determine mentor and mentee
    const mentor = user1.role === "mentor" ? user1 : user2;
    const mentee = user1.role === "mentee" ? user1 : user2;

    const mentorBio = mentor.user_profiles.bio;
    const companyDescription = mentee.portfolio_company?.description;

    if (!mentorBio || !companyDescription) {
      return {
        tagOverlap: [], // No tags in AI-based matching
        summary: "AI matching unavailable (missing bio or company description)",
      };
    }

    return {
      tagOverlap: [], // AI-based matching doesn't use tags
      summary:
        `${strength} AI match: Mentor expertise aligns with company needs`,
    };
  }

  // ============================================================================
  // AI INTEGRATION (OpenAI API)
  // ============================================================================

  /**
   * Call OpenAI API to score mentor-mentee match
   *
   * Makes a POST request to OpenAI Chat Completions API (gpt-5 model).
   * Prompt asks AI to score the match 0-100 based on conversation quality,
   * mentor expertise alignment, and ability to answer questions.
   *
   * **Cost Estimate:**
   * - Model: GPT-5 ($0.15/1M input tokens, $0.60/1M output tokens)
   * - Input: ~200-500 tokens per match (bio + company + prompt)
   * - Output: ~50 tokens (JSON response)
   * - Cost per match: ~$0.0001-0.0003
   * - 10,000 matches ≈ $1-3 total
   *
   * @param mentorBio - Mentor's bio text describing expertise
   * @param companyDescription - Portfolio company description text
   * @returns Match score (0-100), or 0 on error
   *
   * @example
   * const score = await this.callOpenAI(
   *   "Expert in DevOps and cloud infrastructure",
   *   "Healthcare analytics startup using AWS and Kubernetes"
   * );
   * // score: 85 (high alignment)
   */
  private async callOpenAI(
    mentorBio: string,
    companyDescription: string,
  ): Promise<number> {
    const prompt =
      `You are a matching expert for a mentorship platform. Evaluate how well a mentor and mentee would work together.

Mentor's Bio:
${mentorBio}

Mentee's Company Description:
${companyDescription}

Score this match from 0-100 based on:
1. How likely these individuals are to have a great conversation
2. The mentor's ability to lead the mentee and answer their questions
3. Alignment of the mentor's expertise with the company's needs

Respond ONLY with a JSON object in this exact format:
{"score": <number 0-100>, "reasoning": "<brief explanation>"}`;

    try {
      // Create abort controller for timeout (10 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.openaiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-5",
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.3, // Lower temperature for more consistent scoring
            max_tokens: 200,
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No content in OpenAI response");
      }

      const parsed: AIMatchResponse = JSON.parse(content);
      const score = Math.max(0, Math.min(100, parsed.score)); // Clamp to 0-100

      if (process.env.NODE_ENV === "development") {
        console.log(`[MATCHING:AI] AI score received`, {
          score,
          reasoning: parsed.reasoning,
        });
      }

      return score;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        const errorMessage =
          error instanceof Error && error.name === "AbortError"
            ? "OpenAI API timeout (10s)"
            : "OpenAI call failed";
        console.error(`[MATCHING:AI] ${errorMessage}`, { error });
      }
      return 0;
    }
  }
}
