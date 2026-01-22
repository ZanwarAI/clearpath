"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
} from "lucide-react";

interface PA {
  id: string;
  patientId: string;
  treatmentName: string;
  treatmentCode: string;
  diagnosisCode: string;
  diagnosisDescription: string;
  denialReason: string | null;
  riskScore: number | null;
  aiNarrative: string | null;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  insuranceProvider: string | null;
}

const appealLevels = [
  { level: 1, name: "Internal Appeal", description: "First-level review by the insurance company" },
  { level: 2, name: "External Review", description: "Independent third-party review" },
  { level: 3, name: "State Appeal", description: "Appeal through state insurance commissioner" },
];

const appealReasons = [
  "Medical necessity not properly considered",
  "Additional clinical evidence available",
  "Denial based on incomplete information",
  "Treatment meets established guidelines",
  "Prior authorization requirements not applicable",
  "Step therapy exception applies",
  "Other (specify in narrative)",
];

export default function NewAppealPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paId = searchParams.get("paId");

  const [loading, setLoading] = useState(!!paId);
  const [pa, setPa] = useState<PA | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [appealNarrative, setAppealNarrative] = useState("");
  const [generatingNarrative, setGeneratingNarrative] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(!paId ? "No PA ID provided" : null);

  useEffect(() => {
    if (!paId) {
      return;
    }

    // Fetch PA details
    fetch(`/api/pa/${paId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setPa(data.pa);
          setPatient(data.patient);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load PA details");
        setLoading(false);
      });
  }, [paId]);

  const generateAppealNarrative = async () => {
    if (!pa || !patient) return;

    setGeneratingNarrative(true);
    try {
      const res = await fetch("/api/ai/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient: {
            firstName: patient.firstName,
            lastName: patient.lastName,
            dateOfBirth: "1980-01-01", // Placeholder
            insuranceProvider: patient.insuranceProvider,
          },
          diagnosis: {
            code: pa.diagnosisCode,
            description: pa.diagnosisDescription,
          },
          treatment: {
            code: pa.treatmentCode,
            name: pa.treatmentName,
          },
          ehrData: {},
          riskScore: { score: pa.riskScore },
          isAppeal: true,
          denialReason: pa.denialReason,
          appealReason: selectedReason,
        }),
      });
      const data = await res.json();

      // Modify the narrative for appeal context
      const appealPrefix = `APPEAL LETTER - ${appealLevels.find((l) => l.level === selectedLevel)?.name}\n\nDenial Reference: PA ID ${pa.id}\nReason for Appeal: ${selectedReason}\nOriginal Denial Reason: ${pa.denialReason || "Not specified"}\n\n---\n\n`;

      setAppealNarrative(appealPrefix + data.narrative);
    } catch {
      setError("Failed to generate narrative");
    }
    setGeneratingNarrative(false);
  };

  const submitAppeal = async () => {
    if (!pa || !selectedReason) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paId: pa.id,
          appealLevel: selectedLevel,
          appealReason: selectedReason,
          appealNarrative,
          additionalEvidence: [],
        }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        router.push(`/physician/appeals/${data.id}`);
      }
    } catch {
      setError("Failed to submit appeal");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error && !pa) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-3xl mx-auto px-6 h-16 flex items-center">
            <Link
              href="/physician"
              className="flex items-center gap-2 text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </Link>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-700">{error}</p>
            <Link href="/physician">
              <Button variant="outline" className="mt-4">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/physician"
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </Link>
          <span className="text-sm text-slate-500">New Appeal</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">
          File an Appeal
        </h1>
        <p className="text-slate-500 mb-6">
          Appeal the denial for {pa?.treatmentName}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* PA Summary */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <h2 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Prior Authorization Details
          </h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Treatment</p>
              <p className="font-medium">{pa?.treatmentName}</p>
            </div>
            <div>
              <p className="text-slate-500">Treatment Code</p>
              <p className="font-medium">{pa?.treatmentCode}</p>
            </div>
            <div>
              <p className="text-slate-500">Diagnosis</p>
              <p className="font-medium">{pa?.diagnosisDescription}</p>
            </div>
            <div>
              <p className="text-slate-500">Diagnosis Code</p>
              <p className="font-medium">{pa?.diagnosisCode}</p>
            </div>
            <div>
              <p className="text-slate-500">Patient</p>
              <p className="font-medium">
                {patient?.firstName} {patient?.lastName}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Insurance</p>
              <p className="font-medium">{patient?.insuranceProvider}</p>
            </div>
          </div>
          {pa?.denialReason && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg">
              <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-1">
                Denial Reason
              </p>
              <p className="text-red-700">{pa.denialReason}</p>
            </div>
          )}
          {pa?.riskScore && (
            <div className="mt-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Original Risk Score
              </p>
              <Progress value={pa.riskScore} className="h-2" />
              <p className="text-sm text-slate-500 mt-1">
                {pa.riskScore}% approval likelihood
              </p>
            </div>
          )}
        </div>

        {/* Appeal Level Selection */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <h2 className="font-medium text-slate-900 mb-4">Appeal Level</h2>
          <div className="space-y-3">
            {appealLevels.map((level) => (
              <button
                key={level.level}
                onClick={() => setSelectedLevel(level.level)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selectedLevel === level.level
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      Level {level.level}: {level.name}
                    </p>
                    <p className="text-sm text-slate-500">{level.description}</p>
                  </div>
                  {selectedLevel === level.level && (
                    <CheckCircle2 className="w-5 h-5 text-slate-900" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Appeal Reason Selection */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <h2 className="font-medium text-slate-900 mb-4">Reason for Appeal</h2>
          <div className="space-y-2">
            {appealReasons.map((reason) => (
              <button
                key={reason}
                onClick={() => setSelectedReason(reason)}
                className={`w-full text-left p-3 rounded-lg border transition-colors text-sm ${
                  selectedReason === reason
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{reason}</span>
                  {selectedReason === reason && (
                    <CheckCircle2 className="w-4 h-4 text-slate-900" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Appeal Narrative */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-slate-900">Appeal Letter</h2>
          </div>
          {!appealNarrative ? (
            <div className="text-center py-8">
              <p className="text-slate-500 mb-4">
                Generate an AI-powered appeal letter based on the denial reason
              </p>
              <Button
                onClick={generateAppealNarrative}
                disabled={generatingNarrative || !selectedReason}
                variant="outline"
              >
                {generatingNarrative ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Appeal Letter
                  </>
                )}
              </Button>
              {!selectedReason && (
                <p className="text-xs text-slate-400 mt-2">
                  Select a reason for appeal first
                </p>
              )}
            </div>
          ) : (
            <Textarea
              value={appealNarrative}
              onChange={(e) => setAppealNarrative(e.target.value)}
              rows={15}
              className="font-mono text-sm"
            />
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-between">
          <Link href="/physician">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button
            onClick={submitAppeal}
            disabled={submitting || !selectedReason}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Appeal"
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
