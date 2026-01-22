import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getLoggedInPatient, getLoggedInUser, logout } from "@/lib/auth";
import { db } from "@/lib/db";
import { priorAuthorizations, notifications, historicalPAs } from "@/lib/schema";
import { eq, desc, sql } from "drizzle-orm";
import { Button } from "@/components/ui/button";
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
  TrendingUp,
  Activity
} from "lucide-react";

const fallbackAvatar = (name: string) =>
  `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(name)}`;

async function getPatientAvatar(seed: string, name: string) {
  try {
    const res = await fetch(
      `https://randomuser.me/api/?seed=${encodeURIComponent(seed)}&inc=picture&noinfo`,
      { next: { revalidate: 86400 } }
    );
    const data = await res.json();
    return data?.results?.[0]?.picture?.thumbnail || fallbackAvatar(name);
  } catch {
    return fallbackAvatar(name);
  }
}

export default async function DashboardPage() {
  const patient = await getLoggedInPatient();
  const user = await getLoggedInUser();

  if (!patient || !user) redirect("/login");

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
  const pendingCount = pas.filter((pa) => pa.status === "submitted" || pa.status === "under_review").length;
  const approvedCount = pas.filter((pa) => pa.status === "complete" && pa.statusDetail === "approved").length;
  const deniedCount = pas.filter((pa) => pa.status === "complete" && pa.statusDetail === "denied").length;

  const insurerAvgTime = db
    .select({ avgDays: sql<number>`round(avg(processing_days), 0)` })
    .from(historicalPAs)
    .where(eq(historicalPAs.insuranceProvider, patient.insuranceProvider || ""))
    .get();

  const avatarUrl = await getPatientAvatar(patient.id, `${patient.firstName} ${patient.lastName}`);

  async function logoutAction() {
    "use server";
    await logout();
    redirect("/login");
  }

  const getStatusConfig = (status: string, detail: string | null) => {
    if (status === "complete" && detail === "approved")
      return { bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle2, iconColor: "text-emerald-500", label: "Approved" };
    if (status === "complete" && detail === "denied")
      return { bg: "bg-red-50", text: "text-red-700", icon: XCircle, iconColor: "text-red-500", label: "Denied" };
    if (status === "under_review")
      return { bg: "bg-amber-50", text: "text-amber-700", icon: Clock, iconColor: "text-amber-500", label: "Under Review" };
    return { bg: "bg-sky-50", text: "text-sky-700", icon: FileText, iconColor: "text-sky-500", label: "Submitted" };
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-premium flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900 hidden sm:inline">ClearPath</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/dashboard" className="nav-link nav-link-active">Dashboard</Link>
              <Link href="/resources" className="nav-link nav-link-inactive">Resources</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-sky-500 rounded-full ring-2 ring-white" />
              )}
            </button>
            <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-3">
              <Image
                src={avatarUrl}
                alt={`${patient.firstName} ${patient.lastName}`}
                width={36}
                height={36}
                className="w-9 h-9 rounded-full object-cover border border-slate-200"
              />
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{patient.firstName} {patient.lastName}</p>
                <p className="text-xs text-slate-500">{patient.insuranceProvider}</p>
              </div>
            </div>
            <form action={logoutAction}>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
                <LogOut className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome Banner */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {patient.firstName}</h1>
          <p className="text-slate-500 mt-1">Track and manage your prior authorization requests</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Requests", value: pas.length, icon: FileText, color: "slate" },
            { label: "Pending", value: pendingCount, icon: Clock, color: "amber" },
            { label: "Approved", value: approvedCount, icon: CheckCircle2, color: "emerald" },
            { label: "Denied", value: deniedCount, icon: XCircle, color: "red" },
          ].map((stat) => (
            <div key={stat.label} className="stat-card group">
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl bg-${stat.color}-100 flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                </div>
                <span className={`text-2xl font-bold ${stat.color === 'slate' ? 'text-slate-900' : `text-${stat.color}-600`}`}>
                  {stat.value}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-3">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - PA List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card-elevated overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-slate-900">Your Authorizations</h2>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                    {pas.length}
                  </span>
                </div>
              </div>
              
              {pas.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="font-medium text-slate-900 mb-1">No requests yet</h3>
                  <p className="text-sm text-slate-500">Your prior authorization requests will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pas.map((pa, index) => {
                    const config = getStatusConfig(pa.status, pa.statusDetail);
                    const Icon = config.icon;
                    return (
                      <Link
                        key={pa.id}
                        href={`/pa/${pa.id}`}
                        className="flex items-center gap-4 p-5 list-item-hover group"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className={`w-11 h-11 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-5 h-5 ${config.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900 truncate">{pa.treatmentName}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-slate-500">{pa.diagnosisCode}</span>
                            <span className="text-slate-300">·</span>
                            <span className="text-sm text-slate-500">
                              {pa.submittedAt ? new Date(pa.submittedAt).toLocaleDateString() : "Draft"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                              {config.label}
                            </span>
                            {pa.riskScore && (
                              <div className="flex items-center gap-1 mt-1.5 justify-end">
                                <TrendingUp className="w-3 h-3 text-slate-400" />
                                <span className={`text-sm font-semibold ${
                                  pa.riskScore >= 75 ? "text-emerald-600" : pa.riskScore >= 50 ? "text-amber-600" : "text-red-600"
                                }`}>
                                  {pa.riskScore}%
                                </span>
                              </div>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Insurance Card */}
            <div className="rounded-2xl bg-gradient-premium p-5 text-white shadow-lg shadow-sky-500/20">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-sky-100 text-sm">Insurance Provider</p>
                  <p className="text-xl font-bold mt-1">{patient.insuranceProvider}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sky-100 text-xs">Member ID</p>
                  <p className="font-mono font-semibold mt-0.5">{patient.insuranceId}</p>
                </div>
                <div>
                  <p className="text-sky-100 text-xs">Avg. Processing</p>
                  <p className="font-semibold mt-0.5">{insurerAvgTime?.avgDays || 12} days</p>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="card-elevated overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-slate-400" />
                  <h3 className="font-semibold text-slate-900">Notifications</h3>
                </div>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-sky-500 text-white text-xs font-medium">
                    {unreadCount}
                  </span>
                )}
              </div>
              {patientNotifications.length === 0 ? (
                <div className="p-5 text-center text-sm text-slate-500">No notifications</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {patientNotifications.slice(0, 3).map((notif) => (
                    <div key={notif.id} className={`p-4 ${notif.read === 0 ? "bg-sky-50/50" : ""}`}>
                      <p className="text-sm font-medium text-slate-900 line-clamp-1">{notif.title}</p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notif.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div className="space-y-2">
              <Link href="/resources" className="card-elevated flex items-center gap-4 p-4 group">
                <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-violet-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">Help & Resources</p>
                  <p className="text-sm text-slate-500">Guides, FAQs, and support</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>

            {/* Tip Card */}
            <div className="rounded-xl bg-amber-50 border border-amber-200/60 p-4">
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">Did you know?</p>
                  <p className="text-sm text-amber-700 mt-1">
                    You can appeal denied PAs within 180 days. Check our Resources section for a step-by-step guide.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
