import { redirect } from "next/navigation";
import Link from "next/link";
import { getLoggedInUser, logout } from "@/lib/auth";
import { db } from "@/lib/db";
import { historicalPAs, priorAuthorizations, patients, users } from "@/lib/schema";
import { eq, sql, desc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LogOut } from "lucide-react";

export default async function AdminAnalyticsPage() {
  const user = await getLoggedInUser();

  if (!user || user.role !== "admin") {
    redirect("/login");
  }

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
    .limit(8)
    .all();

  const recentPAs = db
    .select({ pa: priorAuthorizations, patient: patients })
    .from(priorAuthorizations)
    .leftJoin(patients, eq(priorAuthorizations.patientId, patients.id))
    .orderBy(desc(priorAuthorizations.updatedAt))
    .limit(8)
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

  const getStatusStyle = (status: string, detail: string | null) => {
    if (status === "complete" && detail === "approved") return "bg-emerald-50 text-emerald-700";
    if (status === "complete" && detail === "denied") return "bg-red-50 text-red-700";
    if (status === "under_review") return "bg-amber-50 text-amber-700";
    return "bg-slate-100 text-slate-600";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="text-lg font-semibold text-slate-900">ClearPath</Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/admin/analytics" className="text-sm font-medium text-slate-900">Analytics</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
            <form action={logoutAction}>
              <Button variant="ghost" size="sm" className="text-slate-500">
                <LogOut className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
          <p className="text-slate-500 mt-1">Insights from {overallStats?.totalCount.toLocaleString()} historical PA records</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <p className="text-sm text-slate-500">Approval Rate</p>
            <p className="text-2xl font-semibold text-emerald-600 mt-1">{approvalRate}%</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <p className="text-sm text-slate-500">Avg. Processing</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{Math.round(overallStats?.avgProcessingDays || 0)} days</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <p className="text-sm text-slate-500">Total Records</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{overallStats?.totalCount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <p className="text-sm text-slate-500">Est. Annual Savings</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">${(annualSavings / 1000).toFixed(0)}K</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Insurer Stats */}
          <div className="bg-white rounded-lg border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-medium text-slate-900">Approval Rate by Insurer</h2>
            </div>
            <div className="p-5 space-y-4">
              {insurerStats.slice(0, 6).map((stat) => {
                const rate = Math.round((stat.approvedCount / stat.totalCount) * 100);
                return (
                  <div key={stat.insurer}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-slate-700">{stat.insurer}</span>
                      <span className="text-slate-500">{rate}%</span>
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
          <div className="bg-white rounded-lg border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-medium text-slate-900">Top Denial Reasons</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {denialReasons.map((item, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-sm text-slate-700">{item.reason}</span>
                  <span className="text-sm text-slate-500 tabular-nums">{item.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-medium text-slate-900">Recent Activity</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {recentPAs.map(({ pa, patient }) => (
                <div key={pa.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{pa.treatmentName}</p>
                    <p className="text-xs text-slate-500">{patient?.firstName} {patient?.lastName}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusStyle(pa.status, pa.statusDetail)}`}>
                    {pa.status === "complete" ? pa.statusDetail : pa.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Physician Stats */}
          <div className="bg-white rounded-lg border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-medium text-slate-900">Physician Performance</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {physiciansWithStats.map((stat) => {
                const rate = stat.totalPAs > 0 ? Math.round(((stat.approvedCount || 0) / stat.totalPAs) * 100) : 0;
                return (
                  <div key={stat.physicianId} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Dr. {stat.physician?.firstName} {stat.physician?.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{stat.totalPAs} total PAs</p>
                    </div>
                    <span className={`text-sm font-medium ${rate >= 70 ? "text-emerald-600" : "text-amber-600"}`}>
                      {rate}%
                    </span>
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
