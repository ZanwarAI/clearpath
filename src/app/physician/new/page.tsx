"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Search, Sparkles, Check, AlertCircle, Loader2, Pill } from "lucide-react";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  insuranceProvider: string | null;
  insuranceId: string | null;
}

interface EhrData {
  diagnoses: Array<{ code: string; description: string }>;
  medications: Array<{ name: string; dose: string }>;
  medicalHistory: Array<{ condition: string }>;
}

interface TreatmentOption {
  code: string;
  name: string;
  category: string;
  source?: string;
}

interface MedicationFacts {
  title: string;
  indications: string;
  warnings: string;
  highlights: string[];
  source: string;
}

interface RiskScore {
  score: number;
  confidenceLow: number;
  confidenceHigh: number;
  positiveFactors: string[];
  negativeFactors: string[];
  improvementSuggestions: string[];
  historicalApprovalRate: number;
  estimatedProcessingDays: number;
}

const treatments: TreatmentOption[] = [
  { code: "J9271", name: "Pembrolizumab (Keytruda)", category: "Oncology", source: "Curated" },
  { code: "J9035", name: "Bevacizumab (Avastin)", category: "Oncology", source: "Curated" },
  { code: "J0135", name: "Adalimumab (Humira)", category: "Rheumatology", source: "Curated" },
  { code: "J1745", name: "Infliximab (Remicade)", category: "Rheumatology", source: "Curated" },
  { code: "70553", name: "MRI Brain with contrast", category: "Imaging", source: "Curated" },
  { code: "74177", name: "CT Abdomen/Pelvis", category: "Imaging", source: "Curated" },
  { code: "93458", name: "Cardiac Catheterization", category: "Cardiology", source: "Curated" },
  { code: "27447", name: "Total Knee Replacement", category: "Orthopedic", source: "Curated" },
  { code: "97110", name: "Physical Therapy", category: "Therapy", source: "Curated" },
];

