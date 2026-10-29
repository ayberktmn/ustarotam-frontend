"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Building2, Check, CircleCheck, Clock3, FileCheck2, FileText, Info, LoaderCircle, MapPin, Search, Send, ShieldCheck, Store, TriangleAlert, UserRoundCheck } from "lucide-react";
import { useAuth } from "@/features/auth/auth-provider";
import { useResendCooldown } from "@/features/auth/use-resend-cooldown";
import { useDistricts, useProvinces } from "@/features/catalog/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "@/i18n/navigation";
import { catalogService, workshopApplicationService } from "@/lib/api";
import type { ApplicationDocument } from "@/lib/api/endpoints/workshop-applications";
import { ApiError } from "@/lib/api/errors";
import { getApiErrorMessageKey } from "@/lib/toast/api-error-key";
import { businessDraftSchema, businessTypes, businessTypeSchema, businessTypeTranslationKeys, sanitizeApplicationPhone, requiredDocuments, validCatalogSelection, type BusinessDraft, type ApplicationDocumentType } from "@/lib/workshop-application";
import { ApplicationLocation, type ApplicationLocationDraft } from "./application-location";
import { ApplicationDocuments, type ApplicationFiles } from "./application-documents";
import { ApplicationServices, type ApplicationServicesDraft } from "./application-services";

const steps = ["business", "location", "services", "documents", "review"] as const;
const documentStatusKeys = {UPLOADED: "UPLOADED", PENDING: "PENDING", CLEAN: "CLEAN", APPROVED: "APPROVED", REJECTED: "REJECTED", QUARANTINED: "QUARANTINED", INFECTED: "INFECTED", SCAN_FAILED: "SCAN_FAILED"} as const;
function documentStatusKey(status?: string): keyof typeof documentStatusKeys { return status && status in documentStatusKeys ? status as keyof typeof documentStatusKeys : "UPLOADED"; }
type FieldErrors = Partial<Record<string, string>>;
type Application = {id: string; status: "DRAFT" | "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED"; name: string; businessType: "SAHIS" | "LIMITED" | "ANONIM"; phone: string; address: string; province: {id: string; name: string}; district: {id: string; name: string}; industrialSite?: {id: string; name: string} | null; vehicleTypes?: Array<{id: string}>; brands?: Array<{id: string}>; specialties?: Array<{id: string}>; rejectionReason?: string | null; createdAt?: string};
const stepIcons = [Building2, MapPin, ShieldCheck, Send, FileText];
const validationDetailsSchema = z.object({
  issues: z.array(z.object({
    path: z.union([z.string(), z.array(z.union([z.string(), z.number()]))]),
  }).passthrough()),
}).passthrough();

function hasValidationIssueFor(error: unknown, field: string): boolean {
  if (!(error instanceof ApiError) || error.code !== "VALIDATION_ERROR") {
    return false;
  }

  const details = validationDetailsSchema.safeParse(error.details);
  return details.success && details.data.issues.some(({path}) =>
    (Array.isArray(path) ? path[0] : path) === field,
  );
}

export function WorkshopApplication(): ReactElement {
  const {user, isLoading} = useAuth();
  const router = useRouter();
  const t = useTranslations("workshopApplication");
  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace({pathname: "/giris", query: {returnUrl: window.location.pathname + window.location.search}});
    else if (user.emailVerified && user.roles.includes("WORKSHOP_OWNER")) router.replace("/usta-panel");
  }, [user, isLoading, router]);
  if (isLoading || !user || (user.emailVerified && user.roles.includes("WORKSHOP_OWNER"))) {
    return <div role="status" className="page-container section-y flex items-center gap-3 text-muted-foreground"><LoaderCircle aria-hidden="true" className="size-5 animate-spin" />{t("loading")}</div>;
  }
  return <div className="page-container section-y">
    <header className="mb-8 max-w-2xl"><p className="mb-3 text-sm font-semibold text-brand">{t("eyebrow")}</p><h1 className="text-h1 text-ink">{t("title")}</h1><p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{t("description")}</p></header>
    {user.emailVerified ? <ApplicationEntry key={user.id} userId={user.id} /> : <VerificationRequired />}
  </div>;
}

