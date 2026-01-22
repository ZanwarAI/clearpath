import { Badge } from "@/components/ui/badge";

type Status = "submitted" | "under_review" | "decision" | "complete";
type StatusDetail = "approved" | "denied" | null;

interface StatusBadgeProps {
  status: Status;
  statusDetail?: StatusDetail;
}

export function StatusBadge({ status, statusDetail }: StatusBadgeProps) {
  if (status === "complete" && statusDetail === "approved") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Approved
      </Badge>
    );
  }

  if (status === "complete" && statusDetail === "denied") {
    return (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
        Denied
      </Badge>
    );
  }

  if (status === "under_review") {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        Under Review
      </Badge>
    );
  }

  if (status === "submitted") {
    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
        Submitted
      </Badge>
    );
  }

  return (
    <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
      {status}
    </Badge>
  );
}
