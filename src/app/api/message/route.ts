import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages } from "@/lib/schema";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paId, patientId, content } = body;

    if (!paId || !patientId || !content) {
      return NextResponse.json(
        { error: "PA ID, Patient ID, and content are required" },
        { status: 400 }
      );
    }

    const message = {
      id: uuidv4(),
      paId,
      patientId,
      content,
      sentAt: new Date().toISOString(),
    };

    db.insert(messages).values(message).run();

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Message error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
