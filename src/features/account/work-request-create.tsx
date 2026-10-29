"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { WorkRequestForm } from "@/features/account/work-request-form";
import { completeWorkRequestCreate } from "@/features/account/work-request-create-success";
import { useRouter } from "@/i18n/navigation";
import { workRequestService } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";

function WorkRequestCreate() {
  const t = useTranslations("account.requests");
  const queryClient = useQueryClient();
  const router = useRouter();
  const createRequest = useMutation({
    mutationFn: workRequestService.create,
    retry: false,
  });

  async function handleCreate(input: Parameters<typeof workRequestService.create>[0]): Promise<void> {
    const request = await createRequest.mutateAsync(input);
    completeWorkRequestCreate(request, {
      invalidateLists: () => queryClient.invalidateQueries({ queryKey: queryKeys.workRequests.lists }),
      cacheDetail: (created) => queryClient.setQueryData(queryKeys.workRequests.detail(created.id), created),
      showSuccess: () => toast.success(t("createSuccess")),
      navigateToDetail: (id) => router.push({ pathname: "/hesabim/talepler/[id]", params: { id } }),
      navigateToList: () => router.push("/hesabim/talepler"),
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 text-ink">{t("newTitle")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("newDescription")}</p>
      </header>
      <section className="rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6">
        <WorkRequestForm
          submitLabel={t("publishNow")}
          submittingLabel={t("saving")}
          onSubmit={handleCreate}
        />
      </section>
    </div>
  );
}

export { WorkRequestCreate };
