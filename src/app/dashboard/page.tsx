import { redirect } from "next/navigation";
import Link from "next/link";
import { getLoggedInPatient, getLoggedInUser, logout } from "@/lib/auth";
import { db } from "@/lib/db";
import { priorAuthorizations, notifications, historicalPAs } from "@/lib/schema";
import { eq, desc, sql } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { LogOut, ChevronRight, Bell, HelpCircle } from "lucide-react";

export default async function DashboardPage() {
  const patient = await getLoggedInPatient();
  const user = await getLoggedInUser();

  if (!patient || !user) {
    redirect("/login");
  }

  const pas = db
    .select()
    .from(priorAuthorizations)
    .where(eq(priorAuthorizations.patientId, patient.id))
    .orderBy(desc(priorAuthorizations.updatedAt))
    .all();

  const patientNotifications = db
    .select()
    .from(notifications)
    .where(eq(notifications.patientId, patient.id))
    .orderBy(desc(notifications.createdAt))
    .limit(5)
    .all();

  const unreadCount = patientNotifications.filter((n) => n.read === 0).length;

  const pendingCount = pas.filter(
    (pa) => pa.status === "submitted" || pa.status === "under_review"
  ).length;
  const approvedCount = pas.filter(
    (pa) => pa.status === "complete" && pa.statusDetail === "approved"
  ).length;
  const deniedCount = pas.filter(
    (pa) => pa.status === "complete" && pa.statusDetail === "denied"
  ).length;

  const insurerAvgTime = db
    .select({ avgDays: sql<number>`round(avg(processing_days), 0)` })
    .from(historicalPAs)
    .where(eq(historicalPAs.insuranceProvider, patient.insuranceProvider || ""))
    .get();

  async function logoutAction() {
    "use server";
    await logout();
    redirect("/login");
  }

  const getStatusStyle = (status: string, detail: string | null) => {
    if (status === "complete" && detail === "approved")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "complete" && detail === "denied")
      return "bg-red-50 text-red-700 border-red-200";
    if (status === "under_review")
      return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const getStatusText = (status: string, detail: string | null) => {
    if (status === "complete" && detail === "approved") return "Approved";
    if (status === "complete" && detail === "denied") return "Denied";
    if (status === "under_review") return "Under Review";
    if (status === "submitted") return "Submitted";
    return "Draft";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-lg font-semibold text-slate-900">
              ClearPath
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="text-sm font-medium text-slate-900">
                Dashboard
              </Link>
              <Link href="/resources" className="text-sm text-slate-500 hover:text-slate-900">
                Resources
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900">{patient.firstName} {patient.lastName}</p>
              <p className="text-xs text-slate-500">{patient.insuranceProvider}</p>
            </div>
            <form action={logoutAction}>
              <Button variant="ghost" size="sm" className="text-slate-500">
                <LogOut className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <p className="text-sm text-slate-500">Total Requests</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{pas.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <p className="text-sm text-slate-500">Pending</p>
            <p className="text-2xl font-semibold text-amber-600 mt-1">{pendingCount}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <p className="text-sm text-slate-500">Approved</p>
            <p className="text-2xl font-semibold text-emerald-600 mt-1">{approvedCount}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <p className="text-sm text-slate-500">Denied</p>
            <p className="text-2xl font-semibold text-red-600 mt-1">{deniedCount}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* PA List */}
            <div className="bg-white rounded-lg border border-slate-200">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-medium text-slate-900">Your Authorizations</h2>
              </div>
              {pas.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No prior authorization requests yet
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pas.map((pa) => (
                    <Link
                      key={pa.id}
                      href={`/pa/${pa.id}`}
                      className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 truncate">{pa.treatmentName}</p>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {pa.diagnosisCode} &middot; {pa.submittedAt ? new Date(pa.submittedAt).toLocaleDateString() : "Draft"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getStatusStyle(pa.status, pa.statusDetail)}`}>
                          {getStatusText(pa.status, pa.statusDetail)}
                        </span>
                        {pa.riskScore && (
                          <span className={`text-sm font-medium ${
                            pa.riskScore >= 75 ? "text-emerald-600" : pa.riskScore >= 50 ? "text-amber-600" : "text-red-600"
                          }`}>
                            {pa.riskScore}%
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Notifications */}
            <div className="bg-white rounded-lg border border-slate-200">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-slate-400" />
                  <h3 className="font-medium text-slate-900">Notifications</h3>
                </div>
                {unreadCount > 0 && (
                  <span className="text-xs bg-slate-900 text-white px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              {patientNotifications.length === 0 ? (
                <div className="p-5 text-sm text-slate-500">No notifications</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {patientNotifications.slice(0, 3).map((notif) => (
                    <div key={notif.id} className={`p-4 ${notif.read === 0 ? "bg-slate-50" : ""}`}>
                      <p className="text-sm font-medium text-slate-900">{notif.title}</p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notif.message}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Insurance Info */}
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h3 className="font-medium text-slate-900 mb-3">Insurance Details</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Provider</dt>
                  <dd className="text-slate-900 font-medium">{patient.insuranceProvider}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Member ID</dt>
                  <dd className="text-slate-900 font-medium">{patient.insuranceId}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Avg. Processing</dt>
                  <dd className="text-slate-900 font-medium">{insurerAvgTime?.avgDays || 12} days</dd>
                </div>
              </dl>
            </div>

            {/* Help */}
            <Link
              href="/resources"
              className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 p-5 hover:border-slate-300 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Need help?</p>
                <p className="text-sm text-slate-500">View resources & guides</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
