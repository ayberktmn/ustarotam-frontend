"use client";

import type { ReactElement } from "react";
import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DOCX_MIME, PDF_MIME, documentError, requiredDocuments, type ApplicationDocumentType, type BusinessType } from "@/lib/workshop-application";

export type ApplicationFiles = Partial<Record<ApplicationDocumentType, File>>;

export function ApplicationDocuments({businessType, files, onChange, errors, onError, onFileSelected, uploadedTypes, types}: {
  businessType: BusinessType;
  files: ApplicationFiles;
  onChange: (files: ApplicationFiles) => void;
  errors: Partial<Record<ApplicationDocumentType, string>>;
  onError: (type: ApplicationDocumentType, error: string) => void;
  onFileSelected?: (type: ApplicationDocumentType, file: File) => void;
  uploadedTypes?: Set<ApplicationDocumentType>;
  types?: ApplicationDocumentType[];
}): ReactElement {
  const t = useTranslations("workshopApplication");
  return <div className="space-y-4">
    <p id="application-document-hint" className="text-sm text-muted-foreground">{t("documentHint")}</p>
    {(types ?? requiredDocuments(businessType)).map(type => <div key={type} className="space-y-3 rounded-xl border border-line bg-cream p-4">
      <label htmlFor={`document-${type}`} className="flex items-center gap-2 text-sm font-semibold text-ink">
        <FileText aria-hidden="true" className="size-5 shrink-0 text-brand" />{t(`documents.${type}`)}<span aria-hidden="true" className="text-destructive">*</span>
      </label>
      {uploadedTypes?.has(type) ? <p className="text-xs font-semibold text-success">{t("changeDocument")}</p> : null}
      <Input id={`document-${type}`} type="file" accept={`.pdf,.docx,${PDF_MIME},${DOCX_MIME}`} required
        className="h-auto cursor-pointer text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-1 file:font-semibold file:text-brand"
        aria-invalid={Boolean(errors[type])} aria-describedby={errors[type] ? `error-${type}` : files[type] ? `selection-${type}` : "application-document-hint"}
        onChange={event => {
          const file = event.target.files?.[0];
          const error = file ? documentError(file) : null;
          onError(type, error ? t(error) : "");
          onChange({...files, [type]: error ? undefined : file});
          if (!error && file) onFileSelected?.(type, file);
          if (error) event.target.value = "";
        }} />
      {files[type] ? <p id={`selection-${type}`} className="break-words text-xs text-muted-foreground">{t("selected", {name: files[type].name})}</p> : null}
      {errors[type] ? <p id={`error-${type}`} role="alert" className="text-xs text-destructive">{errors[type]}</p> : null}
    </div>)}
    <p className="text-xs leading-relaxed text-muted-foreground">{t("privacy")}</p>
  </div>;
}