function VerificationRequired(): ReactElement {
  const t = useTranslations("workshopApplication"); const errors = useTranslations("errors");
  const {user, resendEmailVerification} = useAuth(); const {seconds, start} = useResendCooldown();
  const [busy, setBusy] = useState(false); const lock = useRef(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  async function resend(): Promise<void> {
    if (!user || lock.current || seconds > 0) return;
    lock.current = true; setBusy(true); setError(""); setMessage("");
    try { await resendEmailVerification(user.email); setMessage(t("resendSent")); } catch (cause) { setError(errors(getApiErrorMessageKey(cause))); }
    finally { start(); lock.current = false; setBusy(false); }
  }
  return <section className="max-w-2xl space-y-4 rounded-2xl border border-brand/25 bg-brand-soft p-6"><p className="font-semibold text-ink">{t("verifiedRequired")}</p><Button type="button" disabled={busy || seconds > 0} onClick={() => void resend()}>{t("resend")}</Button>{message ? <p role="status" className="text-sm text-ink">{message}</p> : null}{seconds > 0 ? <p className="text-xs text-muted-foreground">{t("resendWait", {seconds})}</p> : null}{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}</section>;
}

function ApplicationEntry({userId}: {userId: string}): ReactElement {
  const t = useTranslations("workshopApplication"); const errors = useTranslations("errors");
  const mine = useQuery({queryKey: ["workshop-applications", userId, "mine"], queryFn: workshopApplicationService.mine, retry: false, staleTime: 30_000, gcTime: 5 * 60_000});
  if (mine.isPending) return <div role="status" className="flex items-center gap-3 rounded-xl border border-line bg-card p-5 text-sm text-muted-foreground"><LoaderCircle className="size-5 animate-spin" />{t("statusLoading")}</div>;
  if (mine.isError) return <div role="alert" className="max-w-2xl rounded-xl border border-destructive/30 bg-card p-5 text-sm text-destructive"><p>{errors(getApiErrorMessageKey(mine.error))}</p><Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => void mine.refetch()}>{t("retry")}</Button></div>;
  const current = mine.data.find(application => application.status === "PENDING")
    ?? mine.data.find(application => application.status !== "DRAFT");
  const draft = mine.data.find(application => application.status === "DRAFT");
  return current ? <ApplicationTracking application={current} /> : <ApplicationForm draft={draft} recoverPending={async () => {
    const refreshed = await mine.refetch();
    return refreshed.data?.find(application => application.status === "PENDING") ?? null;
  }} />;
}

