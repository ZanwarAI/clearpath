import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getLoggedInUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { priorAuthorizations, patients, documents } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Sparkles,
  User,
  Clock,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PhysicianPADetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getLoggedInUser();

  if (!user || user.role !== "physician") {
    redirect("/login");
  }

  const pa = db
    .select()
    .from(priorAuthorizations)
    .where(eq(priorAuthorizations.id, id))
    .get();

  if (!pa) {
    notFound();
  }

  const patient = pa.patientId
    ? db.select().from(patients).where(eq(patients.id, pa.patientId)).get()
    : null;

  const paDocuments = db
    .select()
    .from(documents)
    .where(eq(documents.paId, pa.id))
    .all();

  const positiveFactors = pa.riskFactorsPositive
    ? JSON.parse(pa.riskFactorsPositive)
    : [];
  const negativeFactors = pa.riskFactorsNegative
    ? JSON.parse(pa.riskFactorsNegative)
    : [];
  const improvementSuggestions = pa.riskImprovementSuggestions
    ? JSON.parse(pa.riskImprovementSuggestions)
    : [];

  const getStatusBadge = () => {
    if (pa.status === "complete") {
      if (pa.statusDetail === "approved") {
        return <Badge className="bg-green-100 text-green-700 text-base px-4 py-1">Approved</Badge>;
      } else {
        return <Badge className="bg-red-100 text-red-700 text-base px-4 py-1">Denied</Badge>;
      }
    } else if (pa.status === "under_review") {
      return <Badge className="bg-yellow-100 text-yellow-700 text-base px-4 py-1">Under Review</Badge>;
    } else if (pa.status === "submitted") {
      return <Badge className="bg-blue-100 text-blue-700 text-base px-4 py-1">Submitted</Badge>;
    } else {
      return <Badge className="bg-gray-100 text-gray-700 text-base px-4 py-1">Draft</Badge>;
    }
  };

  const getRiskColor = (score: number | null) => {
    if (!score) return "text-gray-500";
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressColor = (score: number | null) => {
    if (!score) return "";
    if (score >= 75) return "[&>div]:bg-green-500";
    if (score >= 50) return "[&>div]:bg-yellow-500";
    return "[&>div]:bg-red-500";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/physician">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{pa.treatmentName}</h1>
              <div className="flex items-center gap-4 mt-2">
                {getStatusBadge()}
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  Submitted: {pa.submittedAt ? new Date(pa.submittedAt).toLocaleDateString() : "Not submitted"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main content - 2 columns */}
          <div className="md:col-span-2 space-y-6">
            {/* Risk Score Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Risk Stratification Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 mb-6">
                  <div className="flex-1">
                    <Progress
                      value={pa.riskScore ?? 0}
                      className={`h-4 ${getProgressColor(pa.riskScore)}`}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Confidence range: {pa.riskScoreConfidenceLow ?? 0}% - {pa.riskScoreConfidenceHigh ?? 0}%
                    </p>
                  </div>
                  <div className="text-center">
                    <span className={`text-4xl font-bold ${getRiskColor(pa.riskScore)}`}>
                      {pa.riskScore ?? 0}%
                    </span>
                    <p className="text-sm text-gray-500">Approval Likelihood</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-green-700 flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4" />
                      Positive Factors
                    </h4>
                    <ul className="space-y-1">
                      {positiveFactors.map((factor: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{factor}</span>
                        </li>
                      ))}
                      {positiveFactors.length === 0 && (
                        <li className="text-sm text-gray-500">No positive factors</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-red-700 flex items-center gap-2 mb-2">
                      <TrendingDown className="w-4 h-4" />
                      Risk Factors
                    </h4>
                    <ul className="space-y-1">
                      {negativeFactors.map((factor: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span>{factor}</span>
                        </li>
                      ))}
                      {negativeFactors.length === 0 && (
                        <li className="text-sm text-gray-500">No risk factors</li>
                      )}
                    </ul>
                  </div>
                </div>

                {improvementSuggestions.length > 0 && (
                  <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium text-yellow-800 flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4" />
                      Improvement Suggestions
                    </h4>
                    <ul className="space-y-1">
                      {improvementSuggestions.map((s: string, i: number) => (
                        <li key={i} className="text-sm text-yellow-700">• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t flex gap-6 text-sm text-gray-500">
                  <span>
                    Historical approval rate: <strong>{Math.round((pa.historicalApprovalRate || 0) * 100)}%</strong>
                  </span>
                  <span>
                    Est. processing: <strong>{pa.estimatedCompletionDays || "N/A"} days</strong>
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* AI Narrative */}
            {pa.aiNarrative && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    AI-Generated Narrative
                    {pa.aiNarrativeStrength && (
                      <Badge className="bg-purple-100 text-purple-700 ml-2">
                        Strength: {pa.aiNarrativeStrength}%
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm font-sans text-gray-700 bg-gray-50 p-4 rounded-lg">
                    {pa.aiNarrative}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Physician Notes */}
            {pa.physicianNotes && (
              <Card>
                <CardHeader>
                  <CardTitle>Physician Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{pa.physicianNotes}</p>
                </CardContent>
              </Card>
            )}

            {/* Denial Reason */}
            {pa.denialReason && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-700 flex items-center gap-2">
                    <XCircle className="w-5 h-5" />
                    Denial Reason
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{pa.denialReason}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Patient Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Patient
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient ? (
                  <div className="space-y-2">
                    <p className="font-medium">{patient.firstName} {patient.lastName}</p>
                    <p className="text-sm text-gray-500">DOB: {patient.dateOfBirth}</p>
                    <p className="text-sm text-gray-500">{patient.insuranceProvider}</p>
                    <p className="text-sm text-gray-500">{patient.insuranceId}</p>
                  </div>
                ) : (
                  <p className="text-gray-500">Patient not found</p>
                )}
              </CardContent>
            </Card>

            {/* Treatment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Treatment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-gray-500">Treatment Code</dt>
                    <dd className="font-medium">{pa.treatmentCode}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Diagnosis Code</dt>
                    <dd className="font-medium">{pa.diagnosisCode}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Diagnosis</dt>
                    <dd className="font-medium">{pa.diagnosisDescription}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                    <div>
                      <p className="font-medium text-sm">Submitted</p>
                      <p className="text-xs text-gray-500">
                        {pa.submittedAt ? new Date(pa.submittedAt).toLocaleString() : "Pending"}
                      </p>
                    </div>
                  </div>
                  {pa.status !== "submitted" && pa.status !== "draft" && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2" />
                      <div>
                        <p className="font-medium text-sm">Under Review</p>
                        <p className="text-xs text-gray-500">Processing</p>
                      </div>
                    </div>
                  )}
                  {pa.status === "complete" && (
                    <div className="flex gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${pa.statusDetail === "approved" ? "bg-green-500" : "bg-red-500"}`} />
                      <div>
                        <p className="font-medium text-sm">
                          {pa.statusDetail === "approved" ? "Approved" : "Denied"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {pa.decisionAt ? new Date(pa.decisionAt).toLocaleString() : ""}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documents ({paDocuments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paDocuments.length === 0 ? (
                  <p className="text-sm text-gray-500">No documents attached</p>
                ) : (
                  <ul className="space-y-2">
                    {paDocuments.map((doc) => (
                      <li key={doc.id} className="flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span>{doc.fileName}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
