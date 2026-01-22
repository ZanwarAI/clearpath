import { redirect } from "next/navigation";
import Link from "next/link";
import { getLoggedInUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { appeals, priorAuthorizations, patients, insuranceProviders } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  FileText,
  Scale,
  ArrowRight,
} from "lucide-react";

export default async function AppealsPage() {
  const user = await getLoggedInUser();

  if (!user || user.role !== "physician") {
    redirect("/login");
  }

  // Get denied PAs that can be appealed
  const deniedPAs = db
    .select({
      pa: priorAuthorizations,
      patient: patients,
    })
    .from(priorAuthorizations)
    .leftJoin(patients, eq(priorAuthorizations.patientId, patients.id))
    .where(eq(priorAuthorizations.statusDetail, "denied"))
    .orderBy(desc(priorAuthorizations.decisionAt))
    .all();

  // Get existing appeals
  const existingAppeals = db
    .select({
      appeal: appeals,
      pa: priorAuthorizations,
      patient: patients,
    })
    .from(appeals)
    .leftJoin(priorAuthorizations, eq(appeals.paId, priorAuthorizations.id))
    .leftJoin(patients, eq(priorAuthorizations.patientId, patients.id))
    .orderBy(desc(appeals.createdAt))
    .all();

  // Get insurer info for P2P
  const insurers = db.select().from(insuranceProviders).all();
  const insurerMap = Object.fromEntries(insurers.map(i => [i.name, i]));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge className="bg-blue-100 text-blue-700">Submitted</Badge>;
      case "under_review":
        return <Badge className="bg-yellow-100 text-yellow-700">Under Review</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-700">Overturned</Badge>;
      case "denied":
        return <Badge className="bg-red-100 text-red-700">Upheld</Badge>;
      case "escalated":
        return <Badge className="bg-purple-100 text-purple-700">Escalated</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">Draft</Badge>;
    }
  };

  const getLevelBadge = (level: number) => {
    switch (level) {
      case 1:
        return <Badge variant="outline">Level 1 - Internal</Badge>;
      case 2:
        return <Badge variant="outline">Level 2 - External</Badge>;
      case 3:
        return <Badge variant="outline">Level 3 - State</Badge>;
      default:
        return <Badge variant="outline">Level {level}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/physician">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Appeals Management</h1>
              <p className="text-sm text-gray-500">Manage denied PA appeals and peer-to-peer reviews</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Appeal Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Denied PAs</p>
                  <p className="text-2xl font-bold">{deniedPAs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Scale className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Appeals</p>
                  <p className="text-2xl font-bold">
                    {existingAppeals.filter(a => ["draft", "submitted", "under_review"].includes(a.appeal.status)).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Overturned</p>
                  <p className="text-2xl font-bold">
                    {existingAppeals.filter(a => a.appeal.outcome === "overturned").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">P2P Scheduled</p>
                  <p className="text-2xl font-bold">
                    {existingAppeals.filter(a => a.appeal.p2pScheduled === 1).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Denied PAs Awaiting Appeal */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Denied PAs - Ready to Appeal
            </CardTitle>
            <CardDescription>
              70% of denied claims are eventually overturned on appeal
            </CardDescription>
          </CardHeader>
          <CardContent>
            {deniedPAs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No denied PAs to appeal</p>
            ) : (
              <div className="space-y-4">
                {deniedPAs.map(({ pa, patient }) => {
                  const insurer = insurerMap[patient?.insuranceProvider || ""];
                  const hasAppeal = existingAppeals.some(a => a.appeal.paId === pa.id);
                  const now = new Date().getTime();
                  const daysUntilDeadline = insurer?.appealDeadlineDays 
                    ? Math.ceil((new Date(pa.decisionAt || "").getTime() + insurer.appealDeadlineDays * 24 * 60 * 60 * 1000 - now) / (24 * 60 * 60 * 1000))
                    : 180;
                  
                  return (
                    <div
                      key={pa.id}
                      className="p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{pa.treatmentName}</p>
                            <Badge className="bg-red-100 text-red-700">Denied</Badge>
                            {hasAppeal && <Badge className="bg-blue-100 text-blue-700">Appeal Started</Badge>}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Patient: {patient?.firstName} {patient?.lastName} | {patient?.insuranceProvider}
                          </p>
                          <p className="text-sm text-red-600 mt-1">
                            <strong>Denial Reason:</strong> {pa.denialReason || "Not specified"}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Denied: {pa.decisionAt ? new Date(pa.decisionAt).toLocaleDateString() : "N/A"}
                            </span>
                            {daysUntilDeadline > 0 ? (
                              <span className={`flex items-center gap-1 ${daysUntilDeadline < 30 ? "text-orange-600 font-medium" : ""}`}>
                                <AlertTriangle className="w-3 h-3" />
                                {daysUntilDeadline} days to appeal
                              </span>
                            ) : (
                              <span className="text-red-600 font-medium">Appeal deadline passed</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {!hasAppeal && daysUntilDeadline > 0 && (
                            <Link href={`/physician/appeals/new?paId=${pa.id}`}>
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                Start Appeal
                                <ArrowRight className="w-4 h-4 ml-1" />
                              </Button>
                            </Link>
                          )}
                          {insurer?.p2pPhoneNumber && (
                            <Button size="sm" variant="outline">
                              <Phone className="w-4 h-4 mr-1" />
                              P2P: {insurer.p2pPhoneNumber}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Appeals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5" />
              Appeals in Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {existingAppeals.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No appeals started yet</p>
            ) : (
              <div className="space-y-4">
                {existingAppeals.map(({ appeal, pa, patient }) => (
                  <div
                    key={appeal.id}
                    className="p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{pa?.treatmentName}</p>
                          {getStatusBadge(appeal.status)}
                          {getLevelBadge(appeal.appealLevel)}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Patient: {patient?.firstName} {patient?.lastName}
                        </p>
                        {appeal.appealReason && (
                          <p className="text-sm text-gray-600 mt-1">
                            <strong>Appeal Reason:</strong> {appeal.appealReason}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>Created: {appeal.createdAt ? new Date(appeal.createdAt).toLocaleDateString() : "N/A"}</span>
                          {appeal.deadlineDate && (
                            <span className="text-orange-600">
                              Deadline: {new Date(appeal.deadlineDate).toLocaleDateString()}
                            </span>
                          )}
                          {appeal.p2pScheduled === 1 && appeal.p2pDate && (
                            <span className="text-blue-600 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              P2P: {new Date(appeal.p2pDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <Link href={`/physician/appeals/${appeal.id}`}>
                        <Button size="sm" variant="outline">
                          <FileText className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
