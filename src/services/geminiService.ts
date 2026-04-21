import { GoogleGenAI } from "@google/genai";

export interface FoodAnalysisResult {
  quality_label: string;
  freshness: string;
  quality_score: number;
  safe: boolean;
}

/**
 * @deprecated AI feature has been removed. This returns a mock successful result.
 */
export async function analyzeFoodImage(base64Image: string): Promise<FoodAnalysisResult> {
  // Mocking the result to bypass AI entirely
  return {
    quality_label: "Good",
    freshness: "Fresh",
    quality_score: 100,
    safe: true
  };
}
