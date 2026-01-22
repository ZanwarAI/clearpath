import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getLoggedInPatient } from "@/lib/auth";
import { db } from "@/lib/db";
import { priorAuthorizations, documents, historicalPAs } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { DocumentUpload } from "@/components/DocumentUpload";
import { MessageForm } from "@/components/MessageForm";
import { CircularProgress } from "@/components/CircularProgress";
import { ArrowLeft, FileText, Check, Clock, AlertCircle, X, Shield, Upload } from "lucide-react";

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

  const getStatusConfig = (status: string, detail: string | null) => {
    if (status === "complete" && detail === "approved") 
      return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: Check, label: "Approved" };
    if (status === "complete" && detail === "denied") 
      return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: X, label: "Denied" };
    if (status === "under_review") 
      return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: Clock, label: "Under Review" };
    return { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", icon: FileText, label: "Submitted" };
  };

  const statusConfig = getStatusConfig(pa.status, pa.statusDetail);
  const StatusIcon = statusConfig.icon;

  const steps = [
    { key: "submitted", label: "Submitted", done: true },
    { key: "under_review", label: "Under Review", done: pa.status === "under_review" || pa.status === "complete" },
    { key: "complete", label: "Decision", done: pa.status === "complete" },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-premium flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900 hidden sm:inline">ClearPath</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Page Title */}
        <div className="animate-fade-in-up mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{pa.treatmentName}</h1>
              <p className="text-slate-500 mt-1">{pa.diagnosisCode} · {pa.diagnosisDescription}</p>
            </div>
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border`}>
              <StatusIcon className="w-4 h-4" />
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Progress Timeline */}
        <div className="card-elevated p-6 mb-6 animate-fade-in-up stagger-1" style={{ opacity: 0 }}>
          <div className="flex items-center justify-between">
            {steps.map((step, i) => (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                    step.done 
                      ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30" 
                      : "bg-slate-100 text-slate-400"
                  }`}>
                    {step.done ? <Check className="w-5 h-5" /> : <span className="text-sm font-medium">{i + 1}</span>}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${step.done ? "text-slate-900" : "text-slate-400"}`}>
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className="flex-1 h-1 mx-4 rounded-full overflow-hidden bg-slate-100">
                    <div 
                      className={`h-full bg-sky-500 transition-all duration-700 ${step.done ? "w-full" : "w-0"}`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          {(pa.status === "submitted" || pa.status === "under_review") && (
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-sm text-slate-500">
              <Clock className="w-4 h-4" />
              <span>Estimated completion: <span className="font-medium text-slate-700">{estimatedCompletionDate.toLocaleDateString()}</span></span>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Denial Reason */}
            {pa.status === "complete" && pa.statusDetail === "denied" && pa.denialReason && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.15s' }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                    <X className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-900">Denial Reason</h3>
                    <p className="text-red-700 mt-1">{pa.denialReason}</p>
                    <p className="text-red-600 text-sm mt-3">
                      You may appeal this decision within 180 days. Visit our Resources section for guidance.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Physician Notes */}
            {pa.physicianNotes && (
              <div className="card-elevated p-6 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.2s' }}>
                <h2 className="font-semibold text-slate-900 mb-3">Physician Notes</h2>
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{pa.physicianNotes}</p>
              </div>
            )}

            {/* Risk Factors */}
            {(positiveFactors.length > 0 || negativeFactors.length > 0) && (
              <div className="card-elevated p-6 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.25s' }}>
                <h2 className="font-semibold text-slate-900 mb-4">Risk Analysis</h2>
                <div className="grid sm:grid-cols-2 gap-6">
                  {positiveFactors.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-3">In Your Favor</p>
                      <ul className="space-y-2">
                        {positiveFactors.map((f: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                            <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {negativeFactors.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-3">Areas of Concern</p>
                      <ul className="space-y-2">
                        {negativeFactors.map((f: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Documents */}
            <div className="card-elevated overflow-hidden animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.3s' }}>
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Documents</h2>
                <DocumentUpload paId={pa.id} />
              </div>
              {paDocuments.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">No documents uploaded yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {paDocuments.map((doc) => (
                    <div key={doc.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-sky-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{doc.fileName}</p>
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
            <div className="card-elevated p-6 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.35s' }}>
              <h2 className="font-semibold text-slate-900 mb-4">Contact Care Team</h2>
              <MessageForm paId={pa.id} patientId={patient.id} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Approval Likelihood */}
            <div className="card-elevated p-6 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.1s' }}>
              <h2 className="font-semibold text-slate-900 mb-4 text-center">Approval Likelihood</h2>
              <div className="flex justify-center mb-4">
                <CircularProgress 
                  value={pa.riskScore ?? 0} 
                  size={140} 
                  strokeWidth={10}
                  label="chance"
                />
              </div>
              <p className="text-xs text-slate-500 text-center">
                Based on historical data and treatment patterns
              </p>
            </div>

            {/* Details Card */}
            <div className="card-elevated p-6 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.15s' }}>
              <h2 className="font-semibold text-slate-900 mb-4">Request Details</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Treatment Code</dt>
                  <dd className="text-slate-900 font-medium font-mono">{pa.treatmentCode}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Diagnosis Code</dt>
                  <dd className="text-slate-900 font-medium font-mono">{pa.diagnosisCode}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Submitted</dt>
                  <dd className="text-slate-900 font-medium">
                    {pa.submittedAt ? new Date(pa.submittedAt).toLocaleDateString() : "—"}
                  </dd>
                </div>
                {pa.historicalApprovalRate && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Historical Rate</dt>
                    <dd className="text-slate-900 font-medium">{Math.round(pa.historicalApprovalRate * 100)}%</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Insurance Info */}
            <div className="rounded-2xl bg-gradient-premium p-5 text-white shadow-lg shadow-sky-500/20 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.2s' }}>
              <p className="text-sky-100 text-xs uppercase tracking-wider mb-1">Insurance</p>
              <p className="font-bold text-lg">{patient.insuranceProvider}</p>
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-sky-100 text-xs">Member ID</p>
                <p className="font-mono font-medium">{patient.insuranceId}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
