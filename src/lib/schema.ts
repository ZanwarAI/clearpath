import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Users table with roles (patient, physician, admin)
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull(), // 'patient' | 'physician' | 'admin'
  organization: text("organization"),
  createdAt: text("created_at"),
});

export const patients = sqliteTable("patients", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  email: text("email").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  insuranceProvider: text("insurance_provider"),
  insuranceId: text("insurance_id"),
  gender: text("gender"),
  address: text("address"),
  phone: text("phone"),
});

// EHR Records (simplified JSON blob per patient)
export const ehrRecords = sqliteTable("ehr_records", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").references(() => patients.id),
  diagnoses: text("diagnoses"), // JSON array of ICD-10 codes with descriptions
  medications: text("medications"), // JSON array of current medications
  allergies: text("allergies"), // JSON array
  labResults: text("lab_results"), // JSON array of recent lab results
  vitalSigns: text("vital_signs"), // JSON object with recent vitals
  medicalHistory: text("medical_history"), // JSON array of past conditions/procedures
  updatedAt: text("updated_at"),
});

export const priorAuthorizations = sqliteTable("prior_authorizations", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").references(() => patients.id),
  physicianId: text("physician_id").references(() => users.id),
  submittedByUserId: text("submitted_by_user_id").references(() => users.id),
  treatmentName: text("treatment_name").notNull(),
  treatmentCode: text("treatment_code"),
  diagnosisCode: text("diagnosis_code"),
  diagnosisDescription: text("diagnosis_description"),
  status: text("status").notNull(), // 'draft' | 'submitted' | 'under_review' | 'decision' | 'complete'
  statusDetail: text("status_detail"), // 'approved' | 'denied' | null
  riskScore: integer("risk_score"),
  riskScoreConfidenceLow: integer("risk_score_confidence_low"),
  riskScoreConfidenceHigh: integer("risk_score_confidence_high"),
  riskFactorsPositive: text("risk_factors_positive"), // JSON array
  riskFactorsNegative: text("risk_factors_negative"), // JSON array
  riskImprovementSuggestions: text("risk_improvement_suggestions"), // JSON array
  historicalApprovalRate: real("historical_approval_rate"),
  physicianNotes: text("physician_notes"),
  aiNarrative: text("ai_narrative"), // LLM-generated medical necessity narrative
  aiNarrativeStrength: integer("ai_narrative_strength"), // 0-100 strength score
  aiAutofillData: text("ai_autofill_data"), // JSON of AI-suggested autofill values
  denialReason: text("denial_reason"),
  estimatedCompletionDays: integer("estimated_completion_days"),
  submittedAt: text("submitted_at"),
  decisionAt: text("decision_at"),
  updatedAt: text("updated_at"),
});

// Historical PA records for analytics and risk scoring (10,000+ synthetic records)
export const historicalPAs = sqliteTable("historical_pas", {
  id: text("id").primaryKey(),
  diagnosisCode: text("diagnosis_code").notNull(),
  diagnosisCategory: text("diagnosis_category"), // e.g., 'oncology', 'cardiology', 'orthopedic'
  treatmentCode: text("treatment_code").notNull(),
  treatmentCategory: text("treatment_category"), // e.g., 'medication', 'procedure', 'imaging'
  insuranceProvider: text("insurance_provider").notNull(),
  patientAge: integer("patient_age"),
  patientGender: text("patient_gender"),
  outcome: text("outcome").notNull(), // 'approved' | 'denied'
  denialReason: text("denial_reason"),
  processingDays: integer("processing_days"),
  hadPriorTreatment: integer("had_prior_treatment"), // 0 or 1
  documentationComplete: integer("documentation_complete"), // 0 or 1
  urgencyLevel: text("urgency_level"), // 'routine' | 'urgent' | 'emergent'
  year: integer("year"),
  month: integer("month"),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  paId: text("pa_id").references(() => priorAuthorizations.id),
  fileName: text("file_name").notNull(),
  fileType: text("file_type"),
  uploadedAt: text("uploaded_at"),
  uploadedBy: text("uploaded_by").references(() => users.id),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  paId: text("pa_id").references(() => priorAuthorizations.id),
  patientId: text("patient_id").references(() => patients.id),
  senderId: text("sender_id").references(() => users.id),
  senderRole: text("sender_role"), // 'patient' | 'physician' | 'admin'
  content: text("content").notNull(),
  sentAt: text("sent_at"),
});

// Notifications for status changes
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  patientId: text("patient_id").references(() => patients.id),
  paId: text("pa_id").references(() => priorAuthorizations.id),
  type: text("type").notNull(), // 'status_change' | 'document_request' | 'message' | 'decision'
  title: text("title").notNull(),
  message: text("message").notNull(),
  channel: text("channel"), // 'email' | 'sms' | 'in_app'
  read: integer("read").default(0), // 0 = unread, 1 = read
  sentAt: text("sent_at"),
  createdAt: text("created_at"),
});

// Insurance providers with their typical approval patterns
export const insuranceProviders = sqliteTable("insurance_providers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  avgApprovalRate: real("avg_approval_rate"),
  avgProcessingDays: integer("avg_processing_days"),
  requiresPriorAuth: text("requires_prior_auth"), // JSON array of treatment codes
  commonDenialReasons: text("common_denial_reasons"), // JSON array
  documentChecklist: text("document_checklist"), // JSON array of required docs by treatment type
  p2pPhoneNumber: text("p2p_phone_number"),
  p2pHours: text("p2p_hours"),
  appealDeadlineDays: integer("appeal_deadline_days"),
  goldCardThreshold: real("gold_card_threshold"), // e.g., 0.90 for 90%
});

