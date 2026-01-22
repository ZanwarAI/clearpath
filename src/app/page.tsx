import { redirect } from "next/navigation";
import { getLoggedInPatient } from "@/lib/auth";

export default async function Home() {
  const patient = await getLoggedInPatient();

  if (patient) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
