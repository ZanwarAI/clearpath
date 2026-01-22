import { redirect } from "next/navigation";
import Link from "next/link";
import { getLoggedInUser, logout } from "@/lib/auth";
import { db } from "@/lib/db";
import { historicalPAs, priorAuthorizations, patients, users } from "@/lib/schema";
import { eq, sql, desc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  LogOut, 
  Shield, 
  TrendingUp, 
  Clock, 
  FileText, 
  DollarSign,
  BarChart3,
  Users,
  Building2,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

export default async function AdminAnalyticsPage() {
  const user = await getLoggedInUser();
  if (!user || user.role !== "admin") redirect("/login");

  const overallStats = db
    .select({
      totalCount: sql<number>`count(*)`,
      approvedCount: sql<number>`sum(case when outcome = 'approved' then 1 else 0 end)`,
      deniedCount: sql<number>`sum(case when outcome = 'denied' then 1 else 0 end)`,
      avgProcessingDays: sql<number>`avg(processing_days)`,
    })
    .from(historicalPAs)
    .get();

  const insurerStats = db
    .select({
      insurer: historicalPAs.insuranceProvider,
      totalCount: sql<number>`count(*)`,
      approvedCount: sql<number>`sum(case when outcome = 'approved' then 1 else 0 end)`,
      avgDays: sql<number>`round(avg(processing_days), 1)`,
    })
    .from(historicalPAs)
    .groupBy(historicalPAs.insuranceProvider)
    .orderBy(desc(sql`count(*)`))
    .all();

  const denialReasons = db
    .select({
      reason: historicalPAs.denialReason,
      count: sql<number>`count(*)`,
    })
    .from(historicalPAs)
    .where(sql`${historicalPAs.denialReason} is not null`)
    .groupBy(historicalPAs.denialReason)
    .orderBy(desc(sql`count(*)`))
    .limit(6)
    .all();

  const recentPAs = db
    .select({ pa: priorAuthorizations, patient: patients })
    .from(priorAuthorizations)
    .leftJoin(patients, eq(priorAuthorizations.patientId, patients.id))
    .orderBy(desc(priorAuthorizations.updatedAt))
    .limit(6)
    .all();

  const physicianStats = db
    .select({
      physicianId: priorAuthorizations.physicianId,
      totalPAs: sql<number>`count(*)`,
      approvedCount: sql<number>`sum(case when status_detail = 'approved' then 1 else 0 end)`,
    })
    .from(priorAuthorizations)
    .where(sql`${priorAuthorizations.physicianId} is not null`)
    .groupBy(priorAuthorizations.physicianId)
    .all();

  const physiciansWithStats = await Promise.all(
    physicianStats.map(async (stat) => {
      const physician = stat.physicianId
        ? db.select().from(users).where(eq(users.id, stat.physicianId)).get()
        : null;
      return { ...stat, physician };
    })
  );

  const approvalRate = overallStats
    ? Math.round((overallStats.approvedCount / overallStats.totalCount) * 100)
    : 0;

  const numPhysicians = physicianStats.length || 2;
  const annualSavings = 0.5 * 35 * 100 * numPhysicians * 52;

  async function logoutAction() {
    "use server";
    await logout();
    redirect("/login");
  }

  const getStatusConfig = (status: string, detail: string | null) => {
    if (status === "complete" && detail === "approved") return { bg: "bg-emerald-50", text: "text-emerald-700", label: "Approved" };
    if (status === "complete" && detail === "denied") return { bg: "bg-red-50", text: "text-red-700", label: "Denied" };
    if (status === "under_review") return { bg: "bg-amber-50", text: "text-amber-700", label: "Review" };
    return { bg: "bg-sky-50", text: "text-sky-700", label: "Submitted" };
  };

  const maxDenialCount = Math.max(...denialReasons.map(d => d.count));

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-premium flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900 hidden sm:inline">ClearPath</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/admin/analytics" className="nav-link nav-link-active">Analytics</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right mr-2">
              <p className="text-sm font-medium text-slate-900">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-slate-500">Administrator</p>
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Insights from {overallStats?.totalCount.toLocaleString()} historical PA records
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex items-center gap-1 text-emerald-600 text-sm">
                <ArrowUpRight className="w-4 h-4" />
                <span>+2.3%</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{approvalRate}%</p>
            <p className="text-sm text-slate-500 mt-1">Approval Rate</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-sky-600" />
              </div>
              <div className="flex items-center gap-1 text-emerald-600 text-sm">
                <ArrowDownRight className="w-4 h-4" />
                <span>-1.2d</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{Math.round(overallStats?.avgProcessingDays || 0)}</p>
            <p className="text-sm text-slate-500 mt-1">Avg. Days to Decision</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-violet-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{overallStats?.totalCount.toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-1">Total Records</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">${(annualSavings / 1000).toFixed(0)}K</p>
            <p className="text-sm text-slate-500 mt-1">Est. Annual Savings</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Insurer Performance */}
          <div className="card-elevated overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <h2 className="font-semibold text-slate-900">Approval Rate by Insurer</h2>
            </div>
            <div className="p-5 space-y-4">
              {insurerStats.slice(0, 6).map((stat) => {
                const rate = Math.round((stat.approvedCount / stat.totalCount) * 100);
                return (
                  <div key={stat.insurer}>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-medium text-slate-700">{stat.insurer}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-xs">{stat.avgDays}d avg</span>
                        <span className={`font-semibold tabular-nums ${
                          rate >= 70 ? "text-emerald-600" : rate >= 50 ? "text-amber-600" : "text-red-600"
                        }`}>
                          {rate}%
                        </span>
                      </div>
                    </div>
                    <Progress
                      value={rate}
                      className={`h-2 ${rate >= 70 ? "[&>div]:bg-emerald-500" : rate >= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500"}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Denial Reasons */}
          <div className="card-elevated overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <h2 className="font-semibold text-slate-900">Top Denial Reasons</h2>
            </div>
            <div className="p-5 space-y-3">
              {denialReasons.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700 truncate pr-4">{item.reason}</span>
                      <span className="text-sm text-slate-500 tabular-nums flex-shrink-0">{item.count.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-400 rounded-full"
                        style={{ width: `${(item.count / maxDenialCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="card-elevated overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h2 className="font-semibold text-slate-900">Recent Activity</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {recentPAs.map(({ pa, patient }) => {
                const config = getStatusConfig(pa.status, pa.statusDetail);
                return (
                  <div key={pa.id} className="px-5 py-3.5 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{pa.treatmentName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{patient?.firstName} {patient?.lastName}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${config.bg} ${config.text}`}>
                      {config.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Physician Performance */}
          <div className="card-elevated overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <h2 className="font-semibold text-slate-900">Physician Performance</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {physiciansWithStats.map((stat) => {
                const rate = stat.totalPAs > 0 ? Math.round(((stat.approvedCount || 0) / stat.totalPAs) * 100) : 0;
                return (
                  <div key={stat.physicianId} className="px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600">
                        {stat.physician?.firstName?.[0]}{stat.physician?.lastName?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Dr. {stat.physician?.firstName} {stat.physician?.lastName}
                        </p>
                        <p className="text-xs text-slate-500">{stat.totalPAs} total PAs</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {rate >= 70 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-amber-500" />
                      )}
                      <span className={`text-sm font-semibold tabular-nums ${
                        rate >= 70 ? "text-emerald-600" : "text-amber-600"
                      }`}>
                        {rate}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
