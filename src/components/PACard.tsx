import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { ChevronRight, Calendar } from "lucide-react";
import type { PriorAuthorization } from "@/lib/schema";

interface PACardProps {
  pa: PriorAuthorization;
}

export function PACard({ pa }: PACardProps) {
  const submittedDate = pa.submittedAt
    ? new Date(pa.submittedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "N/A";

  return (
    <Link href={`/pa/${pa.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{pa.treatmentName}</h3>
              <div className="flex items-center gap-4 mt-2">
                <StatusBadge
                  status={pa.status as "submitted" | "under_review" | "decision" | "complete"}
                  statusDetail={pa.statusDetail as "approved" | "denied" | null}
                />
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  {submittedDate}
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
