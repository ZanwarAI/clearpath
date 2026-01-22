import { db } from "./db";
import { historicalPAs } from "./schema";
import { eq, and, sql } from "drizzle-orm";

export interface RiskScoreResult {
  score: number; // 0-100
  confidenceLow: number;
  confidenceHigh: number;
  positiveFactors: string[];
  negativeFactors: string[];
  improvementSuggestions: string[];
  historicalApprovalRate: number;
  estimatedProcessingDays: number;
}

interface RiskInput {
  diagnosisCode: string;
  treatmentCode: string;
  insuranceProvider: string;
  patientAge?: number;
  hasCompleteDocs: boolean;
  hasPriorTreatment: boolean;
  urgencyLevel?: "routine" | "urgent" | "emergent";
  diagnosisCategory?: string;
  treatmentCategory?: string;
}

// Diagnosis category mapping
const diagnosisCategoryMap: Record<string, string> = {
  "C": "oncology", // Cancer codes start with C
  "M0": "rheumatology",
  "M05": "rheumatology",
  "M06": "rheumatology",
  "L40": "dermatology",
  "K50": "gastroenterology",
  "K51": "gastroenterology",
  "I": "cardiology",
  "E1": "endocrinology",
  "G": "neurology",
  "M54": "orthopedic",
  "M17": "orthopedic",
  "M75": "orthopedic",
  "J": "pulmonology",
  "N18": "nephrology",
};

// Treatment category mapping
const treatmentCategoryMap: Record<string, { category: string; cost: number }> = {
  "J9271": { category: "medication", cost: 15000 },
  "J9035": { category: "medication", cost: 8000 },
  "J9305": { category: "medication", cost: 5000 },
  "J0135": { category: "medication", cost: 6500 },
  "J1745": { category: "medication", cost: 4500 },
  "J2350": { category: "medication", cost: 32000 },
  "J0585": { category: "medication", cost: 1200 },
  "J1300": { category: "medication", cost: 45000 },
  "J2796": { category: "medication", cost: 8500 },
  "70553": { category: "imaging", cost: 2500 },
  "70552": { category: "imaging", cost: 1800 },
  "74177": { category: "imaging", cost: 1500 },
  "78815": { category: "imaging", cost: 5500 },
  "93458": { category: "procedure", cost: 15000 },
  "27447": { category: "procedure", cost: 35000 },
  "29881": { category: "procedure", cost: 8000 },
  "43239": { category: "procedure", cost: 3500 },
  "97110": { category: "therapy", cost: 150 },
  "97140": { category: "therapy", cost: 120 },
  "90837": { category: "therapy", cost: 200 },
};

function getDiagnosisCategory(code: string): string {
  for (const [prefix, category] of Object.entries(diagnosisCategoryMap)) {
    if (code.startsWith(prefix)) {
      return category;
    }
  }
  return "other";
}

function getTreatmentInfo(code: string): { category: string; cost: number } {
  return treatmentCategoryMap[code] || { category: "other", cost: 1000 };
}

