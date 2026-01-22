import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getLoggedInUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { appeals, priorAuthorizations, patients, p2pReviews } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Phone,
  Clock,
  User,
  Sparkles,
  Scale,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AppealDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getLoggedInUser();

  if (!user || user.role !== "physician") {
    redirect("/login");
  }

  const appeal = db.select().from(appeals).where(eq(appeals.id, id)).get();

  if (!appeal) {
    notFound();
  }

  const pa = appeal.paId
    ? db
        .select()
        .from(priorAuthorizations)
        .where(eq(priorAuthorizations.id, appeal.paId))
        .get()
    : null;

  if (!pa || pa.physicianId !== user.id) {
    redirect("/physician");
  }

  const patient = pa.patientId
    ? db.select().from(patients).where(eq(patients.id, pa.patientId)).get()
    : null;

  const p2pReview = db
    .select()
    .from(p2pReviews)
    .where(eq(p2pReviews.appealId, id))
    .get();

  const additionalEvidence = appeal.additionalEvidence
    ? JSON.parse(appeal.additionalEvidence)
    : [];

  const getStatusBadge = () => {
    switch (appeal.status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-700 text-base px-4 py-1">
            Approved
          </Badge>
        );
      case "denied":
        return (
          <Badge className="bg-red-100 text-red-700 text-base px-4 py-1">
            Denied
          </Badge>
        );
      case "under_review":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 text-base px-4 py-1">
            Under Review
          </Badge>
        );
      case "escalated":
        return (
          <Badge className="bg-purple-100 text-purple-700 text-base px-4 py-1">
            Escalated
          </Badge>
        );
      case "submitted":
        return (
          <Badge className="bg-blue-100 text-blue-700 text-base px-4 py-1">
            Submitted
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-700 text-base px-4 py-1">
            Draft
          </Badge>
        );
    }
  };

  const getOutcomeBadge = () => {
    if (!appeal.outcome) return null;
    if (appeal.outcome === "overturned") {
      return (
        <Badge className="bg-green-100 text-green-700">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Overturned
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-700">
        <XCircle className="w-3 h-3 mr-1" />
        Upheld
      </Badge>
    );
  };

  const getLevelName = (level: number) => {
    switch (level) {
      case 1:
        return "Internal Appeal";
      case 2:
        return "External Review";
      case 3:
        return "State Appeal";
      default:
        return `Level ${level}`;
    }
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
              <div className="flex items-center gap-3 mb-2">
                <Scale className="w-6 h-6 text-slate-600" />
                <h1 className="text-2xl font-bold text-gray-900">
                  Appeal: {pa.treatmentName}
                </h1>
              </div>
              <div className="flex items-center gap-4 mt-2">
                {getStatusBadge()}
                {getOutcomeBadge()}
                <Badge variant="outline">
                  {getLevelName(appeal.appealLevel)}
                </Badge>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  Filed:{" "}
                  {appeal.submittedAt
                    ? new Date(appeal.submittedAt).toLocaleDateString()
                    : "Not submitted"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main content - 2 columns */}
          <div className="md:col-span-2 space-y-6">
            {/* Appeal Reason */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Appeal Reason
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{appeal.appealReason}</p>
              </CardContent>
            </Card>

            {/* Original Denial */}
            {pa.denialReason && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-700 flex items-center gap-2">
                    <XCircle className="w-5 h-5" />
                    Original Denial Reason
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{pa.denialReason}</p>
                </CardContent>
              </Card>
            )}

            {/* Appeal Narrative */}
            {appeal.appealNarrative && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Appeal Letter
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm font-sans text-gray-700 bg-gray-50 p-4 rounded-lg">
                    {appeal.appealNarrative}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* P2P Review Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Peer-to-Peer Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                {appeal.p2pScheduled ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">P2P Review Scheduled</span>
                    </div>
                    {appeal.p2pDate && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-600 font-medium">
                          Scheduled Date
                        </p>
                        <p className="text-lg font-semibold text-blue-900">
                          {new Date(appeal.p2pDate).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {p2pReview && (
                      <div className="space-y-2 text-sm">
                        {p2pReview.insurerReviewerName && (
                          <p>
                            <span className="text-gray-500">Reviewer:</span>{" "}
                            {p2pReview.insurerReviewerName}
                            {p2pReview.insurerReviewerSpecialty &&
                              ` (${p2pReview.insurerReviewerSpecialty})`}
                          </p>
                        )}
                        {p2pReview.phoneNumber && (
                          <p>
                            <span className="text-gray-500">Phone:</span>{" "}
                            {p2pReview.phoneNumber}
                          </p>
                        )}
                        {p2pReview.conferenceLink && (
                          <p>
                            <span className="text-gray-500">Conference:</span>{" "}
                            <a
                              href={p2pReview.conferenceLink}
                              className="text-blue-600 hover:underline"
                            >
                              Join Link
                            </a>
                          </p>
                        )}
                      </div>
                    )}
                    {appeal.p2pNotes && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-500 mb-1">
                          Preparation Notes
                        </p>
                        <p className="text-gray-700">{appeal.p2pNotes}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Phone className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">
                      No P2P review has been scheduled yet
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Contact the insurance company to request a peer-to-peer
                      review
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Evidence */}
            {additionalEvidence.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Additional Evidence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {additionalEvidence.map(
                      (evidence: string, index: number) => (
                        <li
                          key={index}
                          className="flex items-center gap-2 text-sm"
                        >
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span>{evidence}</span>
                        </li>
                      )
                    )}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Outcome */}
            {appeal.outcome && (
              <Card
                className={
                  appeal.outcome === "overturned"
                    ? "border-green-200"
                    : "border-red-200"
                }
              >
                <CardHeader>
                  <CardTitle
                    className={`flex items-center gap-2 ${
                      appeal.outcome === "overturned"
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {appeal.outcome === "overturned" ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                    Appeal{" "}
                    {appeal.outcome === "overturned" ? "Approved" : "Denied"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {appeal.outcomeReason && (
                    <p className="text-gray-700">{appeal.outcomeReason}</p>
                  )}
                  {appeal.decidedAt && (
                    <p className="text-sm text-gray-500 mt-2">
                      Decision date:{" "}
                      {new Date(appeal.decidedAt).toLocaleDateString()}
                    </p>
                  )}
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
                    <p className="font-medium">
                      {patient.firstName} {patient.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      DOB: {patient.dateOfBirth}
                    </p>
                    <p className="text-sm text-gray-500">
                      {patient.insuranceProvider}
                    </p>
                    <p className="text-sm text-gray-500">
                      {patient.insuranceId}
                    </p>
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
                    <dt className="text-gray-500">Treatment</dt>
                    <dd className="font-medium">{pa.treatmentName}</dd>
                  </div>
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
                      <p className="font-medium text-sm">Appeal Filed</p>
                      <p className="text-xs text-gray-500">
                        {appeal.submittedAt
                          ? new Date(appeal.submittedAt).toLocaleString()
                          : "Pending"}
                      </p>
                    </div>
                  </div>
                  {appeal.p2pScheduled && appeal.p2pDate && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-500 mt-2" />
                      <div>
                        <p className="font-medium text-sm">P2P Scheduled</p>
                        <p className="text-xs text-gray-500">
                          {new Date(appeal.p2pDate).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                  {appeal.outcome && (
                    <div className="flex gap-3">
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${
                          appeal.outcome === "overturned"
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      />
                      <div>
                        <p className="font-medium text-sm">
                          {appeal.outcome === "overturned"
                            ? "Approved"
                            : "Denied"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {appeal.decidedAt
                            ? new Date(appeal.decidedAt).toLocaleString()
                            : ""}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Deadline */}
            {appeal.deadlineDate && !appeal.outcome && (
              <Card className="border-amber-200">
                <CardHeader>
                  <CardTitle className="text-lg text-amber-700 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Deadline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium text-amber-900">
                    {new Date(appeal.deadlineDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Submit all additional documentation before this date
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Link href={`/physician/pa/${pa.id}`} className="block">
                    <Button variant="outline" className="w-full">
                      View Original PA
                    </Button>
                  </Link>
                  {appeal.status === "denied" &&
                    appeal.appealLevel < 3 && (
                      <Link
                        href={`/physician/appeals/new?paId=${pa.id}&level=${
                          appeal.appealLevel + 1
                        }`}
                        className="block"
                      >
                        <Button className="w-full bg-slate-900 hover:bg-slate-800">
                          Escalate to Level {appeal.appealLevel + 1}
                        </Button>
                      </Link>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
