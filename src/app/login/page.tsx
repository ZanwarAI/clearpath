import { redirect } from "next/navigation";
import { getLoggedInUser, login } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-screen bg-white flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 p-12 flex-col justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">ClearPath</h1>
        </div>
        <div>
          <blockquote className="text-xl text-slate-300 leading-relaxed">
            &ldquo;Prior authorization delays cost patients time they don&apos;t have. 
            ClearPath helps healthcare teams cut through the red tape.&rdquo;
          </blockquote>
          <p className="mt-6 text-slate-400 text-sm">
            Reducing PA processing time by 50% with AI-powered automation
          </p>
        </div>
        <div className="text-slate-500 text-sm">
          Built for the Healthcare Hackathon 2026
        </div>
      </div>

      {/* Right side - Login */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <h1 className="text-2xl font-semibold text-slate-900">ClearPath</h1>
            <p className="text-slate-500 mt-1">Healthcare Prior Authorization Platform</p>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-medium text-slate-900">Sign in to continue</h2>
            <p className="text-slate-500 mt-1 text-sm">Select a demo account below</p>
          </div>

          {/* Physicians */}
          <div className="mb-6">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
              Physicians
            </p>
            <div className="space-y-2">
              {physicians.map((u) => (
                <form key={u.id} action={loginAction}>
                  <input type="hidden" name="email" value={u.email} />
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full justify-start h-auto py-3 px-4 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium text-sm mr-3">
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-slate-900">Dr. {u.firstName} {u.lastName}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </div>
                  </Button>
                </form>
              ))}
            </div>
          </div>

          {/* Patients */}
          <div className="mb-6">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
              Patients
            </p>
            <div className="space-y-2">
              {patients.map((u) => (
                <form key={u.id} action={loginAction}>
                  <input type="hidden" name="email" value={u.email} />
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full justify-start h-auto py-3 px-4 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium text-sm mr-3">
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-slate-900">{u.firstName} {u.lastName}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </div>
                  </Button>
                </form>
              ))}
            </div>
          </div>

          {/* Admins */}
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
              Administrators
            </p>
            <div className="space-y-2">
              {admins.map((u) => (
                <form key={u.id} action={loginAction}>
                  <input type="hidden" name="email" value={u.email} />
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full justify-start h-auto py-3 px-4 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium text-sm mr-3">
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-slate-900">{u.firstName} {u.lastName}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </div>
                  </Button>
                </form>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