export function calculateRiskScore(input: RiskInput): RiskScoreResult {
  const positiveFactors: string[] = [];
  const negativeFactors: string[] = [];
  const improvementSuggestions: string[] = [];

  // Get diagnosis and treatment categories
  const diagCategory = input.diagnosisCategory || getDiagnosisCategory(input.diagnosisCode);
  const treatmentInfo = getTreatmentInfo(input.treatmentCode);
  const treatmentCategory = input.treatmentCategory || treatmentInfo.category;
  const treatmentCost = treatmentInfo.cost;

  // Query historical data for this combination
  const historicalData = db
    .select({
      totalCount: sql<number>`count(*)`,
      approvedCount: sql<number>`sum(case when outcome = 'approved' then 1 else 0 end)`,
      avgProcessingDays: sql<number>`avg(processing_days)`,
    })
    .from(historicalPAs)
    .where(
      and(
        eq(historicalPAs.insuranceProvider, input.insuranceProvider),
        eq(historicalPAs.treatmentCode, input.treatmentCode)
      )
    )
    .get();

  // Broader historical query for insurance provider
  const insurerData = db
    .select({
      totalCount: sql<number>`count(*)`,
      approvedCount: sql<number>`sum(case when outcome = 'approved' then 1 else 0 end)`,
      avgProcessingDays: sql<number>`avg(processing_days)`,
    })
    .from(historicalPAs)
    .where(eq(historicalPAs.insuranceProvider, input.insuranceProvider))
    .get();

  // Category-level data
  const categoryData = db
    .select({
      totalCount: sql<number>`count(*)`,
      approvedCount: sql<number>`sum(case when outcome = 'approved' then 1 else 0 end)`,
    })
    .from(historicalPAs)
    .where(
      and(
        eq(historicalPAs.insuranceProvider, input.insuranceProvider),
        eq(historicalPAs.diagnosisCategory, diagCategory)
      )
    )
    .get();

  // Calculate base approval rate from historical data
  let baseRate = 0.65; // Default
  let sampleSize = 0;
  
  if (historicalData && historicalData.totalCount > 0) {
    baseRate = historicalData.approvedCount / historicalData.totalCount;
    sampleSize = historicalData.totalCount;
  } else if (categoryData && categoryData.totalCount > 0) {
    baseRate = categoryData.approvedCount / categoryData.totalCount;
    sampleSize = categoryData.totalCount;
  } else if (insurerData && insurerData.totalCount > 0) {
    baseRate = insurerData.approvedCount / insurerData.totalCount;
    sampleSize = insurerData.totalCount;
  }

  let score = baseRate * 100;

  // Factor 1: Diagnosis category adjustments
  if (diagCategory === "oncology") {
    score += 8;
    positiveFactors.push("Oncology diagnosis - typically prioritized for approval");
  } else if (diagCategory === "cardiology") {
    score += 5;
    positiveFactors.push("Cardiology diagnosis - often medically urgent");
  } else if (diagCategory === "orthopedic" && treatmentCategory === "therapy") {
    score -= 5;
    negativeFactors.push("Conservative treatment often required before approval");
    improvementSuggestions.push("Document completion of home exercise program if applicable");
  }

  // Factor 2: Treatment cost
  if (treatmentCost > 30000) {
    score -= 10;
    negativeFactors.push("Very high-cost treatment - intensive review likely");
    improvementSuggestions.push("Include detailed cost-benefit analysis");
    improvementSuggestions.push("Reference peer-reviewed studies on treatment efficacy");
  } else if (treatmentCost > 10000) {
    score -= 5;
    negativeFactors.push("High-cost specialty treatment");
    improvementSuggestions.push("Include letter of medical necessity");
  } else if (treatmentCost < 500) {
    score += 5;
    positiveFactors.push("Low-cost intervention - generally favorable");
  }

  // Factor 3: Documentation completeness
  if (input.hasCompleteDocs) {
    score += 12;
    positiveFactors.push("Complete documentation submitted");
  } else {
    score -= 15;
    negativeFactors.push("Incomplete documentation");
    improvementSuggestions.push("Ensure all supporting documents are attached");
    improvementSuggestions.push("Include recent lab results and imaging reports");
  }

  // Factor 4: Prior treatment/step therapy
  if (input.hasPriorTreatment) {
    score += 8;
    positiveFactors.push("Prior treatment attempts documented");
  } else {
    if (treatmentCategory === "medication" && treatmentCost > 5000) {
      score -= 10;
      negativeFactors.push("No prior treatment documented - step therapy may be required");
      improvementSuggestions.push("Document failure of first-line treatments");
    } else if (treatmentCategory === "therapy") {
      score -= 5;
      negativeFactors.push("Conservative treatment history not documented");
      improvementSuggestions.push("Document previous conservative treatment attempts");
    }
  }

  // Factor 5: Urgency level
  if (input.urgencyLevel === "emergent") {
    score += 10;
    positiveFactors.push("Emergent request - expedited review");
  } else if (input.urgencyLevel === "urgent") {
    score += 5;
    positiveFactors.push("Urgent clinical need documented");
  }

  // Factor 6: Patient age considerations
  if (input.patientAge) {
    if (input.patientAge >= 65 && diagCategory === "oncology") {
      score += 3;
      positiveFactors.push("Medicare-eligible age with oncology diagnosis");
    } else if (input.patientAge < 18) {
      score += 5;
      positiveFactors.push("Pediatric patient - often prioritized");
    }
  }

  // Clamp score to valid range
  score = Math.max(0, Math.min(100, score));

  // Calculate confidence interval based on sample size
  const confidenceWidth = sampleSize > 100 ? 6 : sampleSize > 50 ? 8 : sampleSize > 20 ? 10 : 12;
  const confidenceLow = Math.max(0, Math.round(score - confidenceWidth));
  const confidenceHigh = Math.min(100, Math.round(score + confidenceWidth));

  // Calculate estimated processing days
  let estimatedDays = insurerData?.avgProcessingDays || 12;
  if (input.urgencyLevel === "urgent") estimatedDays = Math.max(1, estimatedDays - 4);
  if (input.urgencyLevel === "emergent") estimatedDays = Math.max(1, estimatedDays - 7);
  if (!input.hasCompleteDocs) estimatedDays += 5;

  return {
    score: Math.round(score),
    confidenceLow,
    confidenceHigh,
    positiveFactors,
    negativeFactors,
    improvementSuggestions,
    historicalApprovalRate: baseRate,
    estimatedProcessingDays: Math.round(estimatedDays),
  };
}