export default function NewPAPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [ehrData, setEhrData] = useState<EhrData | null>(null);
  const [diagnosisQuery, setDiagnosisQuery] = useState("");
  const [diagnosisResults, setDiagnosisResults] = useState<Array<{ code: string; description: string }>>([]);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<{ code: string; description: string } | null>(null);
  const [treatmentQuery, setTreatmentQuery] = useState("");
  const [treatmentResults, setTreatmentResults] = useState<TreatmentOption[]>([]);
  const [treatmentLoading, setTreatmentLoading] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<TreatmentOption | null>(null);
  const [riskScore, setRiskScore] = useState<RiskScore | null>(null);
  const [aiNarrative, setAiNarrative] = useState("");
  const [narrativeStrength, setNarrativeStrength] = useState<number | null>(null);
  const [medicationFacts, setMedicationFacts] = useState<MedicationFacts | null>(null);
  const [factsLoading, setFactsLoading] = useState(false);
  const [physicianNotes, setPhysicianNotes] = useState("");
  const [generatingNarrative, setGeneratingNarrative] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/patients")
      .then((res) => res.json())
      .then((data) => setPatients(data.patients || []));
  }, []);

  useEffect(() => {
    if (patients.length === 0) return;
    let cancelled = false;

    const loadAvatars = async () => {
      const entries = await Promise.all(
        patients.map(async (patient) => {
          try {
            const res = await fetch(`/api/demo/avatar?seed=${encodeURIComponent(patient.id)}`);
            const data = await res.json();
            return [patient.id, data.url] as const;
          } catch {
            return [patient.id, ""] as const;
          }
        })
      );
      if (cancelled) return;
      setAvatarUrls((prev) => ({
        ...prev,
        ...Object.fromEntries(entries.filter(([, url]) => url)),
      }));
    };

    loadAvatars();
    return () => {
      cancelled = true;
    };
  }, [patients]);

  useEffect(() => {
    if (diagnosisQuery.trim().length < 2) {
      const handle = setTimeout(() => setDiagnosisResults([]), 0);
      return () => clearTimeout(handle);
    }

    const handle = setTimeout(async () => {
      setDiagnosisLoading(true);
      try {
        const res = await fetch(`/api/clinical/icd10?q=${encodeURIComponent(diagnosisQuery)}`);
        const data = await res.json();
        setDiagnosisResults(data.results || []);
      } catch {
        setDiagnosisResults([]);
      }
      setDiagnosisLoading(false);
    }, 300);

    return () => clearTimeout(handle);
  }, [diagnosisQuery]);

  useEffect(() => {
    if (treatmentQuery.trim().length < 2) {
      const handle = setTimeout(() => setTreatmentResults([]), 0);
      return () => clearTimeout(handle);
    }

    const handle = setTimeout(async () => {
      setTreatmentLoading(true);
      try {
        const res = await fetch(`/api/clinical/rxnorm?q=${encodeURIComponent(treatmentQuery)}`);
        const data = await res.json();
        const results = (data.results || []).map((item: { code: string; name: string }) => ({
          code: item.code,
          name: item.name,
          category: "Medication",
          source: "RxNorm",
        }));
        setTreatmentResults(results);
      } catch {
        setTreatmentResults([]);
      }
      setTreatmentLoading(false);
    }, 300);

    return () => clearTimeout(handle);
  }, [treatmentQuery]);

  useEffect(() => {
    if (!selectedTreatment) {
      const handle = setTimeout(() => {
        setMedicationFacts(null);
        setFactsLoading(false);
      }, 0);
      return () => clearTimeout(handle);
    }

    let cancelled = false;
    const loadFacts = async () => {
      const startHandle = setTimeout(() => setFactsLoading(true), 0);
      try {
        const res = await fetch(`/api/clinical/openfda?drug=${encodeURIComponent(selectedTreatment.name)}`);
        const data = await res.json();
        if (!cancelled) setMedicationFacts(data.facts || null);
      } catch {
        if (!cancelled) setMedicationFacts(null);
      }
      if (!cancelled) {
        setFactsLoading(false);
      }
      clearTimeout(startHandle);
    };

    loadFacts();
    return () => {
      cancelled = true;
    };
  }, [selectedTreatment]);

  const filteredPatients = patients.filter(
    (p) =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.insuranceId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const loadPatientData = async (patient: Patient) => {
    setSelectedPatient(patient);
    setLoading(true);
    const res = await fetch(`/api/patients/${patient.id}/ehr`);
    const data = await res.json();
    setEhrData(data.ehr || null);
    setStep(2);
    setLoading(false);
  };

  const calculateRisk = async () => {
    if (!selectedPatient || !selectedDiagnosis || !selectedTreatment) return;
    setLoading(true);
    const res = await fetch("/api/risk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        diagnosisCode: selectedDiagnosis.code,
        treatmentCode: selectedTreatment.code,
        insuranceProvider: selectedPatient.insuranceProvider,
        hasCompleteDocs: true,
        hasPriorTreatment: ehrData?.medicalHistory && ehrData.medicalHistory.length > 0,
      }),
    });
    const data = await res.json();
    setRiskScore(data);
    setStep(3);
    setLoading(false);
  };

  const generateNarrative = async () => {
    if (!selectedPatient || !selectedDiagnosis || !selectedTreatment || !ehrData) return;
    setGeneratingNarrative(true);
    const res = await fetch("/api/ai/narrative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient: selectedPatient,
        diagnosis: selectedDiagnosis,
        treatment: selectedTreatment,
        ehrData,
        riskScore,
      }),
    });
    const data = await res.json();
    setAiNarrative(data.narrative);
    setNarrativeStrength(data.strengthScore);
    setGeneratingNarrative(false);
  };

  const submitPA = async () => {
    if (!selectedPatient || !selectedDiagnosis || !selectedTreatment || !riskScore) return;
    setSubmitting(true);
    const res = await fetch("/api/pa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: selectedPatient.id,
        diagnosisCode: selectedDiagnosis.code,
        diagnosisDescription: selectedDiagnosis.description,
        treatmentCode: selectedTreatment.code,
        treatmentName: selectedTreatment.name,
        riskScore: riskScore.score,
        riskScoreConfidenceLow: riskScore.confidenceLow,
        riskScoreConfidenceHigh: riskScore.confidenceHigh,
        riskFactorsPositive: riskScore.positiveFactors,
        riskFactorsNegative: riskScore.negativeFactors,
        riskImprovementSuggestions: riskScore.improvementSuggestions,
        historicalApprovalRate: riskScore.historicalApprovalRate,
        estimatedCompletionDays: riskScore.estimatedProcessingDays,
        physicianNotes,
        aiNarrative,
        aiNarrativeStrength: narrativeStrength,
      }),
    });
    const data = await res.json();
    if (data.id) router.push(`/physician/pa/${data.id}`);
    setSubmitting(false);
  };

  const riskColor = (score: number) => score >= 75 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-600";
  const progressColor = (score: number) => score >= 75 ? "[&>div]:bg-emerald-500" : score >= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/physician" className="flex items-center gap-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            Step {step} of 3
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Step 1: Patient Selection */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-1">Select Patient</h1>
            <p className="text-slate-500 mb-6">Search for the patient who needs authorization</p>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search by name or insurance ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
            
            <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
              {filteredPatients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => loadPatientData(patient)}
                  disabled={loading}
                  className="w-full text-left p-4 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {avatarUrls[patient.id] ? (
                        <Image
                          src={avatarUrls[patient.id]}
                          alt={`${patient.firstName} ${patient.lastName}`}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500">
                          {patient.firstName[0]}{patient.lastName[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-slate-900">{patient.firstName} {patient.lastName}</p>
                        <p className="text-sm text-slate-500">DOB: {patient.dateOfBirth}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-900">{patient.insuranceProvider}</p>
                      <p className="text-xs text-slate-500">{patient.insuranceId}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Diagnosis & Treatment */}
        {step === 2 && selectedPatient && (
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-1">Select Treatment</h1>
            <p className="text-slate-500 mb-6">
              Patient: {selectedPatient.firstName} {selectedPatient.lastName} &middot; {selectedPatient.insuranceProvider}
            </p>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-slate-900 mb-3 block">Diagnosis</label>
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search ICD-10 codes..."
                      value={diagnosisQuery}
                      onChange={(e) => setDiagnosisQuery(e.target.value)}
                      className="pl-10 bg-white"
                    />
                  </div>
                  {diagnosisLoading && (
                    <p className="text-xs text-slate-400 mt-2">Searching ICD-10...</p>
                  )}
                </div>

                <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                  {(diagnosisQuery.trim().length >= 2 ? diagnosisResults : ehrData?.diagnoses || []).map((diag, i) => (
                    <button
                      key={`${diag.code}-${i}`}
                      onClick={() => setSelectedDiagnosis(diag)}
                      className={`w-full text-left p-4 transition-colors ${
                        selectedDiagnosis?.code === diag.code ? "bg-slate-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{diag.code}</p>
                          <p className="text-sm text-slate-500">{diag.description}</p>
                        </div>
                        {selectedDiagnosis?.code === diag.code && (
                          <Check className="w-5 h-5 text-slate-900" />
                        )}
                      </div>
                    </button>
                  ))}
                  {(diagnosisQuery.trim().length >= 2 && diagnosisResults.length === 0) && (
                    <div className="p-4 text-sm text-slate-500">No ICD-10 matches. Try a different term.</div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-900 mb-3 block">Treatment</label>
                <div className="mb-3">
                  <div className="relative">
                    <Pill className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search medications (RxNorm)..."
                      value={treatmentQuery}
                      onChange={(e) => setTreatmentQuery(e.target.value)}
                      className="pl-10 bg-white"
                    />
                  </div>
                  {treatmentLoading && (
                    <p className="text-xs text-slate-400 mt-2">Searching RxNorm...</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {(treatmentQuery.trim().length >= 2 ? treatmentResults : treatments).map((treatment) => (
                    <button
                      key={`${treatment.code}-${treatment.source || "curated"}`}
                      onClick={() => setSelectedTreatment(treatment)}
                      className={`text-left p-4 rounded-lg border transition-colors ${
                        selectedTreatment?.code === treatment.code
                          ? "border-slate-900 bg-slate-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{treatment.name}</p>
                          <p className="text-sm text-slate-500">
                            {treatment.code} &middot; {treatment.category}
                            {treatment.source ? ` · ${treatment.source}` : ""}
                          </p>
                        </div>
                        {selectedTreatment?.code === treatment.code && (
                          <Check className="w-5 h-5 text-slate-900" />
                        )}
                      </div>
                    </button>
                  ))}
                  {(treatmentQuery.trim().length >= 2 && treatmentResults.length === 0) && (
                    <div className="p-4 text-sm text-slate-500">No RxNorm matches. Try a different medication.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button 
                onClick={calculateRisk}
                disabled={!selectedDiagnosis || !selectedTreatment || loading}
                className="bg-slate-900 hover:bg-slate-800"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Risk Score & Submit */}
        {step === 3 && riskScore && (
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-1">Review & Submit</h1>
            <p className="text-slate-500 mb-6">Review the risk analysis and submit your request</p>

            {/* Risk Score */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium text-slate-900">Approval Likelihood</h2>
                <span className={`text-3xl font-semibold ${riskColor(riskScore.score)}`}>
                  {riskScore.score}%
                </span>
              </div>
              <Progress value={riskScore.score} className={`h-2 mb-4 ${progressColor(riskScore.score)}`} />
              
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                {riskScore.positiveFactors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Positive Factors</p>
                    <ul className="space-y-1">
                      {riskScore.positiveFactors.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {riskScore.negativeFactors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Risk Factors</p>
                    <ul className="space-y-1">
                      {riskScore.negativeFactors.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {riskScore.improvementSuggestions.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Suggestions</p>
                  <ul className="space-y-1">
                    {riskScore.improvementSuggestions.map((s, i) => (
                      <li key={i} className="text-sm text-slate-600">• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Medication Facts */}
            {selectedTreatment && (
              <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-medium text-slate-900">Medication Facts</h2>
                    <p className="text-xs text-slate-500">Source: OpenFDA label data</p>
                  </div>
                  {factsLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                </div>
                {medicationFacts ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Indications</p>
                      <p className="text-sm text-slate-600 mt-1">{medicationFacts.indications}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Warnings</p>
                      <p className="text-sm text-slate-600 mt-1">{medicationFacts.warnings}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Highlights</p>
                      <ul className="mt-2 space-y-1">
                        {medicationFacts.highlights.map((highlight, i) => (
                          <li key={i} className="text-sm text-slate-600">• {highlight}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Loading medication facts...</p>
                )}
              </div>
            )}

            {/* AI Narrative */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium text-slate-900">Medical Necessity Narrative</h2>
                {narrativeStrength && (
                  <span className="text-sm text-slate-500">Strength: {narrativeStrength}%</span>
                )}
              </div>
              {!aiNarrative ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 mb-4">Generate an AI-powered medical necessity statement</p>
                  <Button onClick={generateNarrative} disabled={generatingNarrative} variant="outline">
                    {generatingNarrative ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" />Generate Narrative</>
                    )}
                  </Button>
                </div>
              ) : (
                <Textarea
                  value={aiNarrative}
                  onChange={(e) => setAiNarrative(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
              )}
            </div>

            {/* Physician Notes */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
              <h2 className="font-medium text-slate-900 mb-4">Additional Notes</h2>
              <Textarea
                placeholder="Add any additional clinical notes..."
                value={physicianNotes}
                onChange={(e) => setPhysicianNotes(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={submitPA} disabled={submitting} className="bg-slate-900 hover:bg-slate-800">
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : "Submit PA Request"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
