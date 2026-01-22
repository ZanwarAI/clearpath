import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getLoggedInPatient } from "@/lib/auth";
import { db } from "@/lib/db";
import { priorAuthorizations, documents, historicalPAs } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { DocumentUpload } from "@/components/DocumentUpload";
import { MessageForm } from "@/components/MessageForm";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, FileText, Check, Clock, AlertCircle, X } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PADetailPage({ params }: PageProps) {
  const { id } = await params;
  const patient = await getLoggedInPatient();

  if (!patient) redirect("/login");

  const pa = db.select().from(priorAuthorizations).where(eq(priorAuthorizations.id, id)).get();

  if (!pa || pa.patientId !== patient.id) notFound();

  const paDocuments = db.select().from(documents).where(eq(documents.paId, pa.id)).all();

  const insurerAvgTime = db
    .select({
      avgDays: sql<number>`round(avg(processing_days), 0)`,
      minDays: sql<number>`min(processing_days)`,
      maxDays: sql<number>`max(processing_days)`,
    })
    .from(historicalPAs)
    .where(
      and(
        eq(historicalPAs.insuranceProvider, patient.insuranceProvider || ""),
        eq(historicalPAs.treatmentCode, pa.treatmentCode || "")
      )
    )
    .get();

  const positiveFactors = pa.riskFactorsPositive ? JSON.parse(pa.riskFactorsPositive) : [];
  const negativeFactors = pa.riskFactorsNegative ? JSON.parse(pa.riskFactorsNegative) : [];

  const estimatedDays = pa.estimatedCompletionDays || insurerAvgTime?.avgDays || 12;
  const submittedTimestamp = pa.submittedAt ? new Date(pa.submittedAt).getTime() : new Date().getTime();
  const estimatedCompletionDate = new Date(submittedTimestamp + estimatedDays * 24 * 60 * 60 * 1000);

  const riskColor = (pa.riskScore ?? 0) >= 75 ? "text-emerald-600" : (pa.riskScore ?? 0) >= 50 ? "text-amber-600" : "text-red-600";
  const progressColor = (pa.riskScore ?? 0) >= 75 ? "[&>div]:bg-emerald-500" : (pa.riskScore ?? 0) >= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500";

  const getStatusStyle = (status: string, detail: string | null) => {
    if (status === "complete" && detail === "approved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "complete" && detail === "denied") return "bg-red-50 text-red-700 border-red-200";
    if (status === "under_review") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const getStatusText = (status: string, detail: string | null) => {
    if (status === "complete" && detail === "approved") return "Approved";
    if (status === "complete" && detail === "denied") return "Denied";
    if (status === "under_review") return "Under Review";
    return "Submitted";
  };

  const steps = [
    { key: "submitted", label: "Submitted", done: true },
    { key: "under_review", label: "Under Review", done: pa.status === "under_review" || pa.status === "complete" },
    { key: "complete", label: "Decision", done: pa.status === "complete" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{pa.treatmentName}</h1>
              <p className="text-slate-500 mt-1">{pa.diagnosisCode} &middot; {pa.diagnosisDescription}</p>
            </div>
            <span className={`text-sm font-medium px-3 py-1.5 rounded-full border ${getStatusStyle(pa.status, pa.statusDetail)}`}>
              {getStatusText(pa.status, pa.statusDetail)}
            </span>
          </div>
        </div>

        {/* Progress Timeline */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, i) => (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step.done ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400"
                  }`}>
                    {step.done ? <Check className="w-4 h-4" /> : <span className="text-sm">{i + 1}</span>}
                  </div>
                  <span className={`text-xs mt-2 ${step.done ? "text-slate-900 font-medium" : "text-slate-400"}`}>
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${step.done ? "bg-slate-900" : "bg-slate-200"}`} />
                )}
              </div>
            ))}
          </div>
          {(pa.status === "submitted" || pa.status === "under_review") && (
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-sm text-slate-500">
              <Clock className="w-4 h-4" />
              <span>Estimated completion: {estimatedCompletionDate.toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Approval Likelihood */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="font-medium text-slate-900 mb-4">Approval Likelihood</h2>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <Progress value={pa.riskScore ?? 0} className={`h-2 ${progressColor}`} />
              </div>
              <span className={`text-2xl font-semibold ${riskColor}`}>{pa.riskScore ?? 0}%</span>
            </div>
            {positiveFactors.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">In your favor</p>
                <ul className="space-y-1">
                  {positiveFactors.slice(0, 3).map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {negativeFactors.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Concerns</p>
                <ul className="space-y-1">
                  {negativeFactors.slice(0, 3).map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="font-medium text-slate-900 mb-4">Details</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Treatment Code</dt>
                <dd className="text-slate-900 font-medium">{pa.treatmentCode}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Diagnosis Code</dt>
                <dd className="text-slate-900 font-medium">{pa.diagnosisCode}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Submitted</dt>
                <dd className="text-slate-900">{pa.submittedAt ? new Date(pa.submittedAt).toLocaleDateString() : "—"}</dd>
              </div>
              {pa.historicalApprovalRate && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Historical Rate</dt>
                  <dd className="text-slate-900">{Math.round(pa.historicalApprovalRate * 100)}%</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Denial Reason */}
        {pa.status === "complete" && pa.statusDetail === "denied" && pa.denialReason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-900">Denial Reason</h3>
                <p className="text-red-700 mt-1">{pa.denialReason}</p>
                <p className="text-red-600 text-sm mt-3">
                  You may appeal this decision. Contact your care team or view our resources for help.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Physician Notes */}
        {pa.physicianNotes && (
          <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
            <h2 className="font-medium text-slate-900 mb-3">Physician Notes</h2>
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{pa.physicianNotes}</p>
          </div>
        )}

        {/* Documents */}
        <div className="bg-white rounded-lg border border-slate-200 mb-6">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-medium text-slate-900">Documents</h2>
            <DocumentUpload paId={pa.id} />
          </div>
          {paDocuments.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No documents uploaded</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {paDocuments.map((doc) => (
                <div key={doc.id} className="px-6 py-3 flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 truncate">{doc.fileName}</p>
                    <p className="text-xs text-slate-500">
                      {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Form */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="font-medium text-slate-900 mb-4">Contact Care Team</h2>
          <MessageForm paId={pa.id} patientId={patient.id} />
        </div>
      </main>
    </div>
  );
}
