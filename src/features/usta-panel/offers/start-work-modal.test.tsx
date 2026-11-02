import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StartWorkModal } from "@/features/usta-panel/offers/start-work-modal";

describe("StartWorkModal", () => {
  it("renders the responsive accessible confirmation without browser confirm", () => {
    const html = renderToStaticMarkup(<StartWorkModal title="İşe başlamak istiyor musunuz?" description="Devam ediyor" cancelLabel="Hayır, Vazgeç" confirmLabel="Evet, İşe Başla" pendingLabel="Başlatılıyor" error={null} pending={false} onCancel={() => undefined} onConfirm={() => undefined} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain("Hayır, Vazgeç");
    expect(html).toContain("Evet, İşe Başla");
  });
});