// Get historical comparison data for display
export function getHistoricalComparison(
  insuranceProvider: string,
  treatmentCode: string,
  diagnosisCode: string
) {
  const diagCategory = getDiagnosisCategory(diagnosisCode);
  
  // Same treatment + insurer
  const sameTreatment = db
    .select({
      approvalRate: sql<number>`round(avg(case when outcome = 'approved' then 100.0 else 0 end), 1)`,
      count: sql<number>`count(*)`,
    })
    .from(historicalPAs)
    .where(
      and(
        eq(historicalPAs.insuranceProvider, insuranceProvider),
        eq(historicalPAs.treatmentCode, treatmentCode)
      )
    )
    .get();

  // Same category + insurer
  const sameCategory = db
    .select({
      approvalRate: sql<number>`round(avg(case when outcome = 'approved' then 100.0 else 0 end), 1)`,
      count: sql<number>`count(*)`,
    })
    .from(historicalPAs)
    .where(
      and(
        eq(historicalPAs.insuranceProvider, insuranceProvider),
        eq(historicalPAs.diagnosisCategory, diagCategory)
      )
    )
    .get();

  // Overall insurer rate
  const overallInsurer = db
    .select({
      approvalRate: sql<number>`round(avg(case when outcome = 'approved' then 100.0 else 0 end), 1)`,
      count: sql<number>`count(*)`,
    })
    .from(historicalPAs)
    .where(eq(historicalPAs.insuranceProvider, insuranceProvider))
    .get();

  return {
    sameTreatment: {
      approvalRate: sameTreatment?.approvalRate || 0,
      sampleSize: sameTreatment?.count || 0,
    },
    sameCategory: {
      approvalRate: sameCategory?.approvalRate || 0,
      sampleSize: sameCategory?.count || 0,
      category: diagCategory,
    },
    overallInsurer: {
      approvalRate: overallInsurer?.approvalRate || 0,
      sampleSize: overallInsurer?.count || 0,
    },
  };
}

// Calculate estimated completion time based on historical data
export function getEstimatedCompletionTime(
  insuranceProvider: string,
  treatmentCode: string,
  urgencyLevel: "routine" | "urgent" | "emergent" = "routine"
): { days: number; range: { min: number; max: number } } {
  const data = db
    .select({
      avgDays: sql<number>`avg(processing_days)`,
      minDays: sql<number>`min(processing_days)`,
      maxDays: sql<number>`max(processing_days)`,
    })
    .from(historicalPAs)
    .where(
      and(
        eq(historicalPAs.insuranceProvider, insuranceProvider),
        eq(historicalPAs.urgencyLevel, urgencyLevel)
      )
    )
    .get();

  const baseDays = data?.avgDays || 12;
  const minDays = data?.minDays || 3;
  const maxDays = data?.maxDays || 21;

  return {
    days: Math.round(baseDays),
    range: {
      min: Math.max(1, minDays),
      max: maxDays,
    },
  };
}
