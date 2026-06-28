import { describe, expect, it } from "vitest";
import { AiInsightsSchema, MatchExplanationSchema } from "./matching";

describe("MatchExplanationSchema", () => {
  it("accepts a tag-based explanation without aiInsights", () => {
    const result = MatchExplanationSchema.safeParse({
      tagOverlap: [{ category: "industry", tag: "fintech" }],
      stageMatch: false,
      reputationCompatible: false,
      summary: "Weak match: 1 shared tags (fintech)",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.aiInsights).toBeUndefined();
      expect(result.data.tagOverlap).toHaveLength(1);
    }
  });

  it("accepts an ai-based explanation with aiInsights populated", () => {
    const result = MatchExplanationSchema.safeParse({
      tagOverlap: [],
      stageMatch: false,
      reputationCompatible: false,
      summary: "High potential",
      aiInsights: {
        reasoning: "Strong overlap in expertise",
        confidence: "High potential for productive mentoring relationship",
        mentorSummary: "Experienced professional",
        companyDescription: "Apex Dynamics focuses on innovation",
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.aiInsights?.confidence).toContain("High potential");
    }
  });

  it("rejects a non-string aiInsights field", () => {
    const result = MatchExplanationSchema.safeParse({
      tagOverlap: [],
      stageMatch: false,
      reputationCompatible: false,
      summary: "",
      aiInsights: { reasoning: 42 },
    });

    expect(result.success).toBe(false);
  });

  it("requires the existing four fields (aiInsights does not relax them)", () => {
    const result = MatchExplanationSchema.safeParse({
      aiInsights: { reasoning: "only ai content" },
    });

    expect(result.success).toBe(false);
  });
});

describe("AiInsightsSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(AiInsightsSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a partial subset of narrative fields", () => {
    const result = AiInsightsSchema.safeParse({ reasoning: "partial" });
    expect(result.success).toBe(true);
  });
});
