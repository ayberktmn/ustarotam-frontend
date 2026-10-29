"use client";

import { useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, LoaderCircle, Mail, MailWarning, Pencil, Phone, UserRound, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-provider";
import { Link } from "@/i18n/navigation";
import { workshopApplicationService, type WorkshopApplication } from "@/lib/api/endpoints/workshop-applications";
import { authService, profileUpdateInputSchema } from "@/lib/api/endpoints/auth";
import { getSessionSignal, isSignedOut } from "@/lib/api/token-store";
import { getApiErrorMessageKey } from "@/lib/toast/api-error-key";
import { queryKeys } from "@/lib/query/keys";
import type { AuthUser } from "@/types/auth";

type ApplicationCardTone = {
  card: string;
  icon: string;
  accent: string;
  status: string;
};

const neutralApplicationTone: ApplicationCardTone = {
  card: "border-line bg-card hover:border-ink-muted/30",
  icon: "bg-muted text-ink-muted",
  accent: "text-ink-muted",
  status: "text-ink-muted",
};

const applicationCardTones = {
  DRAFT: neutralApplicationTone,
  PENDING: {
    card: "border-amber-200 bg-amber-50/50 hover:border-amber-300",
    icon: "bg-amber-100 text-amber-700",
    accent: "text-amber-700",
    status: "text-amber-800",
  },
  VERIFIED: {
    card: "border-emerald-200 bg-emerald-50/50 hover:border-emerald-300",
    icon: "bg-emerald-100 text-emerald-700",
    accent: "text-emerald-700",
    status: "text-emerald-700",
  },
  REJECTED: {
    card: "border-red-200 bg-red-50/50 hover:border-red-300",
    icon: "bg-red-100 text-red-700",
    accent: "text-red-700",
    status: "text-red-700",
  },
  SUSPENDED: {
    card: "border-orange-200 bg-orange-50/50 hover:border-orange-300",
    icon: "bg-orange-100 text-orange-700",
    accent: "text-orange-700",
    status: "text-orange-800",
  },
} satisfies Record<WorkshopApplication["status"], ApplicationCardTone>;

const applicationStatusKeys = {
  DRAFT: "profile.applicationStatuses.DRAFT",
  PENDING: "profile.applicationStatuses.PENDING",
  VERIFIED: "profile.applicationStatuses.VERIFIED",
  REJECTED: "profile.applicationStatuses.REJECTED",
  SUSPENDED: "profile.applicationStatuses.SUSPENDED",
} as const;

function getApplicationCardTone(status: string): ApplicationCardTone {
  return applicationCardTones[status as keyof typeof applicationCardTones] ?? neutralApplicationTone;
}

function getApplicationStatusKey(status: string) {
  return applicationStatusKeys[status as keyof typeof applicationStatusKeys] ?? "profile.applicationStatuses.UNKNOWN";
}

function ProfileDetails() {
  const t = useTranslations("account");
  const { user } = useAuth();
  const errors = useTranslations("errors");
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<{ firstName: string; lastName: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const pending = useRef(false);
  const applications = useQuery({queryKey: ["workshop-applications", user?.id, "mine"], queryFn: workshopApplicationService.mine, enabled: Boolean(user), retry: false, staleTime: 30_000});

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !draft || pending.current) return;
    const names = { firstName: draft.firstName.trim(), lastName: draft.lastName.trim() };
    if (Object.values(names).some((name) => name.length < 2 || name.length > 100)) {
      setError(t("profile.validationError"));
      return;
    }
    const changes = Object.fromEntries(Object.entries(names).filter(([key, value]) => value !== user[key as "firstName" | "lastName"]));
    if (!Object.keys(changes).length) { setDraft(null); return; }
    const parsed = profileUpdateInputSchema.safeParse(changes);
    if (!parsed.success) {
      setError(t("profile.validationError"));
      return;
    }
    const signal = getSessionSignal();
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      await queryClient.cancelQueries({ queryKey: queryKeys.auth.me });
      if (signal.aborted || isSignedOut()) return;
      const updated = await authService.updateProfile(parsed.data);
      if (signal.aborted || isSignedOut()) return;
      queryClient.setQueryData<AuthUser | null>(queryKeys.auth.me, (current) =>
        current?.id === user.id ? updated : current,
      );
      setDraft(null);
      setSaved(true);
    } catch (cause) {
      if (!signal.aborted) setError(`${t("profile.saveError")} ${errors(getApiErrorMessageKey(cause))}`);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  if (!user) {
    return null;
  }

  const rows = [
    {
      key: "firstName",
      label: t("profile.firstName"),
      value: user.firstName,
      icon: UserRound,
    },
    {
      key: "lastName",
      label: t("profile.lastName"),
      value: user.lastName,
      icon: UserRound,
    },
    {
      key: "email",
      label: t("profile.email"),
      value: user.email,
      icon: Mail,
    },
    {
      key: "phone",
      label: t("profile.phone"),
      value: user.phone ?? t("profile.notProvided"),
      icon: Phone,
    },
  ];
  const application = applications.data?.find(item => item.status === "PENDING") ?? applications.data?.find(item => item.status === "DRAFT") ?? applications.data?.[0];
  const applicationTone = application ? getApplicationCardTone(application.status) : neutralApplicationTone;
  const applicationStatusLabel = t(getApplicationStatusKey(application?.status ?? "UNKNOWN"));
  const rejectionReason = application?.status === "REJECTED" ? application.rejectionReason?.trim() : undefined;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 text-ink">{t("profile.title")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t("profile.description")}
        </p>
      </header>

      <form noValidate onSubmit={save} aria-busy={saving} className="rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-h3 text-ink">{t("profile.personalTitle")}</h2>
          {draft ? (
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => { setDraft(null); setError(""); }}>
                {t("profile.cancel")}
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" /> : null}
                {t(saving ? "profile.saving" : "profile.save")}
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => {
              setDraft({ firstName: user.firstName, lastName: user.lastName });
              setError("");
              setSaved(false);
            }}>
              <Pencil aria-hidden="true" className="size-4 text-brand" />
              {t("profile.edit")}
            </Button>
          )}
        </div>

        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          {rows.map((row) => {
            const Icon = row.icon;

            return (
              <div key={row.key} className="min-w-0">
                <dt className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <Icon aria-hidden="true" className="size-3.5 text-brand" />
                  {draft && (row.key === "firstName" || row.key === "lastName") ? <label htmlFor={`profile-${row.key}`}>{row.label}</label> : row.label}
                </dt>
                <dd className="mt-1.5 min-w-0 break-words text-sm font-semibold text-ink">
                  {draft && (row.key === "firstName" || row.key === "lastName") ? (
                    <Input
                      id={`profile-${row.key}`}
                      name={row.key}
                      type="text"
                      autoComplete={row.key === "firstName" ? "given-name" : "family-name"}
                      value={draft[row.key]}
                      required
                      minLength={2}
                      maxLength={100}
                      disabled={saving}
                      aria-describedby={error ? "profile-save-error" : undefined}
                      onChange={(event) => { setDraft({ ...draft, [row.key]: event.target.value }); setError(""); }}
                    />
                  ) : <span className={row.key === "email" ? "block truncate" : undefined} title={row.key === "email" ? row.value : undefined}>{row.value}</span>}
                </dd>
              </div>
            );
          })}
        </dl>
        {draft ? <p className="mt-4 text-sm text-muted-foreground">{t("profile.emailChangeUnavailable")}</p> : null}
        {error ? <p id="profile-save-error" role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
        {saved ? <p role="status" className="mt-4 text-sm text-success">{t("profile.saved")}</p> : null}
      </form>

      {application ? (
        <Link
          href="/usta-ol"
          className={`group block rounded-2xl border p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-md sm:p-6 ${applicationTone.card}`}
        >
          <div className="flex items-start gap-4">
            <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${applicationTone.icon}`}>
              <Wrench aria-hidden="true" className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-semibold tracking-wide uppercase ${applicationTone.accent}`}>
                {t("profile.workshopApplication")}
              </p>
              <h2 className="mt-1 truncate text-h3 text-ink">{application.name}</h2>
              <p className={`mt-1 text-sm font-semibold ${applicationTone.status}`}>
                {applicationStatusLabel}
              </p>
            </div>
            <ArrowRight aria-hidden="true" className="mt-1 size-5 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-brand" />
          </div>
          {rejectionReason ? (
            <div className="mt-4 border-t border-red-200 pt-4">
              <p className="text-sm font-semibold text-red-700">{t("profile.rejectionReason")}</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
                {rejectionReason}
              </p>
            </div>
          ) : null}
        </Link>
      ) : null}
      {applications.isError ? <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive"><p>{t("profile.applicationLoadError")}</p><Button type="button" variant="link" size="sm" onClick={() => void applications.refetch()}>{t("profile.retry")}</Button></div> : null}

      <section className="rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6">
        <h2 className="text-h3 text-ink">{t("profile.statusTitle")}</h2>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-muted px-4 py-3">
          <span className="text-sm font-semibold text-ink">
            {t("profile.emailStatus")}
          </span>
          <Badge variant={user.emailVerified ? "success" : "outline"}>
            {user.emailVerified ? (
              <BadgeCheck aria-hidden="true" />
            ) : (
              <MailWarning aria-hidden="true" />
            )}
            {user.emailVerified
              ? t("profile.verified")
              : t("profile.unverified")}
          </Badge>
        </div>

      </section>
    </div>
  );
}

export { ProfileDetails };
