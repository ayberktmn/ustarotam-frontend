import { expect, it } from "vitest";

import { meaningfulDocumentStatus } from "./workshop-documents-manager";

it("shows only backend document statuses that have a verified UI meaning", () => {
  expect(meaningfulDocumentStatus("PENDING")).toBe("pending");
  expect(meaningfulDocumentStatus("approved")).toBe("approved");
  expect(meaningfulDocumentStatus("REJECTED")).toBe("rejected");
  expect(meaningfulDocumentStatus(undefined)).toBeNull();
  expect(meaningfulDocumentStatus("UNKNOWN")).toBeNull();
});