// Appeals for denied PAs
export const appeals = sqliteTable("appeals", {
  id: text("id").primaryKey(),
  paId: text("pa_id").references(() => priorAuthorizations.id),
  appealLevel: integer("appeal_level").notNull(), // 1 = internal, 2 = external, 3 = state
  status: text("status").notNull(), // 'draft' | 'submitted' | 'under_review' | 'approved' | 'denied' | 'escalated'
  appealReason: text("appeal_reason"),
  additionalEvidence: text("additional_evidence"), // JSON array of new evidence/docs
  appealNarrative: text("appeal_narrative"), // AI-generated or physician-written appeal letter
  p2pScheduled: integer("p2p_scheduled"), // 0 or 1
  p2pDate: text("p2p_date"),
  p2pNotes: text("p2p_notes"),
  reviewerName: text("reviewer_name"),
  reviewerSpecialty: text("reviewer_specialty"),
  outcome: text("outcome"), // 'overturned' | 'upheld' | null
  outcomeReason: text("outcome_reason"),
  deadlineDate: text("deadline_date"),
  submittedAt: text("submitted_at"),
  decidedAt: text("decided_at"),
  createdAt: text("created_at"),
});

// Gold Card tracking for physicians
export const goldCardStatus = sqliteTable("gold_card_status", {
  id: text("id").primaryKey(),
  physicianId: text("physician_id").references(() => users.id),
  insuranceProvider: text("insurance_provider").notNull(),
  approvalRate: real("approval_rate"),
  totalRequests: integer("total_requests"),
  approvedRequests: integer("approved_requests"),
  isEligible: integer("is_eligible"), // 0 or 1
  eligibleSince: text("eligible_since"),
  expiresAt: text("expires_at"),
  exemptTreatmentCodes: text("exempt_treatment_codes"), // JSON array
  calculatedAt: text("calculated_at"),
});

// Peer-to-peer review scheduling
export const p2pReviews = sqliteTable("p2p_reviews", {
  id: text("id").primaryKey(),
  paId: text("pa_id").references(() => priorAuthorizations.id),
  appealId: text("appeal_id").references(() => appeals.id),
  physicianId: text("physician_id").references(() => users.id),
  scheduledDate: text("scheduled_date"),
  scheduledTime: text("scheduled_time"),
  duration: integer("duration"), // minutes
  phoneNumber: text("phone_number"),
  conferenceLink: text("conference_link"),
  insurerReviewerName: text("insurer_reviewer_name"),
  insurerReviewerSpecialty: text("insurer_reviewer_specialty"),
  status: text("status"), // 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  prepNotes: text("prep_notes"), // talking points for the call
  outcome: text("outcome"), // 'approved' | 'denied' | 'pending_decision'
  callNotes: text("call_notes"),
  createdAt: text("created_at"),
});

// Treatment alternatives (when original is denied)
export const treatmentAlternatives = sqliteTable("treatment_alternatives", {
  id: text("id").primaryKey(),
  originalTreatmentCode: text("original_treatment_code").notNull(),
  alternativeTreatmentCode: text("alternative_treatment_code").notNull(),
  alternativeName: text("alternative_name").notNull(),
  reason: text("reason"), // e.g., 'step therapy', 'lower cost', 'formulary'
  estimatedCost: real("estimated_cost"),
  approvalLikelihood: real("approval_likelihood"),
  clinicalNotes: text("clinical_notes"),
});

// Payer-specific document requirements
export const payerRequirements = sqliteTable("payer_requirements", {
  id: text("id").primaryKey(),
  insuranceProvider: text("insurance_provider").notNull(),
  treatmentCode: text("treatment_code"),
  treatmentCategory: text("treatment_category"),
  diagnosisCategory: text("diagnosis_category"),
  requiredDocuments: text("required_documents"), // JSON array
  stepTherapyRequired: integer("step_therapy_required"), // 0 or 1
  stepTherapyDrugs: text("step_therapy_drugs"), // JSON array of required prior meds
  clinicalCriteria: text("clinical_criteria"), // JSON array of required criteria
  commonPitfalls: text("common_pitfalls"), // JSON array of things that cause denials
  tips: text("tips"), // JSON array of approval tips
});

// Patient advocacy resources
export const advocacyResources = sqliteTable("advocacy_resources", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  resourceType: text("resource_type"), // 'article' | 'video' | 'template' | 'contact' | 'organization'
  url: text("url"),
  phone: text("phone"),
  category: text("category"), // 'appeals' | 'rights' | 'financial_assistance' | 'legal'
  diagnosisCategory: text("diagnosis_category"), // optional filter
  insuranceProvider: text("insurance_provider"), // optional filter
  content: text("content"), // for articles/templates
});

// Type exports
export type User = typeof users.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type EhrRecord = typeof ehrRecords.$inferSelect;
export type PriorAuthorization = typeof priorAuthorizations.$inferSelect;
export type HistoricalPA = typeof historicalPAs.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type InsuranceProvider = typeof insuranceProviders.$inferSelect;
export type Appeal = typeof appeals.$inferSelect;
export type GoldCardStatus = typeof goldCardStatus.$inferSelect;
export type P2PReview = typeof p2pReviews.$inferSelect;
export type TreatmentAlternative = typeof treatmentAlternatives.$inferSelect;
export type PayerRequirement = typeof payerRequirements.$inferSelect;
export type AdvocacyResource = typeof advocacyResources.$inferSelect;
