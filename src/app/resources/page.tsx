import { redirect } from "next/navigation";
import Link from "next/link";
import { getLoggedInPatient, getLoggedInUser, logout } from "@/lib/auth";
import { db } from "@/lib/db";
import { advocacyResources, ehrRecords } from "@/lib/schema";
import { eq, or, isNull } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  BookOpen,
  Scale,
  DollarSign,
  Shield,
  Phone,
  ExternalLink,
  FileText,
  Heart,
  LogOut,
} from "lucide-react";

export default async function ResourcesPage() {
  const patient = await getLoggedInPatient();
  const user = await getLoggedInUser();

  if (!patient || !user) {
    redirect("/login");
  }

  // Get patient's diagnosis categories from EHR
  const ehr = db
    .select()
    .from(ehrRecords)
    .where(eq(ehrRecords.patientId, patient.id))
    .get();

  const diagnoses = ehr?.diagnoses ? JSON.parse(ehr.diagnoses) : [];
  const patientCategories = diagnoses.map((d: { code: string }) => {
    if (d.code.startsWith("C")) return "oncology";
    if (d.code.startsWith("M0") || d.code.startsWith("M05") || d.code.startsWith("M06")) return "rheumatology";
    if (d.code.startsWith("I")) return "cardiology";
    return null;
  }).filter(Boolean);

  // Get relevant resources
  const resources = db
    .select()
    .from(advocacyResources)
    .where(
      or(
        isNull(advocacyResources.diagnosisCategory),
        ...patientCategories.map((cat: string) => eq(advocacyResources.diagnosisCategory, cat))
      )
    )
    .all();

  const getCategoryIcon = (category: string | null) => {
    switch (category) {
      case "appeals":
        return <Scale className="w-5 h-5" />;
      case "rights":
        return <Shield className="w-5 h-5" />;
      case "financial_assistance":
        return <DollarSign className="w-5 h-5" />;
      case "legal":
        return <FileText className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case "appeals":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "rights":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "financial_assistance":
        return "bg-green-100 text-green-700 border-green-200";
      case "legal":
        return "bg-orange-100 text-orange-700 border-orange-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const groupedResources = {
    appeals: resources.filter(r => r.category === "appeals"),
    rights: resources.filter(r => r.category === "rights"),
    financial_assistance: resources.filter(r => r.category === "financial_assistance"),
    legal: resources.filter(r => r.category === "legal"),
  };

  async function logoutAction() {
    "use server";
    await logout();
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-blue-600">Patient Resources</h1>
              <p className="text-sm text-gray-500">Help and advocacy for prior authorization</p>
            </div>
          </div>
          <form action={logoutAction}>
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Quick Help */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Heart className="w-6 h-6" />
              You Are Not Alone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-900 mb-4">
              Dealing with prior authorization denials can be frustrating and overwhelming. 
              Remember: <strong>70% of denied claims are eventually overturned</strong> on appeal. 
              These resources are here to help you navigate the process.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white/60 rounded-lg p-3">
                <h4 className="font-medium text-blue-900 text-sm">If Your PA is Denied:</h4>
                <ul className="text-sm text-blue-800 mt-1 space-y-1">
                  <li>1. Don&apos;t give up</li>
                  <li>2. Request the denial in writing</li>
                  <li>3. Ask your doctor to appeal</li>
                </ul>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <h4 className="font-medium text-blue-900 text-sm">Emergency Contacts:</h4>
                <ul className="text-sm text-blue-800 mt-1 space-y-1">
                  <li>
                    <Phone className="w-3 h-3 inline mr-1" />
                    Patient Advocate: 1-800-532-5274
                  </li>
                  <li>
                    <Phone className="w-3 h-3 inline mr-1" />
                    State Insurance: Contact your state
                  </li>
                </ul>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <h4 className="font-medium text-blue-900 text-sm">Key Deadlines:</h4>
                <ul className="text-sm text-blue-800 mt-1 space-y-1">
                  <li>Internal Appeal: 180 days</li>
                  <li>External Review: 4 months</li>
                  <li>Urgent cases: 72 hours</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appeals Resources */}
        {groupedResources.appeals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-600" />
              Understanding the Appeals Process
            </h2>
            <div className="space-y-4">
              {groupedResources.appeals.map((resource) => (
                <Card key={resource.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{resource.title}</CardTitle>
                        <CardDescription>{resource.description}</CardDescription>
                      </div>
                      <Badge className={getCategoryColor(resource.category)}>
                        {getCategoryIcon(resource.category)}
                        <span className="ml-1 capitalize">{resource.category?.replace("_", " ")}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  {resource.content && (
                    <CardContent>
                      <pre className="whitespace-pre-wrap text-sm font-sans text-gray-700 bg-gray-50 p-4 rounded-lg">
                        {resource.content}
                      </pre>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Rights Resources */}
        {groupedResources.rights.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              Your Rights as a Patient
            </h2>
            <div className="space-y-4">
              {groupedResources.rights.map((resource) => (
                <Card key={resource.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{resource.title}</CardTitle>
                        <CardDescription>{resource.description}</CardDescription>
                      </div>
                      {resource.diagnosisCategory && (
                        <Badge variant="outline" className="capitalize">
                          {resource.diagnosisCategory}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  {resource.content && (
                    <CardContent>
                      <pre className="whitespace-pre-wrap text-sm font-sans text-gray-700 bg-gray-50 p-4 rounded-lg">
                        {resource.content}
                      </pre>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Financial Resources */}
        {groupedResources.financial_assistance.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Financial Assistance
            </h2>
            <div className="space-y-4">
              {groupedResources.financial_assistance.map((resource) => (
                <Card key={resource.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{resource.title}</CardTitle>
                    <CardDescription>{resource.description}</CardDescription>
                  </CardHeader>
                  {resource.content && (
                    <CardContent>
                      <pre className="whitespace-pre-wrap text-sm font-sans text-gray-700 bg-gray-50 p-4 rounded-lg">
                        {resource.content}
                      </pre>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* External Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Additional Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <a
                href="https://www.healthcare.gov/appeal-insurance-company-decision/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 border rounded-lg hover:bg-gray-50 flex items-start gap-3"
              >
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Healthcare.gov Appeals Guide</p>
                  <p className="text-sm text-gray-500">Official guide to appealing insurance decisions</p>
                </div>
              </a>
              <a
                href="https://www.patientadvocate.org"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 border rounded-lg hover:bg-gray-50 flex items-start gap-3"
              >
                <Heart className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium">Patient Advocate Foundation</p>
                  <p className="text-sm text-gray-500">Free case management and financial aid</p>
                </div>
              </a>
              <a
                href="https://www.cms.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 border rounded-lg hover:bg-gray-50 flex items-start gap-3"
              >
                <FileText className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium">CMS (Medicare/Medicaid)</p>
                  <p className="text-sm text-gray-500">Government healthcare programs info</p>
                </div>
              </a>
              <a
                href="https://www.naic.org"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 border rounded-lg hover:bg-gray-50 flex items-start gap-3"
              >
                <Scale className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium">State Insurance Commissioners</p>
                  <p className="text-sm text-gray-500">File complaints with your state</p>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
