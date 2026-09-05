import type { Source } from "@/types";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";

const SOURCE_LABEL: Record<Source, string> = {
  observed: t("直接紀錄"),
  inferred: t("模型推估"),
  user_confirmed: t("使用者確認"),
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
