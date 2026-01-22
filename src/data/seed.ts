import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import {
  users,
  patients,
  ehrRecords,
  priorAuthorizations,
  historicalPAs,
  documents,
  notifications,
  insuranceProviders,
  appeals,
  goldCardStatus,
  p2pReviews,
  treatmentAlternatives,
  payerRequirements,
  advocacyResources,
} from "../lib/schema";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const dbPath = path.join(process.cwd(), "clearpath.db");
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

// ICD-10 codes with categories and descriptions
const diagnosisCodes = [
  { code: "C34.90", category: "oncology", description: "Lung cancer, unspecified" },
  { code: "C50.919", category: "oncology", description: "Breast cancer, unspecified" },
  { code: "C61", category: "oncology", description: "Prostate cancer" },
  { code: "C18.9", category: "oncology", description: "Colon cancer" },
  { code: "C25.9", category: "oncology", description: "Pancreatic cancer" },
  { code: "M06.9", category: "rheumatology", description: "Rheumatoid arthritis" },
  { code: "M05.79", category: "rheumatology", description: "Rheumatoid arthritis with involvement" },
  { code: "L40.50", category: "dermatology", description: "Psoriatic arthritis" },
  { code: "K50.90", category: "gastroenterology", description: "Crohn's disease" },
  { code: "K51.90", category: "gastroenterology", description: "Ulcerative colitis" },
  { code: "I25.10", category: "cardiology", description: "Coronary artery disease" },
  { code: "I50.9", category: "cardiology", description: "Heart failure" },
  { code: "I48.91", category: "cardiology", description: "Atrial fibrillation" },
  { code: "E11.9", category: "endocrinology", description: "Type 2 diabetes mellitus" },
  { code: "E10.9", category: "endocrinology", description: "Type 1 diabetes mellitus" },
  { code: "G35", category: "neurology", description: "Multiple sclerosis" },
  { code: "G20", category: "neurology", description: "Parkinson's disease" },
  { code: "G43.909", category: "neurology", description: "Migraine, unspecified" },
  { code: "M54.5", category: "orthopedic", description: "Low back pain" },
  { code: "M17.11", category: "orthopedic", description: "Primary osteoarthritis, right knee" },
  { code: "M75.10", category: "orthopedic", description: "Rotator cuff syndrome" },
  { code: "R51.9", category: "neurology", description: "Headache, unspecified" },
  { code: "J45.909", category: "pulmonology", description: "Asthma, unspecified" },
  { code: "J44.9", category: "pulmonology", description: "COPD, unspecified" },
  { code: "N18.6", category: "nephrology", description: "End-stage renal disease" },
];

// Treatment codes with categories
const treatmentCodes = [
  { code: "J9271", category: "medication", name: "Pembrolizumab (Keytruda)", avgCost: 15000 },
  { code: "J9035", category: "medication", name: "Bevacizumab (Avastin)", avgCost: 8000 },
  { code: "J9305", category: "medication", name: "Pemetrexed", avgCost: 5000 },
  { code: "J0135", category: "medication", name: "Adalimumab (Humira)", avgCost: 6500 },
  { code: "J1745", category: "medication", name: "Infliximab (Remicade)", avgCost: 4500 },
  { code: "J2350", category: "medication", name: "Ocrelizumab (Ocrevus)", avgCost: 32000 },
  { code: "J0585", category: "medication", name: "Botulinum toxin A", avgCost: 1200 },
  { code: "J1300", category: "medication", name: "Eculizumab (Soliris)", avgCost: 45000 },
  { code: "J2796", category: "medication", name: "Romiplostim", avgCost: 8500 },
  { code: "70553", category: "imaging", name: "MRI Brain with contrast", avgCost: 2500 },
  { code: "70552", category: "imaging", name: "MRI Brain without contrast", avgCost: 1800 },
  { code: "74177", category: "imaging", name: "CT Abdomen/Pelvis with contrast", avgCost: 1500 },
  { code: "78815", category: "imaging", name: "PET Scan", avgCost: 5500 },
  { code: "93458", category: "procedure", name: "Cardiac catheterization", avgCost: 15000 },
  { code: "27447", category: "procedure", name: "Total knee replacement", avgCost: 35000 },
  { code: "29881", category: "procedure", name: "Knee arthroscopy", avgCost: 8000 },
  { code: "43239", category: "procedure", name: "Upper GI endoscopy with biopsy", avgCost: 3500 },
  { code: "97110", category: "therapy", name: "Physical therapy", avgCost: 150 },
  { code: "97140", category: "therapy", name: "Manual therapy", avgCost: 120 },
  { code: "90837", category: "therapy", name: "Psychotherapy, 60 min", avgCost: 200 },
];

// Insurance providers
const insurers = [
  { name: "Blue Cross Blue Shield", avgApprovalRate: 0.72, avgProcessingDays: 12 },
  { name: "Aetna", avgApprovalRate: 0.68, avgProcessingDays: 14 },
  { name: "UnitedHealthcare", avgApprovalRate: 0.65, avgProcessingDays: 15 },
  { name: "Cigna", avgApprovalRate: 0.70, avgProcessingDays: 11 },
  { name: "Humana", avgApprovalRate: 0.73, avgProcessingDays: 10 },
  { name: "Kaiser Permanente", avgApprovalRate: 0.78, avgProcessingDays: 8 },
  { name: "Anthem", avgApprovalRate: 0.67, avgProcessingDays: 13 },
  { name: "Molina Healthcare", avgApprovalRate: 0.62, avgProcessingDays: 16 },
  { name: "Centene", avgApprovalRate: 0.64, avgProcessingDays: 14 },
  { name: "Medicare", avgApprovalRate: 0.80, avgProcessingDays: 7 },
];

