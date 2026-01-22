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
  const normalized = code.toUpperCase().trim();
  const mapped = treatmentCategoryMap[normalized];
  if (mapped) return mapped;

  if (/^J\d+/.test(normalized) || /^Q\d+/.test(normalized) || /^C\d+/.test(normalized)) {
    return { category: "medication", cost: 9000 };
  }

  if (/^\d{6,}$/.test(normalized)) {
    return { category: "medication", cost: 4500 };
  }

  if (/^97\d{3}$/.test(normalized)) {
    return { category: "therapy", cost: 200 };
  }

  if (/^(70|71|72|73|74|75|76|77|78|79)\d{3}$/.test(normalized)) {
    return { category: "imaging", cost: 2200 };
  }

  if (/^8\d{4}$/.test(normalized)) {
    return { category: "lab", cost: 250 };
  }

  if (/^\d{5}$/.test(normalized)) {
    return { category: "procedure", cost: 6000 };
  }

  return { category: "other", cost: 1500 };
}

function calculateSmoothedRate(
  approvedCount: number,
  totalCount: number,
  priorRate: number,
  priorWeight: number
): number {
  if (totalCount <= 0) return priorRate;
  return (approvedCount + priorRate * priorWeight) / (totalCount + priorWeight);
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

  const globalPriorRate = 0.7;

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

  const combinedCategoryData = db
    .select({
      totalCount: sql<number>`count(*)`,
      approvedCount: sql<number>`sum(case when outcome = 'approved' then 1 else 0 end)`,
    })
    .from(historicalPAs)
    .where(
      and(
        eq(historicalPAs.insuranceProvider, input.insuranceProvider),
        eq(historicalPAs.diagnosisCategory, diagCategory),
        eq(historicalPAs.treatmentCategory, treatmentCategory)
      )
    )
    .get();

  const diagnosisCategoryData = db
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

  const treatmentCategoryData = db
    .select({
      totalCount: sql<number>`count(*)`,
      approvedCount: sql<number>`sum(case when outcome = 'approved' then 1 else 0 end)`,
    })
    .from(historicalPAs)
    .where(
      and(
        eq(historicalPAs.insuranceProvider, input.insuranceProvider),
        eq(historicalPAs.treatmentCategory, treatmentCategory)
      )
    )
    .get();

  const insurerData = db
    .select({
      totalCount: sql<number>`count(*)`,
      approvedCount: sql<number>`sum(case when outcome = 'approved' then 1 else 0 end)`,
      avgProcessingDays: sql<number>`avg(processing_days)`,
    })
    .from(historicalPAs)
    .where(eq(historicalPAs.insuranceProvider, input.insuranceProvider))
    .get();

  const insurerRate = insurerData && insurerData.totalCount > 0
    ? insurerData.approvedCount / insurerData.totalCount
    : globalPriorRate;

  const smoothedTreatmentRate = historicalData && historicalData.totalCount > 0
    ? calculateSmoothedRate(
        historicalData.approvedCount,
        historicalData.totalCount,
        insurerRate,
        12
      )
    : null;

  const smoothedCombinedRate = combinedCategoryData && combinedCategoryData.totalCount > 0
    ? calculateSmoothedRate(
        combinedCategoryData.approvedCount,
        combinedCategoryData.totalCount,
        insurerRate,
        10
      )
    : null;

  const smoothedDiagnosisRate = diagnosisCategoryData && diagnosisCategoryData.totalCount > 0
    ? calculateSmoothedRate(
        diagnosisCategoryData.approvedCount,
        diagnosisCategoryData.totalCount,
        insurerRate,
        8
      )
    : null;

  const smoothedTreatmentCategoryRate = treatmentCategoryData && treatmentCategoryData.totalCount > 0
    ? calculateSmoothedRate(
        treatmentCategoryData.approvedCount,
        treatmentCategoryData.totalCount,
        insurerRate,
        8
      )
    : null;

  const weightedRates: Array<{ rate: number; weight: number; sample: number }> = [];
  if (smoothedTreatmentRate !== null && historicalData?.totalCount) {
    weightedRates.push({
      rate: smoothedTreatmentRate,
      weight: Math.log10(historicalData.totalCount + 1) * 3,
      sample: historicalData.totalCount,
    });
  }
  if (smoothedCombinedRate !== null && combinedCategoryData?.totalCount) {
    weightedRates.push({
      rate: smoothedCombinedRate,
      weight: Math.log10(combinedCategoryData.totalCount + 1) * 2.2,
      sample: combinedCategoryData.totalCount,
    });
  }
  if (smoothedDiagnosisRate !== null && diagnosisCategoryData?.totalCount) {
    weightedRates.push({
      rate: smoothedDiagnosisRate,
      weight: Math.log10(diagnosisCategoryData.totalCount + 1) * 1.8,
      sample: diagnosisCategoryData.totalCount,
    });
  }
  if (smoothedTreatmentCategoryRate !== null && treatmentCategoryData?.totalCount) {
    weightedRates.push({
      rate: smoothedTreatmentCategoryRate,
      weight: Math.log10(treatmentCategoryData.totalCount + 1) * 1.6,
      sample: treatmentCategoryData.totalCount,
    });
  }

  weightedRates.push({ rate: insurerRate, weight: 1.4, sample: insurerData?.totalCount || 0 });
  weightedRates.push({ rate: globalPriorRate, weight: 0.8, sample: 0 });

  const weightSum = weightedRates.reduce((sum, item) => sum + item.weight, 0);
  const baseRate = weightedRates.reduce((sum, item) => sum + item.rate * item.weight, 0) / weightSum;
  const sampleSize = weightedRates.reduce((sum, item) => sum + item.sample, 0);

  let score = baseRate * 100;

  if (diagCategory === "oncology") {
    score += 6;
    positiveFactors.push("Oncology diagnosis - typically prioritized for approval");
  } else if (diagCategory === "cardiology") {
    score += 4;
    positiveFactors.push("Cardiology diagnosis - often medically urgent");
  } else if (diagCategory === "gastroenterology") {
    score += 2;
  } else if (diagCategory === "orthopedic") {
    score -= 2;
    negativeFactors.push("Orthopedic cases often require conservative therapy first");
    improvementSuggestions.push("Document conservative therapy attempts and imaging");
  } else if (diagCategory === "dermatology") {
    score -= 2;
    negativeFactors.push("Dermatology treatments may face stricter formulary checks");
  } else if (diagCategory === "other") {
    score -= 3;
    negativeFactors.push("Limited historical data for this diagnosis category");
    improvementSuggestions.push("Include supporting literature or specialty guidelines");
  }

  if (treatmentCost > 50000) {
    score -= 14;
    negativeFactors.push("Ultra high-cost treatment - intensive review likely");
    improvementSuggestions.push("Include detailed cost-benefit analysis");
    improvementSuggestions.push("Reference peer-reviewed studies on treatment efficacy");
  } else if (treatmentCost > 20000) {
    score -= 10;
    negativeFactors.push("Very high-cost treatment");
    improvementSuggestions.push("Include letter of medical necessity");
  } else if (treatmentCost > 10000) {
    score -= 6;
    negativeFactors.push("High-cost specialty treatment");
  } else if (treatmentCost > 5000) {
    score -= 3;
  } else if (treatmentCost < 500) {
    score += 6;
    positiveFactors.push("Low-cost intervention - generally favorable");
  }

  if (treatmentCategory === "imaging") {
    score += 2;
    positiveFactors.push("Imaging requests are commonly approved when criteria met");
  } else if (treatmentCategory === "procedure") {
    score -= 2;
    negativeFactors.push("Procedural requests often require additional documentation");
  } else if (treatmentCategory === "therapy") {
    score -= 4;
    negativeFactors.push("Therapy requests often require step therapy documentation");
    improvementSuggestions.push("Document home exercise program and prior therapy visits");
  } else if (treatmentCategory === "lab") {
    score += 4;
    positiveFactors.push("Low-complexity lab services are typically approved");
  } else if (treatmentCategory === "other") {
    score -= 3;
    negativeFactors.push("Treatment category unclear - may require manual review");
  }

  // Factor 3: Documentation completeness
  if (input.hasCompleteDocs) {
    score += 8;
    positiveFactors.push("Complete documentation submitted");
  } else {
    score -= 12;
    negativeFactors.push("Incomplete documentation");
    improvementSuggestions.push("Ensure all supporting documents are attached");
    improvementSuggestions.push("Include recent lab results and imaging reports");
  }

  // Factor 4: Prior treatment/step therapy
  if (input.hasPriorTreatment) {
    score += 6;
    positiveFactors.push("Prior treatment attempts documented");
  } else {
    if (treatmentCategory === "medication" && treatmentCost > 5000) {
      score -= 9;
      negativeFactors.push("No prior treatment documented - step therapy likely required");
      improvementSuggestions.push("Document failure of first-line treatments");
    } else if (treatmentCategory === "procedure") {
      score -= 5;
      negativeFactors.push("No conservative care documented before procedure");
      improvementSuggestions.push("Document conservative therapy or imaging findings");
    } else if (treatmentCategory === "therapy") {
      score -= 4;
      negativeFactors.push("Conservative treatment history not documented");
      improvementSuggestions.push("Document previous conservative treatment attempts");
    }
  }

  // Factor 5: Urgency level
  if (input.urgencyLevel === "emergent") {
    score += 6;
    positiveFactors.push("Emergent request - expedited review");
  } else if (input.urgencyLevel === "urgent") {
    score += 3;
    positiveFactors.push("Urgent clinical need documented");
  }

  // Factor 6: Patient age considerations
  if (input.patientAge) {
    if (input.patientAge >= 65 && (diagCategory === "oncology" || diagCategory === "cardiology")) {
      score += 2;
      positiveFactors.push("Senior patient with high-risk diagnosis");
    } else if (input.patientAge < 18) {
      score += 3;
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
  if (historicalData?.avgProcessingDays) estimatedDays = historicalData.avgProcessingDays;
  if (input.urgencyLevel === "urgent") estimatedDays = Math.max(1, estimatedDays - 3);
  if (input.urgencyLevel === "emergent") estimatedDays = Math.max(1, estimatedDays - 6);
  if (!input.hasCompleteDocs) estimatedDays += 4;
  if (treatmentCost > 20000) estimatedDays += 3;
  if (treatmentCategory === "procedure") estimatedDays += 2;

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
