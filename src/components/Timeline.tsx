"use client";

import { CheckCircle2, Circle, Clock } from "lucide-react";

type Status = "submitted" | "under_review" | "decision" | "complete";

interface TimelineProps {
  status: Status;
  statusDetail?: "approved" | "denied" | null;
}

const stages = [
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under Review" },
  { key: "decision", label: "Decision" },
  { key: "complete", label: "Complete" },
];

const statusOrder: Record<Status, number> = {
  submitted: 0,
  under_review: 1,
  decision: 2,
  complete: 3,
};

export function Timeline({ status, statusDetail }: TimelineProps) {
  const currentIndex = statusOrder[status];

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => {
          const isComplete = index < currentIndex || (index === currentIndex && status === "complete");
          const isCurrent = index === currentIndex && status !== "complete";

          return (
            <div key={stage.key} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                {index > 0 && (
                  <div
                    className={`flex-1 h-1 ${
                      index <= currentIndex ? "bg-blue-500" : "bg-gray-200"
                    }`}
                  />
                )}
                <div className="relative">
                  {isComplete ? (
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  ) : isCurrent ? (
                    <Clock className="w-8 h-8 text-blue-500" />
                  ) : (
                    <Circle className="w-8 h-8 text-gray-300" />
                  )}
                </div>
                {index < stages.length - 1 && (
                  <div
                    className={`flex-1 h-1 ${
                      index < currentIndex ? "bg-blue-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
              <span
                className={`mt-2 text-xs font-medium text-center ${
                  isComplete
                    ? "text-green-600"
                    : isCurrent
                    ? "text-blue-600"
                    : "text-gray-400"
                }`}
              >
                {stage.label}
                {stage.key === "complete" && statusDetail && (
                  <span
                    className={`block text-xs ${
                      statusDetail === "approved" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    ({statusDetail})
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
