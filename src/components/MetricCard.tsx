import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  hint,
  icon,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  accent?: boolean;
}) {
  return (
    <Card
      className={cn(
        "p-5 transition-colors",
        accent && "bg-primary text-primary-foreground border-transparent"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "text-xs font-medium uppercase tracking-wide",
              accent ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              "font-display mt-2 text-3xl font-semibold leading-none",
              accent ? "text-white" : "text-foreground"
            )}
          >
            {value}
          </p>
          {hint && (
            <p
              className={cn(
                "mt-2 text-xs",
                accent ? "text-primary-foreground/70" : "text-muted-foreground"
              )}
            >
              {hint}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
              accent ? "bg-white/12 text-white" : "bg-accent text-accent-foreground"
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
