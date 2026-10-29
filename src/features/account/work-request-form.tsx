"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { ApiError } from "@/lib/api";
import {
  useDistricts,
  useProvinces,
  useSpecialtyCatalog,
  useVehicleBrands,
  useVehicleModels,
  useVehicleTypeCatalog,
} from "@/features/catalog/queries";
import { SearchableCatalogSelect } from "@/features/auth/province-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CatalogItem, WorkRequest } from "@/lib/api";
import {
  getWorkRequestApiFieldErrors,
  MODEL_NOT_LISTED_VALUE,
  normalizeVehicleModelSelection,
  validateWorkRequestForm,
  type WorkRequestFormField,
  type WorkRequestFormValues,
} from "@/lib/work-requests";
import type { CreateWorkRequestInput } from "@/types/work-request";

interface WorkRequestFormProps {
  initialRequest?: WorkRequest;
  submitLabel: string;
  submittingLabel: string;
  onSubmit: (input: CreateWorkRequestInput) => Promise<void>;
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

function Field({ id, label, error, required, children }: FieldProps) {
  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {required ? <span aria-hidden="true" className="text-destructive"> *</span> : null}
      </label>
      {children}
      {error ? <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function WorkRequestForm({
  initialRequest,
  submitLabel,
  submittingLabel,
  onSubmit,
}: WorkRequestFormProps) {
  const t = useTranslations("account.requests");
  const common = useTranslations("common");
  const [values, setValues] = useState<WorkRequestFormValues>({
    vehicleTypeId: initialRequest?.vehicleType.id ?? "",
    vehicleBrandId: initialRequest?.vehicleBrand?.id ?? null,
    vehicleModelId: initialRequest?.vehicleModel?.id ?? null,
    specialtyId: initialRequest?.specialty.id ?? "",
    provinceId: initialRequest?.province.id ?? "",
    districtId: initialRequest?.district.id ?? "",
    address: initialRequest?.address ?? "",
    description: initialRequest?.description ?? "",
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<WorkRequestFormField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [retryValues, setRetryValues] = useState<WorkRequestFormValues | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);
  const [modelNotListed, setModelNotListed] = useState(false);

  const vehicleTypes = useVehicleTypeCatalog();
  const brands = useVehicleBrands();
  const models = useVehicleModels(
    values.vehicleBrandId ?? undefined,
    values.vehicleBrandId ? values.vehicleTypeId || undefined : undefined,
  );
  const specialties = useSpecialtyCatalog();
  const provinces = useProvinces();
  const districts = useDistricts(values.provinceId || undefined);

  const catalogQueries = [vehicleTypes, brands, specialties, provinces];
  const requiredCatalogPending = catalogQueries.some((query) => query.isPending) ||
    (Boolean(values.provinceId) && districts.isPending);
  const requiredCatalogFailed = catalogQueries.some((query) => query.isError) ||
    (Boolean(values.provinceId) && districts.isError);
  const catalogItems = {
    vehicleTypeId: vehicleTypes.data ?? [],
    vehicleBrandId: brands.data ?? [],
    specialtyId: specialties.data ?? [],
    provinceId: provinces.data ?? [],
    districtId: districts.data ?? [],
  } satisfies Record<string, CatalogItem[]>;
  const modelItems = values.vehicleBrandId
    ? [...(models.data ?? []), { id: MODEL_NOT_LISTED_VALUE, name: t("modelNotListed") }]
    : [];

  function setField<K extends WorkRequestFormField>(
    key: K,
    value: WorkRequestFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setFormError(null);
    setRetryValues(null);
  }

  function messageForError(error: unknown): string {
    if (error instanceof ApiError) {
      if (error.code === "INVALID_WORK_REQUEST_REFERENCE") return t("relationInvalid");
      if (error.code === "EMAIL_NOT_VERIFIED" || error.code === "EMAIL_VERIFICATION_REQUIRED") {
        return t("emailNotVerified");
      }
      if (error.code === "WORK_REQUEST_NOT_EDITABLE") return t("transitionConflict");
      if (error.status === 401) return t("authenticationRequired");
      if (error.status !== undefined && error.status >= 500) return t("saveError");
    }
    return t("saveError");
  }

  async function submitValues(nextValues: WorkRequestFormValues) {
    if (submitLock.current) return;
    const validation = validateWorkRequestForm(nextValues);
    setFieldErrors(validation.errors);
    setFormError(null);
    setRetryValues(null);
    if (!validation.data) {
      setFormError(t("validationFailed"));
      return;
    }

    submitLock.current = true;
    setIsSubmitting(true);
    try {
      await onSubmit(validation.data);
    } catch (error) {
      const apiFieldErrors = getWorkRequestApiFieldErrors(error);
      setFieldErrors(apiFieldErrors);
      setFormError(messageForError(error));
      if (error instanceof ApiError && error.status !== undefined && error.status >= 500) {
        setRetryValues(nextValues);
      }
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitValues(values);
  }

  function fieldError(field: WorkRequestFormField): string | undefined {
    return fieldErrors[field] ? t("invalidField") : undefined;
  }

  function retryCatalogs() {
    for (const query of catalogQueries) void query.refetch();
    if (values.provinceId) void districts.refetch();
    if (values.vehicleBrandId) void models.refetch();
  }

  function catalogSelect(
    field: "vehicleTypeId" | "specialtyId" | "provinceId" | "districtId",
    label: string,
    items: CatalogItem[],
    disabled: boolean,
  ) {
    const id = `request-${field}`;
    const loadingDistricts = field === "districtId" && districts.isFetching;
    return (
      <Field id={id} label={label} error={fieldError(field)} required>
        <SearchableCatalogSelect
          id={id}
          name={field}
          label={label}
          items={items}
          value={values[field]}
          onChange={(value) => {
            if (field === "provinceId") {
              setValues((current) => ({ ...current, provinceId: value, districtId: "" }));
            } else {
              setField(field, value);
            }
          }}
          disabled={disabled || loadingDistricts}
          invalid={Boolean(fieldErrors[field])}
          describedBy={fieldErrors[field] ? `${id}-error` : undefined}
          placeholder={loadingDistricts ? t("loadingDistricts") : t("choose")}
          searchLabel={t("searchCatalog", { label })}
          clearSearchLabel={t("clearSearch")}
          emptyLabel={t("catalogEmpty")}
        />
      </Field>
    );
  }

  const catalogError = catalogQueries.some((query) => query.isError) ||
    (Boolean(values.provinceId) && districts.isError) ||
    (Boolean(values.vehicleBrandId) && models.isError);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {catalogError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <span>{t("catalogError")}</span>
          <Button type="button" variant="outline" size="sm" onClick={retryCatalogs}>
            {common("retry")}
          </Button>
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        {catalogSelect(
          "vehicleTypeId",
          t("vehicleType"),
          catalogItems.vehicleTypeId,
          vehicleTypes.isPending || vehicleTypes.isError,
        )}
        {catalogSelect(
          "specialtyId",
          t("specialty"),
          catalogItems.specialtyId,
          specialties.isPending || specialties.isError,
        )}
        <Field id="request-vehicleBrandId" label={t("vehicleBrand")} error={fieldError("vehicleBrandId")}>
          <SearchableCatalogSelect
            id="request-vehicleBrandId"
            name="vehicleBrandId"
            label={t("vehicleBrand")}
            items={catalogItems.vehicleBrandId}
            value={values.vehicleBrandId ?? ""}
            onChange={(value) => {
              setModelNotListed(false);
              setValues((current) => ({
                ...current,
                vehicleBrandId: value || null,
                vehicleModelId: null,
              }));
            }}
            disabled={brands.isPending || brands.isError}
            invalid={Boolean(fieldErrors.vehicleBrandId)}
            placeholder={t("optionalChoose")}
            searchLabel={t("searchCatalog", { label: t("vehicleBrand") })}
            clearSearchLabel={t("clearSearch")}
            emptyLabel={t("catalogEmpty")}
          />
        </Field>
        <Field id="request-vehicleModelId" label={t("vehicleModel")} error={fieldError("vehicleModelId")}>
          <SearchableCatalogSelect
            id="request-vehicleModelId"
            name="vehicleModelId"
            label={t("vehicleModel")}
            items={modelItems}
            value={modelNotListed ? MODEL_NOT_LISTED_VALUE : values.vehicleModelId ?? ""}
            onChange={(value) => {
              setModelNotListed(value === MODEL_NOT_LISTED_VALUE);
              setField("vehicleModelId", normalizeVehicleModelSelection(value));
            }}
            disabled={!values.vehicleBrandId || models.isPending || models.isError}
            invalid={Boolean(fieldErrors.vehicleModelId)}
            placeholder={values.vehicleBrandId ? t("optionalChoose") : t("chooseBrandFirst")}
            searchLabel={t("searchCatalog", { label: t("vehicleModel") })}
            clearSearchLabel={t("clearSearch")}
            emptyLabel={t("catalogEmpty")}
          />
          {modelNotListed ? <p className="text-xs text-muted-foreground">{t("modelNotListedHint")}</p> : null}
          {models.isError && values.vehicleBrandId ? (
            <p role="status" className="text-xs text-muted-foreground">{t("optionalModelUnavailable")}</p>
          ) : null}
        </Field>
        {catalogSelect(
          "provinceId",
          t("province"),
          catalogItems.provinceId,
          provinces.isPending || provinces.isError,
        )}
        {catalogSelect(
          "districtId",
          t("district"),
          catalogItems.districtId,
          !values.provinceId || districts.isPending || districts.isError,
        )}
        <Field id="request-address" label={t("address")} error={fieldError("address")} required>
          <Input
            id="request-address"
            name="address"
            autoComplete="street-address"
            maxLength={500}
            minLength={5}
            required
            value={values.address}
            aria-invalid={Boolean(fieldErrors.address)}
            aria-describedby={fieldErrors.address ? "request-address-error" : undefined}
            onChange={(event) => setField("address", event.target.value)}
          />
          <p className="text-xs text-muted-foreground">{t("addressHint")}</p>
        </Field>
        <Field id="request-description" label={t("description")} error={fieldError("description")} required>
          <Textarea
            id="request-description"
            name="description"
            minLength={5}
            maxLength={5000}
            required
            value={values.description}
            aria-invalid={Boolean(fieldErrors.description)}
            aria-describedby={fieldErrors.description ? "request-description-error" : undefined}
            onChange={(event) => setField("description", event.target.value)}
          />
          <p className="text-xs text-muted-foreground">{t("descriptionHint")}</p>
        </Field>
      </div>

      {requiredCatalogPending ? (
        <p role="status" className="text-sm text-muted-foreground">{t("loadingCatalog")}</p>
      ) : null}
      {requiredCatalogFailed ? (
        <p role="alert" className="text-sm text-destructive">{t("requiredCatalogError")}</p>
      ) : null}
      {formError ? (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-2">
            <p>{formError}</p>
            {retryValues ? (
              <Button type="button" variant="link" size="sm" disabled={isSubmitting} onClick={() => void submitValues(retryValues)}>
                {common("retry")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="submit" disabled={isSubmitting || requiredCatalogPending || requiredCatalogFailed}>
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export { WorkRequestForm };
