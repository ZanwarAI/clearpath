import { redirect } from "next/navigation";
import Link from "next/link";
import { getLoggedInUser, logout } from "@/lib/auth";
import { db } from "@/lib/db";
import { priorAuthorizations, patients } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, ChevronRight, Scale, Award } from "lucide-react";

export default async function PhysicianDashboard() {
  const user = await getLoggedInUser();

  if (!user || user.role !== "physician") {
    redirect("/login");
  }

  const pas = db
    .select({ pa: priorAuthorizations, patient: patients })
    .from(priorAuthorizations)
    .leftJoin(patients, eq(priorAuthorizations.patientId, patients.id))
    .where(eq(priorAuthorizations.physicianId, user.id))
    .orderBy(desc(priorAuthorizations.updatedAt))
    .all();

  const pendingCount = pas.filter(
    (p) => p.pa.status === "submitted" || p.pa.status === "under_review" || p.pa.status === "draft"
  ).length;
  const approvedCount = pas.filter(
    (p) => p.pa.status === "complete" && p.pa.statusDetail === "approved"
  ).length;
  const deniedCount = pas.filter(
    (p) => p.pa.status === "complete" && p.pa.statusDetail === "denied"
  ).length;

  async function logoutAction() {
    "use server";
    await logout();
    redirect("/login");
  }

  const getStatusStyle = (status: string, detail: string | null) => {
    if (status === "complete" && detail === "approved")
      return "bg-emerald-50 text-emerald-700";
    if (status === "complete" && detail === "denied")
      return "bg-red-50 text-red-700";
    if (status === "under_review")
      return "bg-amber-50 text-amber-700";
    return "bg-slate-100 text-slate-600";
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
            <Link href="/physician" className="text-lg font-semibold text-slate-900">
              ClearPath
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/physician" className="text-sm font-medium text-slate-900">Dashboard</Link>
              <Link href="/physician/appeals" className="text-sm text-slate-500 hover:text-slate-900">Appeals</Link>
              <Link href="/physician/gold-card" className="text-sm text-slate-500 hover:text-slate-900">Gold Card</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900">Dr. {user.firstName} {user.lastName}</p>
              <p className="text-xs text-slate-500">{user.organization}</p>
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Prior Authorizations</h1>
            <p className="text-slate-500 mt-1">Manage and track your PA requests</p>
          </div>
          <Link href="/physician/new">
            <Button className="bg-slate-900 hover:bg-slate-800">
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <p className="text-sm text-slate-500">Total</p>
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
          {/* PA List */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-medium text-slate-900">Recent Requests</h2>
            </div>
            {pas.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-slate-500 mb-4">No prior authorizations yet</p>
                <Link href="/physician/new">
                  <Button variant="outline">Create your first PA</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pas.map(({ pa, patient }) => (
                  <Link
                    key={pa.id}
                    href={`/physician/pa/${pa.id}`}
                    className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">{pa.treatmentName}</p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {patient?.firstName} {patient?.lastName} &middot; {pa.diagnosisCode}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusStyle(pa.status, pa.statusDetail)}`}>
                        {getStatusText(pa.status, pa.statusDetail)}
                      </span>
                      {pa.riskScore && (
                        <span className={`text-sm font-medium tabular-nums ${
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

          {/* Sidebar */}
          <div className="space-y-4">
            <Link
              href="/physician/appeals"
              className="flex items-center gap-4 bg-white rounded-lg border border-slate-200 p-5 hover:border-slate-300 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Scale className="w-5 h-5 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900">Appeals</p>
                <p className="text-sm text-slate-500">{deniedCount} denied PAs</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              href="/physician/gold-card"
              className="flex items-center gap-4 bg-white rounded-lg border border-slate-200 p-5 hover:border-slate-300 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900">Gold Card Status</p>
                <p className="text-sm text-slate-500">View eligibility</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>

            {/* Quick Tips */}
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h3 className="font-medium text-slate-900 mb-3">Tips for Approval</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex gap-2">
                  <span className="text-slate-400">1.</span>
                  Include complete clinical documentation
                </li>
                <li className="flex gap-2">
                  <span className="text-slate-400">2.</span>
                  Reference clinical guidelines (NCCN, etc.)
                </li>
                <li className="flex gap-2">
                  <span className="text-slate-400">3.</span>
                  Document prior treatment attempts
                </li>
                <li className="flex gap-2">
                  <span className="text-slate-400">4.</span>
                  Use AI narrative generator for strong cases
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
