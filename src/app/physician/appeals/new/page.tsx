import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import NewAppealClient from "./NewAppealClient";

export default function NewAppealPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <NewAppealClient />
    </Suspense>
  );
}
