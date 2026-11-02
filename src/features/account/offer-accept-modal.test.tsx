import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { OfferAcceptModal } from "./offer-accept-modal";

const baseProps = {
  title: "Teklifi kabul et",
  description: "Bu teklifi kabul ettiğinizde iş seçtiğiniz servise atanacaktır. Devam etmek istiyor musunuz?",
  amountLabel: "Teklif tutarı",
  amount: "₺12.500,00",
  serviceLabel: "Servis",
  serviceName: "Teklif veren servis",
  confirmLabel: "Teklifi Kabul Et",
  cancelLabel: "Vazgeç",
  pendingLabel: "Kabul ediliyor…",
  error: null,
  isPending: false,
  onConfirm: vi.fn(),
  onClose: vi.fn(),
};

describe("OfferAcceptModal", () => {
  it("renders the confirmation details in an accessible dialog", () => {
    const html = renderToStaticMarkup(<OfferAcceptModal {...baseProps} />);

    expect(html).toContain('role="dialog"');
    expect(html).toContain("Teklifi kabul et");
    expect(html).toContain("₺12.500,00");
    expect(html).toContain("Teklif veren servis");
    expect(html).toContain("Teklifi Kabul Et");
    expect(html).toContain("Vazgeç");
  });

  it("disables both actions and shows an inline API error while pending", () => {
    const html = renderToStaticMarkup(
      <OfferAcceptModal
        {...baseProps}
        error="Teklif kabul edilemedi. Lütfen tekrar deneyin."
        isPending
      />,
    );

    expect(html.match(/disabled=""/g)).toHaveLength(2);
    expect(html).toContain("Kabul ediliyor…");
    expect(html).toContain('role="alert"');
    expect(html).toContain("Teklif kabul edilemedi. Lütfen tekrar deneyin.");
  });
});
