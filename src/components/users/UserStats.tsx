import type { LucideIcon } from "lucide-react";

type UserStatProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  toneClass: string;
  isLoading: boolean;
};

export function UserStatItem({ label, value, icon: Icon, toneClass, isLoading }: UserStatProps) {
  return (
    <article className="group rounded-xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="mt-1 h-8">
            {isLoading ? (
              <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
            ) : (
              <p className="text-2xl font-semibold leading-8 text-foreground">{value}</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function UserStatsGrid({ stats, isLoading }: { stats: any[]; isLoading: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {stats.map((stat) => (
        <UserStatItem key={stat.label} {...stat} isLoading={isLoading} />
      ))}
    </div>
  );
}
