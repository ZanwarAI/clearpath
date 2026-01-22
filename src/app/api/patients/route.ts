import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/schema";

export async function GET() {
  const allPatients = db.select().from(patients).all();
  return NextResponse.json({ patients: allPatients });
}
