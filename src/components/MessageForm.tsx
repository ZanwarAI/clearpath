"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, CheckCircle2, Loader2 } from "lucide-react";

interface MessageFormProps {
  paId: string;
  patientId: string;
}

export function MessageForm({ paId, patientId }: MessageFormProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSending(true);
    setSendSuccess(false);

    try {
      const res = await fetch("/api/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paId,
          patientId,
          content: message,
        }),
      });

      if (res.ok) {
        setSendSuccess(true);
        setMessage("");
        // Reset success state after 3 seconds
        setTimeout(() => setSendSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="message">Message to Care Team</Label>
        <Textarea
          id="message"
          placeholder="Type your message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="mt-1"
          disabled={isSending}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSending || !message.trim()}>
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Message
            </>
          )}
        </Button>
        {sendSuccess && (
          <div className="flex items-center text-green-600 text-sm">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Message sent successfully!
          </div>
        )}
      </div>
    </form>
  );
}
