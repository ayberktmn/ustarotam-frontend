"use client";

import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import mammoth from "mammoth";
import { Dialog } from "radix-ui";
import { Download, Eye, FileText, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { workshopApplicationService, type ApplicationDocument } from "@/lib/api/endpoints/workshop-applications";

type PreviewState = { document: ApplicationDocument; url: string | null; html: string | null; mimeType: string; loading: boolean; error: boolean };
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const docxType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function normalizeMimeType(value: string | undefined): string {
  return value?.split(";", 1)[0].trim().toLowerCase() ?? "";
}

function resolveMimeType(blob: Blob, document: ApplicationDocument): string {
  const responseType = normalizeMimeType(blob.type);
  if (responseType && responseType !== "application/octet-stream") return responseType;
  return normalizeMimeType(document.mimeType);
}

function sanitizeDocumentHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ["form", "style"],
    FORBID_ATTR: ["formaction", "style", "target"],
  });
}

const meaningfulDocumentStatuses = new Set(["PENDING", "APPROVED", "REJECTED"]);

function meaningfulDocumentStatus(status?: string): "pending" | "approved" | "rejected" | null {
  const normalized = status?.toUpperCase();
  return normalized && meaningfulDocumentStatuses.has(normalized)
    ? normalized.toLowerCase() as "pending" | "approved" | "rejected"
    : null;
}

function WorkshopDocumentsManager({ workshopId }: { workshopId: string }) {
  const t = useTranslations("workshopPanel.profile");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const previewRequestRef = useRef(0);
  const documents = useQuery({
    queryKey: ["workshop-profile", workshopId, "application-documents"],
    queryFn: async () => {
      const application = (await workshopApplicationService.mine()).find((item) => item.id === workshopId);
      return application ? workshopApplicationService.documents(application.id) : null;
    },
    retry: false,
  });

  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview?.url]);
  useEffect(() => () => { previewRequestRef.current += 1; }, []);

  async function openDocument(document: ApplicationDocument): Promise<void> {
    const requestId = ++previewRequestRef.current;
    setPreview({ document, url: null, html: null, mimeType: document.mimeType ?? "", loading: true, error: false });
    let url: string | null = null;
    try {
      const blob = await workshopApplicationService.downloadDocument(workshopId, document.id);
      const mimeType = resolveMimeType(blob, document);
      if (mimeType === docxType) {
        const result = await mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() });
        if (requestId !== previewRequestRef.current) return;
        url = URL.createObjectURL(blob);
        setPreview({ document, url, html: sanitizeDocumentHtml(result.value), mimeType, loading: false, error: false });
      } else {
        if (requestId !== previewRequestRef.current) return;
        url = URL.createObjectURL(blob);
        setPreview({ document, url, html: null, mimeType, loading: false, error: false });
      }
    } catch {
      if (url) URL.revokeObjectURL(url);
      if (requestId !== previewRequestRef.current) return;
      setPreview({ document, url: null, html: null, mimeType: document.mimeType ?? "", loading: false, error: true });
    }
  }

  function closePreview(): void {
    previewRequestRef.current += 1;
    setPreview(null);
  }

  function download(): void {
    if (!preview?.url) return;
    const anchor = document.createElement("a");
    anchor.href = preview.url;
    anchor.download = preview.document.fileName ?? preview.document.originalName ?? preview.document.id;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  }

  const previewType = preview?.mimeType ?? "";
  const canPreview = previewType === "application/pdf" || imageTypes.has(previewType) || Boolean(preview?.html);
  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-card">
      <div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand"><FileText aria-hidden="true" className="size-5" /></span><div><h2 className="text-base font-bold text-ink">{t("documents")}</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("documentsDescription")}</p></div></div>
      {documents.isPending ? <div className="mt-4 h-16 animate-pulse rounded-xl bg-muted" /> : null}
      {documents.isError || documents.data === null ? <p className="mt-4 rounded-xl border border-dashed border-line bg-cream p-3 text-sm text-muted-foreground">{t("documentsUnavailable")}</p> : null}
      {documents.data?.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-line bg-cream p-3 text-sm text-muted-foreground">{t("documentsEmpty")}</p> : null}
      {documents.data && documents.data.length > 0 ? <ul className="mt-4 space-y-3">{documents.data.map((document) => {
        const status = meaningfulDocumentStatus(document.status);
        return <li key={document.id} className="flex flex-col gap-3 rounded-xl border border-line p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-ink">{t(`documentTypes.${document.documentType}`)}</p><p className="mt-1 text-xs text-muted-foreground">{document.mimeType ?? t("documentMetadataUnavailable")}</p></div><div className="flex flex-wrap items-center gap-2">{status ? <span className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-muted-foreground">{t(`documentStatus.${status}`)}</span> : null}<Button type="button" variant="outline" size="sm" onClick={() => void openDocument(document)}><Eye aria-hidden="true" />{t("viewDocument")}</Button></div></li>;
      })}</ul> : null}

      <Dialog.Root open={Boolean(preview)} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-ink/55 backdrop-blur-sm" /><Dialog.Content className="fixed inset-x-3 top-1/2 z-50 mx-auto flex max-h-[calc(100vh-2rem)] w-auto max-w-5xl -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-xl sm:inset-x-6"><div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4"><Dialog.Title className="text-base font-bold text-ink">{preview ? t(`documentTypes.${preview.document.documentType}`) : ""}</Dialog.Title><Dialog.Close asChild><Button type="button" variant="ghost" size="icon-sm" aria-label={t("closePreview")}><X aria-hidden="true" /></Button></Dialog.Close></div><div className="min-h-0 flex-1 overflow-auto bg-muted p-3 sm:p-5">{preview?.loading ? <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 aria-hidden="true" className="animate-spin" />{t("documentLoading")}</div> : null}{preview?.error ? <p role="alert" className="p-8 text-center text-sm font-semibold text-destructive">{t("documentViewError")}</p> : null}{preview?.url && previewType === "application/pdf" ? <iframe title={t("documentPreviewTitle")} src={preview.url} sandbox="" className="min-h-[65vh] w-full rounded-xl border border-line bg-card" /> : null}{preview?.url && imageTypes.has(previewType) ? <img src={preview.url} alt="" className="mx-auto max-h-[65vh] max-w-full rounded-xl object-contain" /> : null}{preview?.html ? <article className="prose max-w-none rounded-xl bg-card p-5 text-sm text-ink" dangerouslySetInnerHTML={{ __html: preview.html }} /> : null}{preview && !preview.loading && !preview.error && !canPreview ? <p className="p-8 text-center text-sm text-muted-foreground">{t("documentUnsupported")}</p> : null}</div><div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4"><Button type="button" variant="outline" size="sm" disabled={!preview?.url} onClick={download}><Download aria-hidden="true" />{t("downloadDocument")}</Button><Dialog.Close asChild><Button type="button" size="sm">{t("closePreview")}</Button></Dialog.Close></div></Dialog.Content></Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}

export { WorkshopDocumentsManager, meaningfulDocumentStatus };
