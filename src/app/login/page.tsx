import { redirect } from "next/navigation";
import { getLoggedInUser, login } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Shield, Activity, Users, ArrowRight } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-cyan-50">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">ClearPath</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
            <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-700 font-medium">Demo Mode</span>
          </div>
        </div>
      </header>

      <div className="min-h-screen flex">
        {/* Left side - Hero */}
        <div className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-center">
          <div className="max-w-lg">
            <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-6">
              Prior Authorization,{" "}
              <span className="bg-gradient-to-r from-sky-600 to-cyan-500 bg-clip-text text-transparent">
                Simplified
              </span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 leading-relaxed">
              Cut through the red tape. ClearPath uses AI to streamline prior authorizations, 
              reducing processing time by 50% while improving approval rates.
            </p>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">AI Risk Scoring</p>
                  <p className="text-sm text-slate-500">Predict approval likelihood instantly</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Multi-Role Access</p>
                  <p className="text-sm text-slate-500">Patients, physicians & admins</p>
                </div>
              </div>
            </div>

            <div className="mt-12 p-6 rounded-2xl bg-white/60 backdrop-blur border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-sky-500 border-2 border-white flex items-center justify-center text-white text-xs font-medium">JD</div>
                  <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-xs font-medium">SM</div>
                  <div className="w-8 h-8 rounded-full bg-violet-500 border-2 border-white flex items-center justify-center text-white text-xs font-medium">AK</div>
                </div>
                <div className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">10,500+</span> PAs processed
                </div>
              </div>
              <p className="text-sm text-slate-500">
                &ldquo;ClearPath helped us reduce our PA turnaround time from 14 days to just 5.&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Right side - Login Cards */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-900">ClearPath</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
              <p className="text-slate-500 mt-1">Select a demo account to continue</p>
            </div>

            <div className="hidden lg:block mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
              <p className="text-slate-500 mt-1">Select a demo account to continue</p>
            </div>

            {/* Physicians */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-sky-500"></div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Physicians</p>
              </div>
              <div className="space-y-2">
                {physicians.map((u) => (
                  <form key={u.id} action={loginAction}>
                    <input type="hidden" name="email" value={u.email} />
                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full justify-between h-auto py-4 px-4 bg-white hover:bg-sky-50 border-slate-200 hover:border-sky-300 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-medium text-sm">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-slate-900">Dr. {u.firstName} {u.lastName}</div>
                          <div className="text-xs text-slate-500">{u.organization}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
                    </Button>
                  </form>
                ))}
              </div>
            </div>

            {/* Patients */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Patients</p>
              </div>
              <div className="space-y-2">
                {patients.map((u) => (
                  <form key={u.id} action={loginAction}>
                    <input type="hidden" name="email" value={u.email} />
                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full justify-between h-auto py-4 px-4 bg-white hover:bg-emerald-50 border-slate-200 hover:border-emerald-300 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-medium text-sm">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-slate-900">{u.firstName} {u.lastName}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                    </Button>
                  </form>
                ))}
              </div>
            </div>

            {/* Admins */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Administrators</p>
              </div>
              <div className="space-y-2">
                {admins.map((u) => (
                  <form key={u.id} action={loginAction}>
                    <input type="hidden" name="email" value={u.email} />
                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full justify-between h-auto py-4 px-4 bg-white hover:bg-violet-50 border-slate-200 hover:border-violet-300 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-medium text-sm">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-slate-900">{u.firstName} {u.lastName}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-violet-500 group-hover:translate-x-1 transition-all" />
                    </Button>
                  </form>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