function ApplicationForm({draft, recoverPending}: {draft?: Application; recoverPending: () => Promise<Application | null>}): ReactElement {
  const t = useTranslations("workshopApplication"); const errors = useTranslations("errors");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({}); const submitLock = useRef(false); const focusField = useRef<string | null>(null);
  const [step, setStep] = useState(draft ? 3 : 0); const heading = useRef<HTMLHeadingElement>(null);
  const [business, setBusiness] = useState<BusinessDraft>(draft ? {name: draft.name, businessType: draft.businessType, phone: draft.phone, address: draft.address} : {name: "", businessType: "SAHIS", phone: "", address: ""});
  const [location, setLocation] = useState<ApplicationLocationDraft>(draft ? {province: draft.province.id, district: draft.district.id, site: draft.industrialSite?.id ?? ""} : {province: "", district: "", site: ""});
  const [services, setServices] = useState<ApplicationServicesDraft>(draft ? {vehicleTypeIds: draft.vehicleTypes?.map(item => item.id) ?? [], brandIds: draft.brands?.map(item => item.id) ?? [], specialtyIds: draft.specialties?.map(item => item.id) ?? []} : {vehicleTypeIds: [], brandIds: [], specialtyIds: []});
  const [application, setApplication] = useState<Application | null>(draft ?? null); const [showTracking, setShowTracking] = useState(false); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState("");
  const [documentsComplete, setDocumentsComplete] = useState(false);
  const currentApplication = application as Application | null;
  const provinces = useProvinces(); const districts = useDistricts(location.province || undefined);
  const vehicleTypes = useQuery({queryKey: ["catalog", "application-vehicle-types"], queryFn: catalogService.getVehicleTypeCatalog, staleTime: 60 * 60_000});
  const brands = useQuery({queryKey: ["catalog", "application-brands"], queryFn: catalogService.getVehicleBrands, staleTime: 60 * 60_000});
  const specialties = useQuery({queryKey: ["catalog", "application-specialties"], queryFn: catalogService.getSpecialtyCatalog, staleTime: 60 * 60_000});
  useEffect(() => {
    if (focusField.current) { document.getElementById(`application-${focusField.current}`)?.focus(); focusField.current = null; }
    else heading.current?.focus();
  }, [step, fieldErrors]);
  function validateStep(index: number): FieldErrors {
    const found: FieldErrors = {};
    if (index === 0) {
      const result = businessDraftSchema.safeParse(business);
      if (!result.success) for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        found[key] = key === "phone" ? t("phoneInvalid") : key === "name" ? t("nameInvalid") : key === "address" ? t("addressInvalid") : t("fieldRequired");
      }
    }
    if (index === 1) {
      if (!validCatalogSelection(location.province, provinces.data)) found.province = t("selectionInvalid");
      if (!validCatalogSelection(location.district, districts.data)) found.district = t("selectionInvalid");
    }
    if (index === 2) for (const [key, items, max] of [["vehicleTypeIds", vehicleTypes.data, 20], ["brandIds", brands.data, 100], ["specialtyIds", specialties.data, 50]] as const) {
      const ids = services[key];
      if (key !== "brandIds" && !ids.length) found[key] = t("selectionRequired");
      else if (ids.length > max) found[key] = t("selectionLimit", {max});
      else if (ids.some(id => !validCatalogSelection(id, items))) found[key] = t("selectionInvalid");
    }
    return found;
  }
  function showErrors(found: FieldErrors, index: number): void {
    const fields = index === 0 ? ["name", "phone", "address", "businessType"] : index === 1 ? ["province", "district", "site"] : ["vehicleTypeIds", "brandIds", "specialtyIds"];
    focusField.current = fields.find(key => found[key]) ?? null;
    setFieldErrors(found); setStep(index);
  }
  async function next(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitLock.current) return;
    setError("");
    for (const index of step === 3 ? [0, 1, 2] : [step]) {
      const found = validateStep(index);
      if (Object.keys(found).length) { showErrors(found, index); return; }
    }
    setFieldErrors({});
    if (step === 0) { setStep(1); return; }
    if (step === 1) {
      if (currentApplication?.status !== "DRAFT") { setStep(2); return; }
      submitLock.current = true; setSubmitting(true);
      try {
        const saved = await workshopApplicationService.updateDraft(currentApplication.id, {
          provinceId: location.province,
          districtId: location.district,
        });
        if (saved.province.id !== location.province || saved.district.id !== location.district) {
          showErrors({province: t("locationSaveFailed"), district: t("locationSaveFailed")}, 1);
          setError(t("locationSaveFailed")); return;
        }
        setApplication(saved); setFieldErrors({}); setError(""); setStep(2);
      } catch (cause) {
        showErrors({province: t("locationSaveFailed"), district: t("locationSaveFailed")}, 1);
        setError(errors(getApiErrorMessageKey(cause)));
      } finally { submitLock.current = false; setSubmitting(false); }
      return;
    }
    if (step === 2) {
      const parsedBusinessType = businessTypeSchema.safeParse(business.businessType);
      if (!parsedBusinessType.success) { showErrors({businessType: t("businessTypeInvalid")}, 0); return; }
      submitLock.current = true; setSubmitting(true);
      try {
        const input = {name: business.name.trim(), businessType: parsedBusinessType.data, phone: business.phone, address: business.address.trim(), provinceId: location.province, districtId: location.district, ...services};
        const draftRecord = currentApplication?.status === "DRAFT" ? currentApplication : await workshopApplicationService.createDraft(input);
        // POST /drafts is idempotent and intentionally does not apply its body when a draft already exists.
        // Always persist the current form values through PATCH before allowing document upload.
        const saved = await workshopApplicationService.updateDraft(draftRecord.id, input);
        if (saved.province.id !== location.province || saved.district.id !== location.district) {
          showErrors({province: t("locationSaveFailed"), district: t("locationSaveFailed")}, 1); return;
        }
        setApplication(saved); setStep(3);
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 409 && cause.code === "WORKSHOP_APPLICATION_PENDING") {
          const pending = await recoverPending();
          if (pending) { setApplication(pending); setShowTracking(true); return; }
          setError(t("pendingNotFound"));
          return;
        }
        if (hasValidationIssueFor(cause, "businessType")) {
          showErrors({businessType: t("businessTypeInvalid")}, 0);
          return;
        }
        setError(errors(getApiErrorMessageKey(cause)));
      } finally { submitLock.current = false; setSubmitting(false); }
    } else if (step === 3) {
      if (!currentApplication?.id) { setError(t("draftRequired")); return; }
      if (!documentsComplete) { setError(t("documentsIncomplete")); return; }
      setStep(4);
    } else if (step === 4) {
      if (!currentApplication?.id) return;
      submitLock.current = true; setSubmitting(true); setError("");
      try {
        const stored = (await workshopApplicationService.drafts()).find(item => item.id === currentApplication.id);
        if (!stored?.province?.id || !stored?.district?.id) { showErrors({province: t("locationSaveFailed"), district: t("locationSaveFailed")}, 1); setError(t("locationSaveFailed")); return; }
        const submitted = await workshopApplicationService.submitDraft(currentApplication.id); setApplication(submitted); setShowTracking(true);
      }
      catch (cause) {
        const missing = cause instanceof ApiError && cause.code === "WORKSHOP_APPLICATION_INCOMPLETE" && cause.details && typeof cause.details === "object" && "missingFields" in cause.details && Array.isArray(cause.details.missingFields) ? cause.details.missingFields : [];
        if (missing.includes("provinceId") || missing.includes("districtId")) { showErrors({province: t("locationSaveFailed"), district: t("locationSaveFailed")}, 1); setError(t("locationSaveFailed")); }
        else setError(cause instanceof ApiError && cause.code === "WORKSHOP_APPLICATION_DOCUMENTS_INCOMPLETE" ? t("documentsIncomplete") : errors(getApiErrorMessageKey(cause)));
      }
      finally { submitLock.current = false; setSubmitting(false); }
    }
  }
  const locationName = (items: {id: string; name: string}[] | undefined, id: string): string => items?.find(item => item.id === id)?.name ?? "";
  if (showTracking && application) return <ApplicationTracking application={application} />;
  return <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]"><StepNavigation step={step} />
    <form onSubmit={event => void next(event)} noValidate className="min-w-0 rounded-2xl border border-line bg-card p-5 shadow-card sm:p-8">
      <p className="mb-4 text-xs text-muted-foreground"><span className="text-destructive">*</span>{t("requiredNote").replace(/^\*\s*/, " ")}</p>
      <h2 ref={heading} tabIndex={-1} className="mb-6 text-h2 text-ink outline-none">{t(`steps.${steps[step]}`)}</h2>
      {step === 0 ? <BusinessFields errors={fieldErrors} value={business} onChange={setBusiness} /> : null}
      {step === 1 ? <ApplicationLocation errors={fieldErrors} value={location} onChange={setLocation} provinces={provinces} districts={districts} /> : null}
      {step === 2 ? <ApplicationServices errors={fieldErrors} value={services} onChange={setServices} vehicleTypes={vehicleTypes.data ?? []} brands={brands.data ?? []} specialties={specialties.data ?? []} /> : null}
      {step === 3 && application ? <ApplicationDocumentManager application={application} onComplete={() => setDocumentsComplete(true)} /> : null}
      {step === 4 ? <ApplicationSummary business={business} province={locationName(provinces.data, location.province)} district={locationName(districts.data, location.district)} site={location.site} services={services} /> : null}
      {error ? <p role="alert" className="mt-5 text-sm text-destructive">{error}</p> : null}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5"><Button type="button" variant="outline" disabled={step === 0 || submitting} onClick={() => {setError(""); setStep(step - 1);}}><ArrowLeft />{t("back")}</Button><Button type="submit" disabled={submitting}>{submitting ? <LoaderCircle className="animate-spin" /> : step === 4 ? <Send /> : null}{t(step === 4 ? "submit" : step === 2 ? "review" : "next")}{step < 4 ? <ArrowRight /> : null}</Button></div>
    </form></div>;
}

