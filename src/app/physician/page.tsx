import { redirect } from "next/navigation";
import Link from "next/link";
import { getLoggedInUser, logout } from "@/lib/auth";
import { db } from "@/lib/db";
import { priorAuthorizations, patients } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { 
  LogOut, 
  Plus, 
  ChevronRight, 
  Shield, 
  Scale, 
  Award,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Sparkles,
  Activity
} from "lucide-react";

export default async function PhysicianDashboard() {
  const user = await getLoggedInUser();
  if (!user || user.role !== "physician") redirect("/login");

  const pas = db
    .select({ pa: priorAuthorizations, patient: patients })
    .from(priorAuthorizations)
    .leftJoin(patients, eq(priorAuthorizations.patientId, patients.id))
    .where(eq(priorAuthorizations.physicianId, user.id))
    .orderBy(desc(priorAuthorizations.updatedAt))
    .all();

  const totalCount = pas.length;
  const pendingCount = pas.filter((p) => p.pa.status === "submitted" || p.pa.status === "under_review" || p.pa.status === "draft").length;
  const approvedCount = pas.filter((p) => p.pa.status === "complete" && p.pa.statusDetail === "approved").length;
  const deniedCount = pas.filter((p) => p.pa.status === "complete" && p.pa.statusDetail === "denied").length;
  const approvalRate = totalCount > 0 ? Math.round((approvedCount / (approvedCount + deniedCount || 1)) * 100) : 0;

  async function logoutAction() {
    "use server";
    await logout();
    redirect("/login");
  }

  const getStatusConfig = (status: string, detail: string | null) => {
    if (status === "complete" && detail === "approved")
      return { bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle2, label: "Approved" };
    if (status === "complete" && detail === "denied")
      return { bg: "bg-red-50", text: "text-red-700", icon: XCircle, label: "Denied" };
    if (status === "under_review")
      return { bg: "bg-amber-50", text: "text-amber-700", icon: Clock, label: "Under Review" };
    return { bg: "bg-sky-50", text: "text-sky-700", icon: FileText, label: "Submitted" };
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/physician" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-premium flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900 hidden sm:inline">ClearPath</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/physician" className="nav-link nav-link-active">Dashboard</Link>
              <Link href="/physician/appeals" className="nav-link nav-link-inactive">Appeals</Link>
              <Link href="/physician/gold-card" className="nav-link nav-link-inactive">Gold Card</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right mr-2">
              <p className="text-sm font-medium text-slate-900">Dr. {user.firstName} {user.lastName}</p>
              <p className="text-xs text-slate-500">{user.organization}</p>
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
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Prior Authorizations</h1>
            <p className="text-slate-500 mt-1">Manage and track PA requests for your patients</p>
          </div>
          <Link href="/physician/new">
            <Button className="btn-primary h-11 px-5 rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </Link>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total", value: totalCount, icon: FileText, color: "slate", bg: "bg-slate-100" },
            { label: "Pending", value: pendingCount, icon: Clock, color: "amber", bg: "bg-amber-100" },
            { label: "Approved", value: approvedCount, icon: CheckCircle2, color: "emerald", bg: "bg-emerald-100" },
            { label: "Denied", value: deniedCount, icon: XCircle, color: "red", bg: "bg-red-100" },
            { label: "Approval Rate", value: `${approvalRate}%`, icon: TrendingUp, color: "sky", bg: "bg-sky-100" },
          ].map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 text-${stat.color}-600`} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${stat.color === 'slate' ? 'text-slate-900' : `text-${stat.color}-600`}`}>
                {stat.value}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - PA List */}
          <div className="lg:col-span-2">
            <div className="card-elevated overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-slate-900">Recent Requests</h2>
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
                  <p className="text-sm text-slate-500 mb-4">Create your first prior authorization request</p>
                  <Link href="/physician/new">
                    <Button variant="outline" className="rounded-xl">
                      <Plus className="w-4 h-4 mr-2" />
                      New Request
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pas.map(({ pa, patient }) => {
                    const config = getStatusConfig(pa.status, pa.statusDetail);
                    const Icon = config.icon;
                    return (
                      <Link
                        key={pa.id}
                        href={`/physician/pa/${pa.id}`}
                        className="flex items-center gap-4 p-5 list-item-hover group"
                      >
                        <div className={`w-11 h-11 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-5 h-5 ${config.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{pa.treatmentName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-slate-500">{patient?.firstName} {patient?.lastName}</span>
                            <span className="text-slate-300">·</span>
                            <span className="text-sm text-slate-500">{pa.diagnosisCode}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                              {config.label}
                            </span>
                            {pa.riskScore && (
                              <div className="flex items-center gap-1 mt-1.5 justify-end">
                                <span className={`text-sm font-semibold tabular-nums ${
                                  pa.riskScore >= 75 ? "text-emerald-600" : pa.riskScore >= 50 ? "text-amber-600" : "text-red-600"
                                }`}>
                                  {pa.riskScore}% likely
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
            {/* Quick Actions */}
            <div className="space-y-2">
              <Link href="/physician/appeals" className="card-elevated flex items-center gap-4 p-4 group">
                <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center">
                  <Scale className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">Appeals Center</p>
                  <p className="text-sm text-slate-500">{deniedCount} denied requests</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link href="/physician/gold-card" className="card-elevated flex items-center gap-4 p-4 group">
                <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Award className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">Gold Card Status</p>
                  <p className="text-sm text-slate-500">Check your eligibility</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>

            {/* AI Insights Card */}
            <div className="rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 p-5 text-white shadow-lg shadow-violet-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">AI Insights</span>
              </div>
              <p className="text-sm text-violet-100 mb-4">
                Use our AI-powered narrative generator to create compelling medical necessity statements that increase approval odds.
              </p>
              <Link href="/physician/new">
                <Button variant="secondary" className="w-full bg-white/20 hover:bg-white/30 text-white border-0">
                  Try AI Assistant
                </Button>
              </Link>
            </div>

            {/* Tips */}
            <div className="card-elevated p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-slate-400" />
                <h3 className="font-semibold text-slate-900">Tips for Approval</h3>
              </div>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500 flex-shrink-0 mt-0.5">1</span>
                  Include complete clinical documentation
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500 flex-shrink-0 mt-0.5">2</span>
                  Reference NCCN or other clinical guidelines
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500 flex-shrink-0 mt-0.5">3</span>
                  Document prior treatment attempts
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500 flex-shrink-0 mt-0.5">4</span>
                  Use AI to strengthen your narrative
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
