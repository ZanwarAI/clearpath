import { redirect } from "next/navigation";
import Link from "next/link";
import { getLoggedInUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { goldCardStatus, insuranceProviders, priorAuthorizations } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Award,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Star,
  Zap,
} from "lucide-react";

export default async function GoldCardPage() {
  const user = await getLoggedInUser();

  if (!user || user.role !== "physician") {
    redirect("/login");
  }

  // Get Gold Card status for this physician
  const goldCards = db
    .select()
    .from(goldCardStatus)
    .where(eq(goldCardStatus.physicianId, user.id))
    .all();

  // Get all insurers with their thresholds
  const insurers = db.select().from(insuranceProviders).all();

  // Calculate current approval rates per insurer from actual PAs
  const approvalRates = db
    .select({
      insuranceProvider: sql<string>`(SELECT insurance_provider FROM patients WHERE id = ${priorAuthorizations.patientId})`,
      total: sql<number>`count(*)`,
      approved: sql<number>`sum(case when status_detail = 'approved' then 1 else 0 end)`,
    })
    .from(priorAuthorizations)
    .where(
      and(
        eq(priorAuthorizations.physicianId, user.id),
        eq(priorAuthorizations.status, "complete")
      )
    )
    .groupBy(sql`(SELECT insurance_provider FROM patients WHERE id = ${priorAuthorizations.patientId})`)
    .all();

  // Merge data
  const insurerData = insurers.map(insurer => {
    const goldCard = goldCards.find(gc => gc.insuranceProvider === insurer.name);
    const rate = approvalRates.find(r => r.insuranceProvider === insurer.name);
    const currentRate = rate && rate.total > 0 ? rate.approved / rate.total : null;
    const threshold = insurer.goldCardThreshold || 0.90;
    
    return {
      insurer,
      goldCard,
      currentRate,
      threshold,
      total: rate?.total || 0,
      approved: rate?.approved || 0,
      isEligible: goldCard?.isEligible === 1 || (currentRate !== null && currentRate >= threshold && (rate?.total || 0) >= 10),
      progress: currentRate !== null ? Math.min(100, (currentRate / threshold) * 100) : 0,
    };
  });

  const eligibleCount = insurerData.filter(d => d.isEligible).length;

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
              <h1 className="text-xl font-bold text-gray-900">Gold Card Status</h1>
              <p className="text-sm text-gray-500">Track your PA approval rates and Gold Card eligibility</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Explanation Card */}
        <Card className="mb-8 bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <Award className="w-6 h-6" />
              What is Gold Card Status?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-yellow-900 mb-4">
                  Gold Card programs allow physicians with high PA approval rates (typically 90%+) to 
                  <strong> bypass prior authorization requirements</strong> for certain treatments.
                </p>
                <ul className="space-y-2 text-sm text-yellow-800">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                    <span>Faster patient access to care</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                    <span>Reduced administrative burden</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                    <span>Recognition of clinical excellence</span>
                  </li>
                </ul>
              </div>
              <div className="bg-white/50 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2">Typical Requirements:</h4>
                <ul className="space-y-1 text-sm text-yellow-800">
                  <li>- 90% or higher approval rate</li>
                  <li>- Minimum 10 PA requests in measurement period</li>
                  <li>- Valid for 1 year, then re-evaluated</li>
                  <li>- Applies to specific treatment codes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gold Card Eligible</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {eligibleCount} / {insurers.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Overall Approval Rate</p>
                  <p className="text-2xl font-bold">
                    {approvalRates.reduce((sum, r) => sum + r.total, 0) > 0
                      ? Math.round(
                          (approvalRates.reduce((sum, r) => sum + r.approved, 0) /
                            approvalRates.reduce((sum, r) => sum + r.total, 0)) *
                            100
                        )
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Completed PAs</p>
                  <p className="text-2xl font-bold">
                    {approvalRates.reduce((sum, r) => sum + r.total, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Per-Insurer Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status by Insurance Provider</CardTitle>
            <CardDescription>
              Track your progress toward Gold Card eligibility with each payer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {insurerData.map((data) => (
                <div
                  key={data.insurer.id}
                  className={`p-4 rounded-lg border ${
                    data.isEligible ? "bg-yellow-50 border-yellow-200" : "bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {data.isEligible && (
                        <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center">
                          <Award className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium">{data.insurer.name}</h3>
                        <p className="text-sm text-gray-500">
                          Threshold: {Math.round(data.threshold * 100)}% approval rate
                        </p>
                      </div>
                    </div>
                    {data.isEligible ? (
                      <Badge className="bg-yellow-500 text-white">
                        <Star className="w-3 h-3 mr-1" />
                        Gold Card Eligible
                      </Badge>
                    ) : data.total >= 10 ? (
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Not Yet Eligible
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">
                        <Clock className="w-3 h-3 mr-1" />
                        Need More PAs
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        Approval Rate: {data.currentRate !== null ? `${Math.round(data.currentRate * 100)}%` : "N/A"}
                      </span>
                      <span className="text-gray-500">
                        {data.approved} / {data.total} approved
                      </span>
                    </div>
                    <Progress
                      value={data.progress}
                      className={`h-2 ${
                        data.isEligible
                          ? "[&>div]:bg-yellow-500"
                          : data.progress >= 80
                          ? "[&>div]:bg-green-500"
                          : data.progress >= 60
                          ? "[&>div]:bg-yellow-500"
                          : "[&>div]:bg-red-500"
                      }`}
                    />
                    {data.total < 10 && (
                      <p className="text-xs text-gray-500">
                        Need {10 - data.total} more completed PAs to qualify
                      </p>
                    )}
                    {data.goldCard?.expiresAt && (
                      <p className="text-xs text-gray-500">
                        Expires: {new Date(data.goldCard.expiresAt).toLocaleDateString()}
                      </p>
                    )}
                    {data.goldCard?.exemptTreatmentCodes && (
                      <p className="text-xs text-green-600">
                        Exempt treatments: {JSON.parse(data.goldCard.exemptTreatmentCodes).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
