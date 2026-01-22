import { redirect } from "next/navigation";
import { getLoggedInUser } from "@/lib/auth";

export default async function AdminPage() {
  const user = await getLoggedInUser();
  
  if (!user || user.role !== "admin") {
    redirect("/login");
  }
  
  redirect("/admin/analytics");
}
