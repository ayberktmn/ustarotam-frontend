import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { OfferRejectModal } from "./offer-reject-modal";

const baseProps = {
  title: "Teklifi reddet",
  description: "Bu teklifi reddetmek istediğinizden emin misiniz?",
  amountLabel: "Teklif tutarı",
  amount: "₺12.500,00",
  confirmLabel: "Teklifi Reddet",
  cancelLabel: "Vazgeç",
  pendingLabel: "Reddediliyor…",
  error: null,
  isPending: false,
  onConfirm: vi.fn(),
  onClose: vi.fn(),
};

describe("OfferRejectModal", () => {
  it("renders the rejection details in an accessible dialog", () => {
    const html = renderToStaticMarkup(<OfferRejectModal {...baseProps} />);

    expect(html).toContain('role="dialog"');
    expect(html).toContain("Teklifi reddet");
    expect(html).toContain("₺12.500,00");
    expect(html).toContain("Teklifi Reddet");
    expect(html).toContain("Vazgeç");
  });

  it("disables both actions and shows the API error while pending", () => {
    const html = renderToStaticMarkup(
      <OfferRejectModal {...baseProps} error="Teklif reddedilemedi." isPending />,
    );

    expect(html.match(/disabled=""/g)).toHaveLength(2);
    expect(html).toContain("Reddediliyor…");
    expect(html).toContain('role="alert"');
    expect(html).toContain("Teklif reddedilemedi.");
  });
});
