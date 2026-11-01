import type { ReactNode } from "react";
import {
  AVAILABILITY_STATUS_META,
  MEDIA_TYPE_META,
  PERMISSION_STATUS_META,
  SCOPE_META,
} from "@/lib/constants";
import {
  availabilityLabel,
  mediaLabel,
  permissionLabel,
  scopeLabel,
} from "@/lib/format";
import type { Source } from "@/lib/types";

type BadgeTone = "green" | "blue" | "amber" | "red" | "stone" | "brand";

const BADGE_TONES: Record<BadgeTone, string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200",
  blue: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-200",
  amber: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
  red: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200",
  stone: "border-line bg-background text-muted",
  brand: "border-brand/15 bg-brand/5 text-brand",
};

const DOT_TONES: Record<BadgeTone, string> = {
  green: "bg-emerald-500",
  blue: "bg-sky-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
  stone: "bg-stone-400",
  brand: "bg-accent",
};

function toneClass(tone: string): string {
  return BADGE_TONES[tone as BadgeTone] ?? BADGE_TONES.stone;
}

function dotClass(tone: string): string {
  return DOT_TONES[tone as BadgeTone] ?? DOT_TONES.stone;
}

export function Badge({
  tone = "stone",
  dot = false,
  title,
  children,
}: {
  tone?: string;
  dot?: boolean;
  title?: string;
  children: ReactNode;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none ${toneClass(tone)}`}
    >
      {dot ? (
        <span
          aria-hidden
          className={`size-1.5 shrink-0 rounded-full ${dotClass(tone)}`}
        />
      ) : null}
      {children}
    </span>
  );
}

export function SourceBadges({
  source,
  detailed = false,
}: {
  source: Source;
  detailed?: boolean;
}) {
  const availability = AVAILABILITY_STATUS_META[source.availabilityStatus];
  const permission = PERMISSION_STATUS_META[source.permissionStatus];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge
        tone={availability.tone}
        dot
        title={availability.description}
      >
        {availabilityLabel(source.availabilityStatus, source.mediaType)}
      </Badge>
      <Badge tone={permission.tone} title={permission.description}>
        {permissionLabel(source.permissionStatus)}
      </Badge>
      {detailed ? (
        <>
          <Badge tone="brand" title={MEDIA_TYPE_META[source.mediaType].description}>
            {mediaLabel(source)}
          </Badge>
          <Badge tone="stone" title={SCOPE_META[source.scope].description}>
            {scopeLabel(source)}
          </Badge>
        </>
      ) : null}
    </div>
  );
}