const denialReasons = [
  "Medical necessity not established",
  "Insufficient documentation",
  "Prior authorization not obtained",
  "Service not covered under plan",
  "Out-of-network provider",
  "Step therapy requirement not met",
  "Experimental or investigational treatment",
  "Exceeded benefit limits",
  "Pre-existing condition exclusion",
  "Missing clinical documentation",
  "Alternative treatment available",
  "Not medically appropriate",
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateHistoricalPAs(count: number) {
  const records = [];
  for (let i = 0; i < count; i++) {
    const diagnosis = randomChoice(diagnosisCodes);
    const treatment = randomChoice(treatmentCodes);
    const insurer = randomChoice(insurers);
    
    // Base approval rate varies by factors
    let approvalChance = insurer.avgApprovalRate;
    
    // Oncology treatments have higher approval
    if (diagnosis.category === "oncology") approvalChance += 0.10;
    // Specialty meds slightly lower
    if (treatment.avgCost > 10000) approvalChance -= 0.08;
    // Complete documentation helps
    const docComplete = Math.random() > 0.3 ? 1 : 0;
    if (docComplete) approvalChance += 0.12;
    // Prior treatment helps
    const hadPrior = Math.random() > 0.4 ? 1 : 0;
    if (hadPrior) approvalChance += 0.08;
    
    const approved = Math.random() < approvalChance;
    const urgency = randomChoice(["routine", "urgent", "emergent"]);
    
    let processingDays = insurer.avgProcessingDays + randomInt(-5, 5);
    if (urgency === "urgent") processingDays = Math.max(1, processingDays - 5);
    if (urgency === "emergent") processingDays = Math.max(1, processingDays - 8);
    
    const year = randomChoice([2023, 2024, 2025]);
    const month = randomInt(1, 12);
    
    records.push({
      id: uuidv4(),
      diagnosisCode: diagnosis.code,
      diagnosisCategory: diagnosis.category,
      treatmentCode: treatment.code,
      treatmentCategory: treatment.category,
      insuranceProvider: insurer.name,
      patientAge: randomInt(25, 85),
      patientGender: randomChoice(["M", "F"]),
      outcome: approved ? "approved" : "denied",
      denialReason: approved ? null : randomChoice(denialReasons),
      processingDays,
      hadPriorTreatment: hadPrior,
      documentationComplete: docComplete,
      urgencyLevel: urgency,
      year,
      month,
    });
  }
  return records;
}

async function seed() {
  console.log("Seeding database...");

  // Clear existing data - disable foreign keys temporarily
  sqlite.exec("PRAGMA foreign_keys = OFF");
  db.delete(p2pReviews).run();
  db.delete(appeals).run();
  db.delete(goldCardStatus).run();
  db.delete(notifications).run();
  db.delete(documents).run();
  db.delete(priorAuthorizations).run();
  db.delete(historicalPAs).run();
  db.delete(ehrRecords).run();
  db.delete(patients).run();
  db.delete(users).run();
  db.delete(insuranceProviders).run();
  db.delete(treatmentAlternatives).run();
  db.delete(payerRequirements).run();
  db.delete(advocacyResources).run();
  sqlite.exec("PRAGMA foreign_keys = ON");

  // Create demo users
  const physicianId = uuidv4();
  const physician2Id = uuidv4();
  const adminId = uuidv4();
  const patientUserId1 = uuidv4();
  const patientUserId2 = uuidv4();
  const patientUserId3 = uuidv4();

  const usersData = [
    {
      id: physicianId,
      email: "dr.smith@demo.com",
      firstName: "Emily",
      lastName: "Smith",
      role: "physician",
      organization: "ClearPath Medical Center",
      createdAt: new Date().toISOString(),
    },
    {
      id: physician2Id,
      email: "dr.chen@demo.com",
      firstName: "David",
      lastName: "Chen",
      role: "physician",
      organization: "ClearPath Medical Center",
      createdAt: new Date().toISOString(),
    },
    {
      id: adminId,
      email: "admin@demo.com",
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      organization: "ClearPath Medical Center",
      createdAt: new Date().toISOString(),
    },
    {
      id: patientUserId1,
      email: "patient@demo.com",
      firstName: "Sarah",
      lastName: "Johnson",
      role: "patient",
      organization: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: patientUserId2,
      email: "michael@demo.com",
      firstName: "Michael",
      lastName: "Chen",
      role: "patient",
      organization: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: patientUserId3,
      email: "elena@demo.com",
      firstName: "Elena",
      lastName: "Rodriguez",
      role: "patient",
      organization: null,
      createdAt: new Date().toISOString(),
    },
  ];

  for (const user of usersData) {
    db.insert(users).values(user).run();
  }
  console.log(`Created ${usersData.length} users`);

  // Patient IDs
  const sarahId = uuidv4();
  const michaelId = uuidv4();
  const elenaId = uuidv4();

  // Create patients
  const patientsData = [
    {
      id: sarahId,
      userId: patientUserId1,
      email: "patient@demo.com",
      firstName: "Sarah",
      lastName: "Johnson",
      dateOfBirth: "1985-03-15",
      insuranceProvider: "Blue Cross Blue Shield",
      insuranceId: "BCBS-789456123",
      gender: "F",
      address: "123 Main St, Boston, MA 02101",
      phone: "(617) 555-0123",
    },
    {
      id: michaelId,
      userId: patientUserId2,
      email: "michael@demo.com",
      firstName: "Michael",
      lastName: "Chen",
      dateOfBirth: "1978-07-22",
      insuranceProvider: "Aetna",
      insuranceId: "AET-456789012",
      gender: "M",
      address: "456 Oak Ave, Cambridge, MA 02139",
      phone: "(617) 555-0456",
    },
    {
      id: elenaId,
      userId: patientUserId3,
      email: "elena@demo.com",
      firstName: "Elena",
      lastName: "Rodriguez",
      dateOfBirth: "1992-11-08",
      insuranceProvider: "UnitedHealthcare",
      insuranceId: "UHC-123456789",
      gender: "F",
      address: "789 Elm St, Somerville, MA 02143",
      phone: "(617) 555-0789",
    },
  ];

  for (const patient of patientsData) {
    db.insert(patients).values(patient).run();
  }
  console.log("Created 3 patients");

  // Create EHR records for each patient
  const ehrData = [
    {
      id: uuidv4(),
      patientId: sarahId,
      diagnoses: JSON.stringify([
        { code: "C34.90", description: "Non-small cell lung cancer, stage IIIA", dateAdded: "2023-12-01" },
        { code: "J45.20", description: "Mild intermittent asthma", dateAdded: "2020-05-15" },
        { code: "E78.5", description: "Hyperlipidemia", dateAdded: "2021-03-10" },
      ]),
      medications: JSON.stringify([
        { name: "Lisinopril", dose: "10mg", frequency: "daily", startDate: "2021-01-15" },
        { name: "Atorvastatin", dose: "20mg", frequency: "daily", startDate: "2021-03-10" },
        { name: "Albuterol inhaler", dose: "90mcg", frequency: "as needed", startDate: "2020-05-15" },
      ]),
      allergies: JSON.stringify(["Penicillin", "Sulfa drugs"]),
      labResults: JSON.stringify([
        { test: "PD-L1 Expression", result: "55%", date: "2023-12-05", normal: "N/A" },
        { test: "CEA", result: "8.5 ng/mL", date: "2024-01-02", normal: "<3.0 ng/mL" },
        { test: "CBC", result: "Normal", date: "2024-01-08", normal: "Normal" },
        { test: "CMP", result: "Normal", date: "2024-01-08", normal: "Normal" },
        { test: "Creatinine", result: "0.9 mg/dL", date: "2024-01-08", normal: "0.6-1.2 mg/dL" },
      ]),
      vitalSigns: JSON.stringify({
        bloodPressure: "128/82",
        heartRate: 76,
        temperature: 98.6,
        weight: 145,
        height: 65,
        recordedAt: "2024-01-10",
      }),
      medicalHistory: JSON.stringify([
        { condition: "Appendectomy", year: 2010 },
        { condition: "Right upper lobectomy", year: 2023 },
        { condition: "Radiation therapy - chest", year: 2023 },
      ]),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      patientId: michaelId,
      diagnoses: JSON.stringify([
        { code: "M06.9", description: "Rheumatoid arthritis, unspecified", dateAdded: "2022-06-15" },
        { code: "E11.9", description: "Type 2 diabetes mellitus", dateAdded: "2019-08-20" },
        { code: "M54.5", description: "Low back pain", dateAdded: "2023-09-01" },
      ]),
      medications: JSON.stringify([
        { name: "Methotrexate", dose: "15mg", frequency: "weekly", startDate: "2022-07-01" },
        { name: "Folic acid", dose: "1mg", frequency: "daily", startDate: "2022-07-01" },
        { name: "Metformin", dose: "1000mg", frequency: "twice daily", startDate: "2019-09-01" },
        { name: "Prednisone", dose: "5mg", frequency: "daily", startDate: "2023-01-15" },
      ]),
      allergies: JSON.stringify(["None known"]),
      labResults: JSON.stringify([
        { test: "RF (Rheumatoid Factor)", result: "45 IU/mL", date: "2024-01-05", normal: "<14 IU/mL" },
        { test: "CRP", result: "12 mg/L", date: "2024-01-05", normal: "<3 mg/L" },
        { test: "ESR", result: "35 mm/hr", date: "2024-01-05", normal: "0-22 mm/hr" },
        { test: "HbA1c", result: "7.2%", date: "2024-01-05", normal: "<5.7%" },
        { test: "LFTs", result: "Normal", date: "2024-01-05", normal: "Normal" },
      ]),
      vitalSigns: JSON.stringify({
        bloodPressure: "135/88",
        heartRate: 82,
        temperature: 98.4,
        weight: 195,
        height: 70,
        recordedAt: "2024-01-12",
      }),
      medicalHistory: JSON.stringify([
        { condition: "Failed sulfasalazine trial", year: 2022 },
        { condition: "Failed hydroxychloroquine trial", year: 2023 },
      ]),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      patientId: elenaId,
      diagnoses: JSON.stringify([
        { code: "I25.10", description: "Coronary artery disease", dateAdded: "2023-11-15" },
        { code: "I10", description: "Essential hypertension", dateAdded: "2021-02-10" },
        { code: "E78.0", description: "Pure hypercholesterolemia", dateAdded: "2021-02-10" },
      ]),
      medications: JSON.stringify([
        { name: "Aspirin", dose: "81mg", frequency: "daily", startDate: "2023-11-20" },
        { name: "Metoprolol", dose: "50mg", frequency: "twice daily", startDate: "2023-11-20" },
        { name: "Atorvastatin", dose: "40mg", frequency: "daily", startDate: "2021-03-01" },
        { name: "Lisinopril", dose: "20mg", frequency: "daily", startDate: "2021-02-15" },
      ]),
      allergies: JSON.stringify(["Codeine", "Latex"]),
      labResults: JSON.stringify([
        { test: "Troponin I", result: "0.02 ng/mL", date: "2023-12-15", normal: "<0.04 ng/mL" },
        { test: "LDL", result: "95 mg/dL", date: "2023-12-15", normal: "<100 mg/dL" },
        { test: "Stress test", result: "Positive for ischemia", date: "2023-12-10", normal: "Negative" },
        { test: "EKG", result: "ST depression leads V4-V6", date: "2023-12-10", normal: "Normal" },
      ]),
      vitalSigns: JSON.stringify({
        bloodPressure: "142/90",
        heartRate: 88,
        temperature: 98.2,
        weight: 158,
        height: 64,
        recordedAt: "2023-12-18",
      }),
      medicalHistory: JSON.stringify([
        { condition: "Family history of MI (father at 55)", year: null },
        { condition: "Gestational diabetes", year: 2018 },
      ]),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const ehr of ehrData) {
    db.insert(ehrRecords).values(ehr).run();
  }
  console.log("Created 3 EHR records");

  // PA IDs
  const pa1Id = uuidv4();
  const pa2Id = uuidv4();
  const pa3Id = uuidv4();
  const pa4Id = uuidv4();
  const pa5Id = uuidv4();

  // Create prior authorizations with enhanced fields
  const pasData = [
    {
      id: pa1Id,
      patientId: sarahId,
      physicianId: physicianId,
      submittedByUserId: physicianId,
      treatmentName: "Chemotherapy (Pembrolizumab)",
      treatmentCode: "J9271",
      diagnosisCode: "C34.90",
      diagnosisDescription: "Non-small cell lung cancer, stage IIIA",
      status: "under_review",
      statusDetail: null,
      riskScore: 78,
      riskScoreConfidenceLow: 72,
      riskScoreConfidenceHigh: 84,
      riskFactorsPositive: JSON.stringify([
        "PD-L1 expression >50% documented",
        "Stage IIIA NSCLC - standard of care",
        "Complete documentation submitted",
        "Prior treatments documented (surgery, radiation)",
      ]),
      riskFactorsNegative: JSON.stringify([
        "High-cost specialty medication",
        "Long treatment duration (up to 24 months)",
      ]),
      riskImprovementSuggestions: JSON.stringify([
        "Include genetic testing results (EGFR, ALK)",
        "Add letter of medical necessity from oncologist",
      ]),
      historicalApprovalRate: 0.76,
      physicianNotes:
        "Patient diagnosed with stage IIIA non-small cell lung cancer. Pembrolizumab recommended as first-line treatment based on PD-L1 expression >50%. Previous treatments include surgery and radiation therapy with partial response. Treatment plan: 200mg IV every 3 weeks for up to 24 months.",
      aiNarrative: "Medical Necessity Statement:\n\nThis prior authorization request is for pembrolizumab (Keytruda) 200mg IV every 3 weeks for Sarah Johnson, a 38-year-old female with stage IIIA non-small cell lung cancer (ICD-10: C34.90).\n\nClinical Justification:\n1. Biomarker Status: PD-L1 tumor proportion score (TPS) of 55%, exceeding the ≥50% threshold for first-line monotherapy per NCCN guidelines.\n2. Disease Stage: Stage IIIA disease confirmed by imaging and pathology, appropriate for systemic therapy.\n3. Prior Treatment: Patient has undergone right upper lobectomy and completed radiation therapy with partial response, meeting criteria for systemic treatment escalation.\n4. Performance Status: ECOG 1, indicating good functional status suitable for immunotherapy.\n\nNCCN Guidelines Reference: Per NCCN NSCLC Guidelines v1.2024, pembrolizumab monotherapy is Category 1 recommended for first-line treatment of metastatic NSCLC with PD-L1 ≥50% and no EGFR/ALK aberrations.\n\nConclusion: Pembrolizumab is medically necessary and represents evidence-based, guideline-concordant care for this patient's condition.",
      aiNarrativeStrength: 87,
      aiAutofillData: null,
      denialReason: null,
      estimatedCompletionDays: 10,
      submittedAt: "2024-01-10T14:30:00Z",
      decisionAt: null,
      updatedAt: "2024-01-12T09:15:00Z",
    },
    {
      id: pa2Id,
      patientId: sarahId,
      physicianId: physicianId,
      submittedByUserId: physicianId,
      treatmentName: "MRI Brain Scan",
      treatmentCode: "70553",
      diagnosisCode: "C34.90",
      diagnosisDescription: "Non-small cell lung cancer (surveillance)",
      status: "complete",
      statusDetail: "approved",
      riskScore: 92,
      riskScoreConfidenceLow: 88,
      riskScoreConfidenceHigh: 95,
      riskFactorsPositive: JSON.stringify([
        "Known malignancy requiring surveillance",
        "Standard imaging for cancer staging",
        "Blue Cross typically approves oncology imaging",
        "Complete clinical documentation",
      ]),
      riskFactorsNegative: JSON.stringify([]),
      riskImprovementSuggestions: JSON.stringify([]),
      historicalApprovalRate: 0.89,
      physicianNotes:
        "MRI requested to evaluate persistent headaches and rule out metastatic disease. Patient has history of lung cancer requiring routine monitoring. Scan approved for diagnostic purposes.",
      aiNarrative: null,
      aiNarrativeStrength: null,
      aiAutofillData: null,
      denialReason: null,
      estimatedCompletionDays: 5,
      submittedAt: "2024-01-05T10:00:00Z",
      decisionAt: "2024-01-08T16:45:00Z",
      updatedAt: "2024-01-08T16:45:00Z",
    },
    {
      id: pa3Id,
      patientId: michaelId,
      physicianId: physician2Id,
      submittedByUserId: physician2Id,
      treatmentName: "Humira (Adalimumab)",
      treatmentCode: "J0135",
      diagnosisCode: "M06.9",
      diagnosisDescription: "Rheumatoid arthritis, unspecified",
      status: "submitted",
      statusDetail: null,
      riskScore: 65,
      riskScoreConfidenceLow: 58,
      riskScoreConfidenceHigh: 72,
      riskFactorsPositive: JSON.stringify([
        "Failed methotrexate therapy documented",
        "Elevated inflammatory markers (CRP, ESR)",
        "RF positive confirming diagnosis",
      ]),
      riskFactorsNegative: JSON.stringify([
        "Only one prior DMARD trial documented",
        "Aetna typically requires 2+ DMARD failures",
        "High-cost biologic medication",
      ]),
      riskImprovementSuggestions: JSON.stringify([
        "Document second DMARD failure (sulfasalazine or hydroxychloroquine)",
        "Include DAS28 score showing moderate-to-severe disease activity",
        "Add recent joint imaging showing erosive disease",
      ]),
      historicalApprovalRate: 0.62,
      physicianNotes:
        "Patient with moderate to severe rheumatoid arthritis. Failed treatment with methotrexate and sulfasalazine. Adalimumab 40mg subcutaneous injection every other week recommended. Lab work confirms elevated CRP and ESR levels.",
      aiNarrative: null,
      aiNarrativeStrength: null,
      aiAutofillData: null,
      denialReason: null,
      estimatedCompletionDays: 14,
      submittedAt: "2024-01-14T11:20:00Z",
      decisionAt: null,
      updatedAt: "2024-01-14T11:20:00Z",
    },
    {
      id: pa4Id,
      patientId: michaelId,
      physicianId: physician2Id,
      submittedByUserId: physician2Id,
      treatmentName: "Physical Therapy (12 sessions)",
      treatmentCode: "97110",
      diagnosisCode: "M54.5",
      diagnosisDescription: "Low back pain",
      status: "complete",
      statusDetail: "denied",
      riskScore: 45,
      riskScoreConfidenceLow: 38,
      riskScoreConfidenceHigh: 52,
      riskFactorsPositive: JSON.stringify([
        "Physical therapy is conservative treatment",
        "Low-cost intervention",
      ]),
      riskFactorsNegative: JSON.stringify([
        "No prior conservative treatment documented",
        "Aetna requires home exercise trial first",
        "No imaging to document structural cause",
        "Non-specific low back pain diagnosis",
      ]),
      riskImprovementSuggestions: JSON.stringify([
        "Document 6-week home exercise program completion",
        "Obtain lumbar spine imaging",
        "Include functional assessment scores",
        "Add specific diagnosis if available (disc herniation, stenosis)",
      ]),
      historicalApprovalRate: 0.48,
      physicianNotes:
        "Request for 12 physical therapy sessions for chronic lower back pain. Patient has not completed required conservative treatment trial. Recommendation: Complete 6-week home exercise program before resubmission.",
      aiNarrative: null,
      aiNarrativeStrength: null,
      aiAutofillData: null,
      denialReason: "Step therapy requirement not met - Home exercise program must be completed before physical therapy authorization",
      estimatedCompletionDays: 7,
      submittedAt: "2024-01-02T08:30:00Z",
      decisionAt: "2024-01-09T14:00:00Z",
      updatedAt: "2024-01-09T14:00:00Z",
    },
    {
      id: pa5Id,
      patientId: elenaId,
      physicianId: physicianId,
      submittedByUserId: physicianId,
      treatmentName: "Cardiac Catheterization",
      treatmentCode: "93458",
      diagnosisCode: "I25.10",
      diagnosisDescription: "Coronary artery disease",
      status: "complete",
      statusDetail: "approved",
      riskScore: 88,
      riskScoreConfidenceLow: 82,
      riskScoreConfidenceHigh: 93,
      riskFactorsPositive: JSON.stringify([
        "Positive stress test documented",
        "EKG changes consistent with ischemia",
        "Diagnostic procedure for confirmed CAD",
        "Strong clinical indication",
      ]),
      riskFactorsNegative: JSON.stringify([
        "Patient is relatively young (32)",
      ]),
      riskImprovementSuggestions: JSON.stringify([]),
      historicalApprovalRate: 0.85,
      physicianNotes:
        "Diagnostic cardiac catheterization for evaluation of coronary artery disease. Stress test positive for ischemia. Patient presents with chest pain on exertion. Procedure approved based on clinical necessity.",
      aiNarrative: null,
      aiNarrativeStrength: null,
      aiAutofillData: null,
      denialReason: null,
      estimatedCompletionDays: 5,
      submittedAt: "2023-12-20T09:00:00Z",
      decisionAt: "2023-12-28T11:30:00Z",
      updatedAt: "2023-12-28T11:30:00Z",
    },
  ];

  for (const pa of pasData) {
    db.insert(priorAuthorizations).values(pa).run();
  }
  console.log("Created 5 prior authorizations");

  // Create documents
  const docsData = [
    {
      id: uuidv4(),
      paId: pa1Id,
      fileName: "pathology_report.pdf",
      fileType: "application/pdf",
      uploadedAt: "2024-01-10T14:35:00Z",
      uploadedBy: physicianId,
    },
    {
      id: uuidv4(),
      paId: pa1Id,
      fileName: "ct_scan_results.pdf",
      fileType: "application/pdf",
      uploadedAt: "2024-01-10T14:36:00Z",
      uploadedBy: physicianId,
    },
    {
      id: uuidv4(),
      paId: pa1Id,
      fileName: "pdl1_test_results.pdf",
      fileType: "application/pdf",
      uploadedAt: "2024-01-10T14:37:00Z",
      uploadedBy: physicianId,
    },
    {
      id: uuidv4(),
      paId: pa2Id,
      fileName: "referral_letter.pdf",
      fileType: "application/pdf",
      uploadedAt: "2024-01-05T10:05:00Z",
      uploadedBy: physicianId,
    },
    {
      id: uuidv4(),
      paId: pa3Id,
      fileName: "lab_results.pdf",
      fileType: "application/pdf",
      uploadedAt: "2024-01-14T11:25:00Z",
      uploadedBy: physician2Id,
    },
    {
      id: uuidv4(),
      paId: pa3Id,
      fileName: "rheumatology_consult.pdf",
      fileType: "application/pdf",
      uploadedAt: "2024-01-14T11:26:00Z",
      uploadedBy: physician2Id,
    },
    {
      id: uuidv4(),
      paId: pa5Id,
      fileName: "stress_test_results.pdf",
      fileType: "application/pdf",
      uploadedAt: "2023-12-20T09:10:00Z",
      uploadedBy: physicianId,
    },
    {
      id: uuidv4(),
      paId: pa5Id,
      fileName: "ecg_report.pdf",
      fileType: "application/pdf",
      uploadedAt: "2023-12-20T09:12:00Z",
      uploadedBy: physicianId,
    },
  ];

  for (const doc of docsData) {
    db.insert(documents).values(doc).run();
  }
  console.log("Created 8 documents");

  // Create notifications
  const notificationsData = [
    {
      id: uuidv4(),
      userId: patientUserId1,
      patientId: sarahId,
      paId: pa1Id,
      type: "status_change",
      title: "PA Status Updated",
      message: "Your prior authorization for Pembrolizumab is now under review.",
      channel: "email",
      read: 0,
      sentAt: "2024-01-11T08:00:00Z",
      createdAt: "2024-01-11T08:00:00Z",
    },
    {
      id: uuidv4(),
      userId: patientUserId1,
      patientId: sarahId,
      paId: pa2Id,
      type: "decision",
      title: "PA Approved!",
      message: "Great news! Your MRI Brain Scan has been approved.",
      channel: "email",
      read: 1,
      sentAt: "2024-01-08T17:00:00Z",
      createdAt: "2024-01-08T17:00:00Z",
    },
    {
      id: uuidv4(),
      userId: patientUserId2,
      patientId: michaelId,
      paId: pa4Id,
      type: "decision",
      title: "PA Denied",
      message: "Your Physical Therapy request was denied. Please review the denial reason.",
      channel: "email",
      read: 0,
      sentAt: "2024-01-09T14:30:00Z",
      createdAt: "2024-01-09T14:30:00Z",
    },
    {
      id: uuidv4(),
      userId: patientUserId3,
      patientId: elenaId,
      paId: pa5Id,
      type: "decision",
      title: "PA Approved!",
      message: "Your Cardiac Catheterization has been approved.",
      channel: "sms",
      read: 1,
      sentAt: "2023-12-28T12:00:00Z",
      createdAt: "2023-12-28T12:00:00Z",
    },
  ];

  for (const notif of notificationsData) {
    db.insert(notifications).values(notif).run();
  }
  console.log("Created 4 notifications");

  // Create insurance providers with enhanced data
  const insurerDetails = [
    { name: "Blue Cross Blue Shield", p2pPhone: "1-800-555-BCBS", p2pHours: "Mon-Fri 8am-6pm EST", appealDays: 180, goldCard: 0.90 },
    { name: "Aetna", p2pPhone: "1-800-555-AETN", p2pHours: "Mon-Fri 9am-5pm EST", appealDays: 180, goldCard: 0.92 },
    { name: "UnitedHealthcare", p2pPhone: "1-800-555-UHC1", p2pHours: "Mon-Fri 8am-8pm EST", appealDays: 180, goldCard: 0.92 },
    { name: "Cigna", p2pPhone: "1-800-555-CIGN", p2pHours: "Mon-Fri 8am-6pm EST", appealDays: 180, goldCard: 0.90 },
    { name: "Humana", p2pPhone: "1-800-555-HUMN", p2pHours: "Mon-Fri 8am-5pm EST", appealDays: 180, goldCard: 0.90 },
    { name: "Kaiser Permanente", p2pPhone: "1-800-555-KAIS", p2pHours: "Mon-Fri 8am-5pm PST", appealDays: 180, goldCard: 0.90 },
    { name: "Anthem", p2pPhone: "1-800-555-ANTH", p2pHours: "Mon-Fri 8am-6pm EST", appealDays: 180, goldCard: 0.90 },
    { name: "Molina Healthcare", p2pPhone: "1-800-555-MOLI", p2pHours: "Mon-Fri 8am-5pm EST", appealDays: 180, goldCard: 0.90 },
    { name: "Centene", p2pPhone: "1-800-555-CENT", p2pHours: "Mon-Fri 8am-5pm EST", appealDays: 180, goldCard: 0.90 },
    { name: "Medicare", p2pPhone: "1-800-555-MCAR", p2pHours: "Mon-Fri 8am-8pm EST", appealDays: 120, goldCard: 0.90 },
  ];
  
  for (let i = 0; i < insurers.length; i++) {
    const insurer = insurers[i];
    const details = insurerDetails[i];
    db.insert(insuranceProviders).values({
      id: uuidv4(),
      name: insurer.name,
      avgApprovalRate: insurer.avgApprovalRate,
      avgProcessingDays: insurer.avgProcessingDays,
      requiresPriorAuth: JSON.stringify(treatmentCodes.slice(0, 10).map(t => t.code)),
      commonDenialReasons: JSON.stringify(denialReasons.slice(0, 5)),
      documentChecklist: JSON.stringify([
        "Letter of medical necessity",
        "Recent lab results (within 30 days)",
        "Imaging reports if applicable",
        "Prior treatment documentation",
        "Current medication list",
      ]),
      p2pPhoneNumber: details.p2pPhone,
      p2pHours: details.p2pHours,
      appealDeadlineDays: details.appealDays,
      goldCardThreshold: details.goldCard,
    }).run();
  }
  console.log(`Created ${insurers.length} insurance providers`);

  // Create treatment alternatives
  const alternativesData = [
    { original: "J9271", alt: "J9035", name: "Bevacizumab (Avastin)", reason: "lower cost", cost: 8000, likelihood: 0.75 },
    { original: "J9271", alt: "J9305", name: "Pemetrexed", reason: "step therapy", cost: 5000, likelihood: 0.80 },
    { original: "J0135", alt: "J1745", name: "Infliximab (Remicade)", reason: "formulary", cost: 4500, likelihood: 0.70 },
    { original: "J0135", alt: "90853", name: "Group Therapy + Methotrexate", reason: "step therapy", cost: 500, likelihood: 0.85 },
    { original: "70553", alt: "70552", name: "MRI Brain without contrast", reason: "lower cost", cost: 1800, likelihood: 0.90 },
    { original: "27447", alt: "29881", name: "Knee Arthroscopy", reason: "less invasive first", cost: 8000, likelihood: 0.75 },
    { original: "97110", alt: "97140", name: "Manual Therapy", reason: "alternative modality", cost: 120, likelihood: 0.80 },
  ];
  for (const alt of alternativesData) {
    db.insert(treatmentAlternatives).values({
      id: uuidv4(),
      originalTreatmentCode: alt.original,
      alternativeTreatmentCode: alt.alt,
      alternativeName: alt.name,
      reason: alt.reason,
      estimatedCost: alt.cost,
      approvalLikelihood: alt.likelihood,
      clinicalNotes: `Consider ${alt.name} as an alternative when ${alt.reason} requirements apply.`,
    }).run();
  }
  console.log(`Created ${alternativesData.length} treatment alternatives`);

  // Create payer requirements
  const payerReqs = [
    {
      insurer: "Blue Cross Blue Shield",
      treatmentCode: "J9271",
      category: "oncology",
      docs: ["Pathology report", "PD-L1 expression results", "Staging documentation", "ECOG performance status"],
      stepTherapy: 0,
      criteria: ["PD-L1 >= 50%", "No EGFR/ALK mutations", "Stage III or IV NSCLC"],
      pitfalls: ["Missing biomarker results", "Incomplete staging", "Prior therapy not documented"],
      tips: ["Include NCCN guideline reference", "Document all prior treatments attempted"],
    },
    {
      insurer: "Aetna",
      treatmentCode: "J0135",
      category: "rheumatology",
      docs: ["Rheumatology consult note", "RF/Anti-CCP results", "DAS28 score", "Prior DMARD trial documentation"],
      stepTherapy: 1,
      stepDrugs: ["Methotrexate", "Sulfasalazine", "Hydroxychloroquine"],
      criteria: ["Failed 2+ DMARDs", "Moderate-to-severe RA", "DAS28 > 3.2"],
      pitfalls: ["Only one DMARD failure documented", "Missing disease activity scores", "No imaging of joint damage"],
      tips: ["Document duration and max dose of each failed DMARD", "Include functional assessment"],
    },
    {
      insurer: "UnitedHealthcare",
      treatmentCode: "97110",
      category: "orthopedic",
      docs: ["Referral from PCP", "Functional assessment", "Treatment plan", "Home exercise program compliance"],
      stepTherapy: 1,
      stepDrugs: ["Home exercise program (6 weeks)"],
      criteria: ["Functional limitation documented", "Home program attempted", "Specific diagnosis"],
      pitfalls: ["Non-specific diagnosis like 'back pain'", "No prior conservative treatment", "Missing functional scores"],
      tips: ["Use specific ICD-10 codes", "Document Oswestry or similar scores", "Show home program compliance"],
    },
  ];
  for (const req of payerReqs) {
    db.insert(payerRequirements).values({
      id: uuidv4(),
      insuranceProvider: req.insurer,
      treatmentCode: req.treatmentCode,
      diagnosisCategory: req.category,
      requiredDocuments: JSON.stringify(req.docs),
      stepTherapyRequired: req.stepTherapy,
      stepTherapyDrugs: JSON.stringify(req.stepDrugs || []),
      clinicalCriteria: JSON.stringify(req.criteria),
      commonPitfalls: JSON.stringify(req.pitfalls),
      tips: JSON.stringify(req.tips),
    }).run();
  }
  console.log(`Created ${payerReqs.length} payer requirements`);

  // Create advocacy resources
  const resources = [
    {
      title: "How to Appeal a Denied Prior Authorization",
      description: "Step-by-step guide to navigating the appeals process",
      type: "article",
      category: "appeals",
      content: `STEP 1: Understand Your Denial
Read your denial letter carefully. It should include:
- The specific reason for denial
- The clinical criteria used
- Your appeal rights and deadlines

STEP 2: Gather Documentation
Collect all relevant medical records including:
- Lab results and imaging
- Doctor's notes and recommendations
- Clinical guidelines supporting your treatment

STEP 3: File Internal Appeal
You have 180 days to file an internal appeal. Include:
- A clear statement of why you're appealing
- New evidence not previously submitted
- Letter of medical necessity from your doctor

STEP 4: Request Peer-to-Peer Review
Your doctor can request to speak directly with the insurance medical director to discuss the clinical merits of your case.

STEP 5: External Review
If internal appeal is denied, you can request an independent external review within 4 months.`,
    },
    {
      title: "Patient Bill of Rights for Prior Authorization",
      description: "Know your rights when dealing with insurance denials",
      type: "article",
      category: "rights",
      content: `YOUR RIGHTS INCLUDE:

1. RIGHT TO TIMELY DECISIONS
- Standard requests: 15 days (7 days starting 2026)
- Urgent requests: 72 hours

2. RIGHT TO CLEAR EXPLANATIONS
- Written denial with specific reasons
- Clinical criteria used in decision

3. RIGHT TO APPEAL
- Internal appeal within 180 days
- External independent review
- State insurance commissioner complaint

4. RIGHT TO CONTINUED TREATMENT
- If treatment was previously approved and is ongoing
- During the appeals process in urgent cases

5. RIGHT TO PEER REVIEW
- Your doctor can speak with insurance medical director
- Must be same specialty for certain reviews`,
    },
    {
      title: "Financial Assistance Programs",
      description: "Resources for patients struggling with treatment costs",
      type: "article",
      category: "financial_assistance",
      content: `MANUFACTURER PATIENT ASSISTANCE PROGRAMS
Most drug manufacturers offer free or reduced-cost medications for qualifying patients.

FOUNDATION GRANTS
- Patient Advocate Foundation: www.patientadvocate.org
- HealthWell Foundation: www.healthwellfoundation.org
- PAN Foundation: www.panfoundation.org

HOSPITAL CHARITY CARE
Most hospitals offer charity care programs for uninsured or underinsured patients.

STATE PROGRAMS
Contact your state insurance commissioner for local assistance programs.

CROWDFUNDING
GoFundMe and similar platforms can help with medical expenses.`,
    },
    {
      title: "Cancer Patients: Prior Authorization Rights",
      description: "Special protections and resources for oncology patients",
      type: "article",
      category: "rights",
      diagnosisCategory: "oncology",
      content: `EXPEDITED REVIEW
Cancer treatments often qualify for expedited (urgent) review with 72-hour turnaround.

STEP THERAPY EXCEPTIONS
Many states have laws allowing oncologists to bypass step therapy requirements for cancer treatments.

CLINICAL TRIAL COVERAGE
Insurance must cover routine costs for patients in clinical trials.

CONTINUITY OF CARE
Changing insurance mid-treatment? You may have rights to continue current treatment.

RESOURCES
- Cancer Legal Resource Center: 1-866-843-2572
- Patient Advocate Foundation: 1-800-532-5274
- American Cancer Society: 1-800-227-2345`,
    },
  ];
  for (const resource of resources) {
    db.insert(advocacyResources).values({
      id: uuidv4(),
      title: resource.title,
      description: resource.description,
      resourceType: resource.type,
      category: resource.category,
      diagnosisCategory: resource.diagnosisCategory || null,
      content: resource.content,
    }).run();
  }
  console.log(`Created ${resources.length} advocacy resources`);

  // Create Gold Card status for physicians
  db.insert(goldCardStatus).values({
    id: uuidv4(),
    physicianId: physicianId,
    insuranceProvider: "Blue Cross Blue Shield",
    approvalRate: 0.92,
    totalRequests: 25,
    approvedRequests: 23,
    isEligible: 1,
    eligibleSince: "2024-01-01",
    expiresAt: "2025-01-01",
    exemptTreatmentCodes: JSON.stringify(["70553", "70552", "74177"]),
    calculatedAt: new Date().toISOString(),
  }).run();
  db.insert(goldCardStatus).values({
    id: uuidv4(),
    physicianId: physicianId,
    insuranceProvider: "Aetna",
    approvalRate: 0.85,
    totalRequests: 20,
    approvedRequests: 17,
    isEligible: 0,
    calculatedAt: new Date().toISOString(),
  }).run();
  console.log("Created Gold Card status records");

  // Create a sample appeal for the denied PA
  db.insert(appeals).values({
    id: uuidv4(),
    paId: pa4Id,
    appealLevel: 1,
    status: "draft",
    appealReason: "Patient has documented completion of home exercise program since original submission",
    deadlineDate: "2024-04-09",
    createdAt: new Date().toISOString(),
  }).run();
  console.log("Created sample appeal");

  // Generate 10,000+ historical PA records
  console.log("Generating historical PA records (this may take a moment)...");
  const historicalRecords = generateHistoricalPAs(10500);
  
  // Batch insert for performance
  const batchSize = 500;
  for (let i = 0; i < historicalRecords.length; i += batchSize) {
    const batch = historicalRecords.slice(i, i + batchSize);
    for (const record of batch) {
      db.insert(historicalPAs).values(record).run();
    }
    if ((i + batchSize) % 2000 === 0) {
      console.log(`  Inserted ${Math.min(i + batchSize, historicalRecords.length)} historical records...`);
    }
  }
  console.log(`Created ${historicalRecords.length} historical PA records`);

  console.log("\n=== Seeding Complete! ===");
  console.log("\nDemo Accounts:");
  console.log("  Physician: dr.smith@demo.com");
  console.log("  Physician: dr.chen@demo.com");
  console.log("  Patient:   patient@demo.com");
  console.log("  Patient:   michael@demo.com");
  console.log("  Patient:   elena@demo.com");
  console.log("  Admin:     admin@demo.com");
  
  sqlite.close();
}

seed().catch(console.error);
