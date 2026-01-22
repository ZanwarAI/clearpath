import { redirect } from "next/navigation";
import Link from "next/link";
import { getLoggedInPatient, getLoggedInUser, logout } from "@/lib/auth";
import { db } from "@/lib/db";
import { priorAuthorizations, notifications, historicalPAs } from "@/lib/schema";
import { eq, desc, sql } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  LogOut, 
  ChevronRight, 
  Bell, 
  HelpCircle, 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Shield,
  TrendingUp
} from "lucide-react";

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

  const getStatusConfig = (status: string, detail: string | null) => {
    if (status === "complete" && detail === "approved")
      return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: CheckCircle2, label: "Approved" };
    if (status === "complete" && detail === "denied")
      return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: XCircle, label: "Denied" };
    if (status === "under_review")
      return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: Clock, label: "Under Review" };
    return { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", icon: FileText, label: "Submitted" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900">ClearPath</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/dashboard" className="px-3 py-2 text-sm font-medium text-sky-600 bg-sky-50 rounded-lg">
                Dashboard
              </Link>
              <Link href="/resources" className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                Resources
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-sky-500 rounded-full"></span>
              )}
            </button>
            <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{patient.firstName} {patient.lastName}</p>
                <p className="text-xs text-slate-500">{patient.insuranceProvider}</p>
              </div>
              <form action={logoutAction}>
                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700">
                  <LogOut className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {patient.firstName}
          </h1>
          <p className="text-slate-500 mt-1">Track your prior authorization requests</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-slate-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900">{pas.length}</span>
            </div>
            <p className="text-sm text-slate-500">Total Requests</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-2xl font-bold text-amber-600">{pendingCount}</span>
            </div>
            <p className="text-sm text-slate-500">Pending</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-2xl font-bold text-emerald-600">{approvedCount}</span>
            </div>
            <p className="text-sm text-slate-500">Approved</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-2xl font-bold text-red-600">{deniedCount}</span>
            </div>
            <p className="text-sm text-slate-500">Denied</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* PA List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Your Authorizations</h2>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                  {pas.length} total
                </span>
              </div>
              {pas.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 mb-2">No prior authorization requests yet</p>
                  <p className="text-sm text-slate-400">Your requests will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pas.map((pa) => {
                    const config = getStatusConfig(pa.status, pa.statusDetail);
                    const Icon = config.icon;
                    return (
                      <Link
                        key={pa.id}
                        href={`/pa/${pa.id}`}
                        className="flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors group"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-5 h-5 ${config.text}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{pa.treatmentName}</p>
                            <p className="text-sm text-slate-500">
                              {pa.diagnosisCode} · {pa.submittedAt ? new Date(pa.submittedAt).toLocaleDateString() : "Draft"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <div className="text-right hidden sm:block">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${config.bg} ${config.text}`}>
                              {config.label}
                            </span>
                            {pa.riskScore && (
                              <div className="flex items-center gap-1 mt-1 justify-end">
                                <TrendingUp className="w-3 h-3 text-slate-400" />
                                <span className={`text-sm font-medium ${
                                  pa.riskScore >= 75 ? "text-emerald-600" : pa.riskScore >= 50 ? "text-amber-600" : "text-red-600"
                                }`}>
                                  {pa.riskScore}%
                                </span>
                              </div>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Insurance Card */}
            <div className="bg-gradient-to-br from-sky-500 to-cyan-500 rounded-xl p-6 text-white shadow-lg">
              <p className="text-sky-100 text-sm mb-1">Insurance Provider</p>
              <p className="text-xl font-bold mb-4">{patient.insuranceProvider}</p>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sky-100 text-xs">Member ID</p>
                  <p className="font-mono font-medium">{patient.insuranceId}</p>
                </div>
                <div className="text-right">
                  <p className="text-sky-100 text-xs">Avg. Processing</p>
                  <p className="font-bold">{insurerAvgTime?.avgDays || 12} days</p>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-slate-400" />
                  <h3 className="font-semibold text-slate-900">Notifications</h3>
                </div>
                {unreadCount > 0 && (
                  <span className="text-xs bg-sky-500 text-white px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {patientNotifications.length === 0 ? (
                <div className="p-5 text-sm text-slate-500 text-center">No notifications</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {patientNotifications.slice(0, 3).map((notif) => (
                    <div key={notif.id} className={`p-4 ${notif.read === 0 ? "bg-sky-50/50" : ""}`}>
                      <p className="text-sm font-medium text-slate-900">{notif.title}</p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notif.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Help Link */}
            <Link
              href="/resources"
              className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 p-5 hover:border-sky-300 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                <HelpCircle className="w-6 h-6 text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">Need help?</p>
                <p className="text-sm text-slate-500">View guides & resources</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