function StepNavigation({step}: {step: number}): ReactElement {
  const t = useTranslations("workshopApplication");
  return <aside className="rounded-2xl border border-line bg-card p-4 shadow-card lg:sticky lg:top-24 lg:p-5"><p className="mb-4 text-xs font-semibold text-muted-foreground">{t("stepLabel", {current: step + 1, total: steps.length})}</p><ol aria-label={t("title")} className="grid grid-cols-5 gap-2 lg:grid-cols-1 lg:gap-4">{steps.map((name, index) => {const Icon = stepIcons[index]; return <li key={name} aria-current={index === step ? "step" : undefined} className="flex min-w-0 flex-col items-center gap-2 lg:flex-row lg:gap-3"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${index <= step ? "bg-brand text-white" : "bg-muted text-muted-foreground"}`}>{index < step ? <Check className="size-5" /> : <Icon className="size-5" />}</span><span className={`text-center text-xs font-semibold lg:text-left lg:text-sm ${index === step ? "text-ink" : "text-muted-foreground"}`}>{t(`steps.${name}`)}</span></li>;})}</ol></aside>;
}

function BusinessFields({value, onChange, errors}: {value: BusinessDraft; onChange: (value: BusinessDraft) => void; errors: FieldErrors}): ReactElement {
  const t = useTranslations("workshopApplication");
  return <div className="grid gap-5 sm:grid-cols-2">{(["name", "phone", "address"] as const).map(key => {
    const max = key === "address" ? 500 : key === "name" ? 180 : 11;
    return <div key={key} className="space-y-2">
      <label htmlFor={`application-${key}`} className="text-sm font-semibold text-ink">{t(key)} <span aria-hidden="true" className="text-destructive">*</span></label>
      <Input id={`application-${key}`} name={key} type={key === "phone" ? "tel" : "text"} inputMode={key === "phone" ? "numeric" : undefined} autoComplete={key === "phone" ? "tel-national" : key === "address" ? "street-address" : "organization"} required value={value[key]} maxLength={max}
        onPaste={key === "phone" ? event => { event.preventDefault(); const input = event.currentTarget; const pasted = event.clipboardData.getData("text"); const start = input.selectionStart ?? 0; const end = input.selectionEnd ?? value.phone.length; onChange({...value, phone: sanitizeApplicationPhone(value.phone.slice(0, start) + pasted + value.phone.slice(end))}); } : undefined}
        aria-invalid={Boolean(errors[key])} aria-describedby={`application-${key}-hint${errors[key] ? ` application-${key}-error` : ""}`}
        onChange={event => onChange({...value, [key]: key === "phone" ? sanitizeApplicationPhone(event.target.value) : event.target.value})} />
      <p id={`application-${key}-hint`} className="text-xs text-muted-foreground">{key === "phone" ? t("phoneHint") : `${value[key].length}/${max}`}</p>
      {errors[key] ? <p id={`application-${key}-error`} role="alert" className="text-xs text-destructive">{errors[key]}</p> : null}
    </div>;
  })}<div className="space-y-2"><label htmlFor="application-businessType" className="text-sm font-semibold text-ink">{t("businessType")} <span aria-hidden="true" className="text-destructive">*</span></label><select id="application-businessType" required aria-invalid={Boolean(errors.businessType)} aria-describedby={errors.businessType ? "application-businessType-error" : undefined} value={value.businessType} className="h-11 w-full rounded-xl border border-line bg-card px-3 text-sm text-ink focus-visible:ring-3 focus-visible:ring-brand/20 focus-visible:outline-none" onChange={event => {const result = businessTypeSchema.safeParse(event.target.value); if (result.success) onChange({...value, businessType: result.data});}}>{businessTypes.map(type => <option key={type} value={type}>{t(businessTypeTranslationKeys[type])}</option>)}</select>{errors.businessType ? <p id="application-businessType-error" role="alert" className="text-xs text-destructive">{errors.businessType}</p> : null}</div></div>;
}

function ApplicationSummary({business, province, district, site, services}: {business: BusinessDraft; province: string; district: string; site: string; services: ApplicationServicesDraft}): ReactElement {
  const t = useTranslations("workshopApplication");
  return <div className="space-y-5"><Badge variant="outline">{t("readyToSubmit")}</Badge><h3 className="text-h3 text-ink">{t("summary")}</h3><dl className="grid gap-4 text-sm sm:grid-cols-2">{[[t("name"), business.name], [t("businessType"), t(businessTypeTranslationKeys[business.businessType])], [t("phone"), business.phone], [t("address"), business.address], [t("province"), province], [t("district"), district], [t("industrialSite"), site || t("none")]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-semibold text-ink">{value}</dd></div>)}</dl><p className="text-sm text-muted-foreground">{t("selectionSummary", {vehicles: services.vehicleTypeIds.length, brands: services.brandIds.length, specialties: services.specialtyIds.length})}</p></div>;
}

function ApplicationTracking({application}: {application: Application}): ReactElement {
  const [current, setCurrent] = useState(application);
  return <ApplicationTrackingView application={current} onApplicationChange={setCurrent} />;
}

function ApplicationTrackingView({application, onApplicationChange}: {application: Application; onApplicationChange: (application: Application) => void}): ReactElement {
  const t = useTranslations("workshopApplication");
  const locale = useLocale();
  const statusIndex = application.status === "PENDING" ? 1 : application.status === "VERIFIED" ? 3 : application.status === "REJECTED" ? 2 : 3;
  const isDanger = application.status === "REJECTED" || application.status === "SUSPENDED";
  const StatusIcon = application.status === "PENDING" ? Clock3 : application.status === "VERIFIED" ? CircleCheck : TriangleAlert;
  const progress = [{key: "received", icon: FileCheck2}, {key: "reviewing", icon: Search}, {key: "result", icon: Check}, {key: "active", icon: UserRoundCheck}] as const;
  const created = application.createdAt ? new Intl.DateTimeFormat(locale, {dateStyle: "medium", timeStyle: "short"}).format(new Date(application.createdAt)) : null;
  return <div className="space-y-6">
    <section className="rounded-2xl border border-line bg-card p-5 shadow-card sm:p-8"><h2 className="text-h2 text-ink">{t("trackingTitle")}</h2><div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
      <ol className="grid gap-5 sm:grid-cols-4">{progress.map(({key, icon: Icon}, index) => {const reached = index <= statusIndex; const failed = isDanger && index === statusIndex; return <li key={key} className="relative text-center"><div className={`mx-auto flex size-12 items-center justify-center rounded-full ${failed ? "bg-destructive/15 text-destructive" : reached ? "bg-brand-soft text-brand" : "bg-muted text-muted-foreground"}`}><Icon className="size-5" /></div>{index < 3 ? <span className={`absolute top-6 left-[calc(50%+30px)] hidden h-0.5 w-[calc(100%-60px)] sm:block ${index < statusIndex && !failed ? "bg-brand" : "bg-line"}`} /> : null}<p className="mt-3 text-sm font-semibold text-ink">{t(`trackingSteps.${key}`)}</p>{index === 0 && created ? <p className="mt-1 text-xs text-muted-foreground">{created}</p> : <p className="mt-1 text-xs text-muted-foreground">{t(`trackingStepDescriptions.${key}`)}</p>}</li>;})}</ol>
      <div className={`rounded-2xl border p-5 ${application.status === "PENDING" ? "border-amber-200 bg-amber-50 text-amber-950" : application.status === "VERIFIED" ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-destructive/25 bg-destructive/5 text-ink"}`}><div className="flex items-start gap-4"><span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/70"><StatusIcon className="size-6" /></span><div><p className="font-bold">{t(`trackingStatusTitles.${application.status}`)}</p><p className="mt-2 text-sm leading-relaxed">{t(`trackingStatusDescriptions.${application.status}`)}</p></div></div>{application.status === "REJECTED" && application.rejectionReason ? <div className="mt-4 border-t border-current/15 pt-4"><p className="text-sm font-semibold">{t("rejectionReason")}</p><p className="mt-1 text-sm">{application.rejectionReason}</p></div> : null}</div>
    </div></section>
    <div className="grid items-start gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-line bg-card p-5 shadow-card sm:p-7"><div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand"><Store className="size-5" /></span><h2 className="text-h2 text-ink">{t("businessInfoTitle")}</h2></div><dl className="mt-6 divide-y divide-line text-sm"><div className="grid gap-1 py-4 sm:grid-cols-[140px_1fr]"><dt className="text-muted-foreground">{t("name")}</dt><dd className="font-semibold text-ink">{application.name}</dd></div><div className="grid gap-1 py-4 sm:grid-cols-[140px_1fr]"><dt className="text-muted-foreground">{t("location")}</dt><dd className="font-semibold text-ink">{application.district.name}, {application.province.name}</dd></div><div className="grid gap-1 py-4 sm:grid-cols-[140px_1fr]"><dt className="text-muted-foreground">{t("industrialSite")}</dt><dd className="font-semibold text-ink">{application.industrialSite?.name ?? t("notSpecified")}</dd></div></dl></section><ApplicationDocumentManager application={application} allowUpload={application.status === "DRAFT" || application.status === "REJECTED"} onApplicationChange={onApplicationChange} /></div>
    {application.status === "REJECTED" ? <RejectedResubmitAction application={application} onApplicationChange={onApplicationChange} /> : null}
    <section className="flex gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-950"><Info className="mt-0.5 size-6 shrink-0 text-blue-600" /><div><h2 className="font-bold">{t("nextStepTitle")}</h2><p className="mt-1 text-sm leading-relaxed">{t(`nextStepDescriptions.${application.status}`)}</p></div></section>
  </div>;
}

function RejectedResubmitAction({application, onApplicationChange}: {application: Application; onApplicationChange: (application: Application) => void}): ReactElement {
  const t = useTranslations("workshopApplication"); const errors = useTranslations("errors");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const lock = useRef(false);
  async function submit(): Promise<void> {
    if (lock.current) return; lock.current = true; setBusy(true); setError("");
    try { const submitted = await workshopApplicationService.submitDraft(application.id); const refreshed = (await workshopApplicationService.mine()).find(item => item.id === application.id && item.status === "PENDING"); onApplicationChange((refreshed ?? submitted) as Application); }
    catch (cause) { setError(cause instanceof ApiError && cause.code === "WORKSHOP_APPLICATION_DOCUMENTS_INCOMPLETE" ? t("documentsIncomplete") : cause instanceof ApiError && cause.code === "WORKSHOP_APPLICATION_INCOMPLETE" ? t("applicationIncomplete") : errors(getApiErrorMessageKey(cause))); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex sm:items-center sm:justify-between sm:gap-5"><div><h2 className="font-bold text-amber-950">{t("resubmitTitle")}</h2><p className="mt-1 text-sm text-amber-900">{t("resubmitDescription")}</p></div><Button type="button" className="mt-4 w-full sm:mt-0 sm:w-auto" disabled={busy} onClick={() => void submit()}>{busy ? <LoaderCircle className="animate-spin" /> : <Send />}{t(busy ? "resubmitting" : "resubmit")}</Button>{error ? <p role="alert" className="mt-3 text-sm text-destructive sm:basis-full">{error}</p> : null}</section>;
}

function ApplicationDocumentManager({application, onComplete, allowUpload = true}: {application: Application; onComplete?: () => void; onApplicationChange?: (application: Application) => void; allowUpload?: boolean}): ReactElement {
  const t = useTranslations("workshopApplication"); const errors = useTranslations("errors");
  const businessType = businessTypeSchema.parse(application.businessType);
  const [files, setFiles] = useState<ApplicationFiles>({}); const [fileErrors, setFileErrors] = useState<Partial<Record<ApplicationDocumentType, string>>>({});
  const [uploading, setUploading] = useState<ApplicationDocumentType | null>(null); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const documents = useQuery({queryKey: ["workshop-applications", application.id, "documents"], queryFn: () => workshopApplicationService.documents(application.id), retry: false});
  const uploadedTypes = new Set((documents.data ?? []).map(document => document.documentType)); const missing = requiredDocuments(businessType).filter(type => !uploadedTypes.has(type));
  useEffect(() => { if (documents.data && missing.length === 0) onComplete?.(); }, [documents.data, missing.length, onComplete]);
  async function upload(type: ApplicationDocumentType, file: File): Promise<void> {
    if (uploading) return; setError(""); setFileErrors(current => ({...current, [type]: undefined})); setUploading(type);
    try { await workshopApplicationService.uploadDocument(application.id, type, file); setFiles(current => ({...current, [type]: undefined})); setMessage(t("documentsUploaded")); }
    catch (cause) { setFileErrors(current => ({...current, [type]: cause instanceof ApiError && cause.status === 403 ? t("documentPermissionDenied") : errors(getApiErrorMessageKey(cause))})); }
    finally { setUploading(null); }
    const refreshed = await documents.refetch();
    const remaining = requiredDocuments(businessType).filter(type => !new Set(refreshed.data?.map(document => document.documentType) ?? []).has(type));
    if (remaining.length === 0) onComplete?.();
  }
  return <section className="rounded-2xl border border-line bg-card p-5 shadow-card sm:p-8"><h2 className="text-h2 text-ink">{t("steps.documents")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("documentsDescription")}</p>{documents.isPending ? <p role="status" className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />{t("documentsLoading")}</p> : null}{documents.data?.length ? <ul className="mt-5 space-y-2">{documents.data.map((document: ApplicationDocument) => <li key={document.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3 text-sm"><span className="font-semibold text-ink">{t(`documents.${document.documentType}`)}</span><Badge variant="outline">{t(`documentStatuses.${documentStatusKey(document.status)}`)}</Badge></li>)}</ul> : null}{allowUpload && documents.data ? <div className="mt-6"><ApplicationDocuments businessType={businessType} types={requiredDocuments(businessType)} uploadedTypes={uploadedTypes} files={files} onChange={setFiles} errors={fileErrors} onError={(type, value) => { setFileErrors(current => ({...current, [type]: value})); }} onFileSelected={(type, file) => { setFiles(current => ({...current, [type]: file})); void upload(type, file); }} />{uploading ? <p role="status" className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />{t("uploadingDocument", {name: t(`documents.${uploading}`)})}</p> : null}</div> : null}{documents.data && missing.length === 0 ? <p role="status" className="mt-5 rounded-xl border border-success/30 bg-success/5 p-4 text-sm text-ink">{application.status === "PENDING" ? t("pendingReview") : t("documentsComplete")}</p> : null}{documents.isError ? <p role="alert" className="mt-4 text-sm text-destructive">{errors(getApiErrorMessageKey(documents.error))} <Button type="button" variant="link" size="sm" onClick={() => void documents.refetch()}>{t("retry")}</Button></p> : null}{message ? <p role="status" className="mt-4 text-sm text-success">{message}</p> : null}{error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}</section>;
}
