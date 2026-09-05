import type { Source } from "@/types";
import { Badge } from "@/components/ui/badge";

const SOURCE_LABEL: Record<Source, string> = {
  observed: "Observed",
  inferred: "Inferred",
  user_confirmed: "User Confirmed",
};

const SOURCE_VARIANT: Record<Source, "observed" | "inferred" | "confirmed"> = {
  observed: "observed",
  inferred: "inferred",
  user_confirmed: "confirmed",
};

export function SourceBadge({ source }: { source: Source }) {
  return (
    <Badge variant={SOURCE_VARIANT[source]} className="gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {SOURCE_LABEL[source]}
    </Badge>
  );
}
