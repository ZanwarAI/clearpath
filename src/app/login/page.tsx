import { redirect } from "next/navigation";
import { getLoggedInUser, login } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Shield, Zap, TrendingUp, Clock, ChevronRight, Lock, CheckCircle2 } from "lucide-react";

export default async function LoginPage() {
  const currentUser = await getLoggedInUser();
  if (currentUser) {
    if (currentUser.role === "physician") redirect("/physician");
    else if (currentUser.role === "admin") redirect("/admin");
    else redirect("/dashboard");
  }

  const allUsers = db.select().from(users).all();
  const physicians = allUsers.filter((u) => u.role === "physician");
  const patients = allUsers.filter((u) => u.role === "patient");
  const admins = allUsers.filter((u) => u.role === "admin");

  async function loginAction(formData: FormData) {
    "use server";
    const email = formData.get("email") as string;
    const result = await login(email);
    if (result) {
      if (result.role === "physician") redirect("/physician");
      else if (result.role === "admin") redirect("/admin");
      else redirect("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-mesh">
      {/* Floating Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-premium flex items-center justify-center shadow-lg shadow-sky-500/25">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-slate-900">ClearPath</span>
              <span className="hidden sm:inline text-slate-400 text-sm ml-2">|</span>
              <span className="hidden sm:inline text-slate-500 text-sm ml-2">Prior Authorization Platform</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
              <Lock className="w-3.5 h-3.5" />
              <span>HIPAA Compliant</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold">
              Demo
            </div>
          </div>
        </div>
      </header>

      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left Panel - Hero Content */}
        <div className="flex-1 flex flex-col justify-center px-6 lg:px-16 py-24 lg:py-12">
          <div className="max-w-xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-100/80 text-sky-700 text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              <span>Reduce PA time by 50%</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-slate-900 leading-[1.1] mb-6">
              Prior Authorization,{" "}
              <span className="text-gradient">Simplified.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg lg:text-xl text-slate-600 leading-relaxed mb-10 max-w-lg">
              AI-powered risk scoring and automated workflows help healthcare teams 
              get approvals faster while reducing administrative burden.
            </p>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-6 mb-10">
              <div>
                <div className="text-3xl font-bold text-slate-900">10.5K+</div>
                <div className="text-sm text-slate-500">PAs Processed</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-emerald-600">73%</div>
                <div className="text-sm text-slate-500">Approval Rate</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-sky-600">5 days</div>
                <div className="text-sm text-slate-500">Avg. Turnaround</div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3 mb-10">
              {[
                { icon: TrendingUp, text: "Real-time AI risk scoring with 89% accuracy" },
                { icon: Clock, text: "Automated status updates and notifications" },
                { icon: CheckCircle2, text: "Appeals management and Gold Card tracking" },
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <feature.icon className="w-4 h-4 text-slate-600" />
                  </div>
                  <span className="text-sm">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* Trust Logos */}
            <div className="flex items-center gap-6 text-slate-400 text-xs">
              <span>Trusted by healthcare systems nationwide</span>
              <div className="h-4 w-px bg-slate-200" />
              <span>SOC 2 Type II</span>
              <span>HIPAA</span>
            </div>
          </div>
        </div>

        {/* Right Panel - Login Cards */}
        <div className="lg:w-[480px] xl:w-[520px] bg-white/50 backdrop-blur-sm border-l border-slate-200/60 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome back</h2>
              <p className="text-slate-500">Select a demo account to continue</p>
            </div>

            {/* Role Sections */}
            <div className="space-y-6">
              {/* Physicians */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Physicians</span>
                </div>
                <div className="space-y-2">
                  {physicians.map((u) => (
                    <form key={u.id} action={loginAction}>
                      <input type="hidden" name="email" value={u.email} />
                      <Button
                        type="submit"
                        variant="outline"
                        className="w-full justify-between h-auto py-3.5 px-4 bg-white hover:bg-sky-50/50 border-slate-200 hover:border-sky-300 rounded-xl transition-all duration-200 group shadow-sm hover:shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                            {u.firstName[0]}{u.lastName[0]}
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-slate-900">Dr. {u.firstName} {u.lastName}</div>
                            <div className="text-xs text-slate-500">{u.organization}</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all" />
                      </Button>
                    </form>
                  ))}
                </div>
              </div>

              {/* Patients */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Patients</span>
                </div>
                <div className="space-y-2">
                  {patients.map((u) => (
                    <form key={u.id} action={loginAction}>
                      <input type="hidden" name="email" value={u.email} />
                      <Button
                        type="submit"
                        variant="outline"
                        className="w-full justify-between h-auto py-3.5 px-4 bg-white hover:bg-emerald-50/50 border-slate-200 hover:border-emerald-300 rounded-xl transition-all duration-200 group shadow-sm hover:shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                            {u.firstName[0]}{u.lastName[0]}
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-slate-900">{u.firstName} {u.lastName}</div>
                            <div className="text-xs text-slate-500">{u.email}</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                      </Button>
                    </form>
                  ))}
                </div>
              </div>

              {/* Admins */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Administrators</span>
                </div>
                <div className="space-y-2">
                  {admins.map((u) => (
                    <form key={u.id} action={loginAction}>
                      <input type="hidden" name="email" value={u.email} />
                      <Button
                        type="submit"
                        variant="outline"
                        className="w-full justify-between h-auto py-3.5 px-4 bg-white hover:bg-violet-50/50 border-slate-200 hover:border-violet-300 rounded-xl transition-all duration-200 group shadow-sm hover:shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                            {u.firstName[0]}{u.lastName[0]}
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-slate-900">{u.firstName} {u.lastName}</div>
                            <div className="text-xs text-slate-500">{u.email}</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
                      </Button>
                    </form>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-slate-200 text-center">
              <p className="text-xs text-slate-400">
                This is a demo environment. No real patient data is stored.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
