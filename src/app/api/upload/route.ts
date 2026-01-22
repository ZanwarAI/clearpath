import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const paId = formData.get("paId") as string | null;

    if (!file || !paId) {
      return NextResponse.json(
        { error: "File and PA ID are required" },
        { status: 400 }
      );
    }

    // In a real app, we would upload the file to storage (S3, etc.)
    // For this demo, we just store the file reference in the database

    const doc = {
      id: uuidv4(),
      paId,
      fileName: file.name,
      fileType: file.type,
      uploadedAt: new Date().toISOString(),
    };

    db.insert(documents).values(doc).run();

    return NextResponse.json({ success: true, document: doc });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
