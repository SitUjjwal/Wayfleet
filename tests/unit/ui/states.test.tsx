/** @jsxImportSource react */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";

describe("feedback states", () => {
  it("renders an empty catalog message", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="No vehicles found."
        description="Try another city."
      />,
    );
    expect(html).toContain("No vehicles found.");
    expect(html).toContain("Try another city.");
  });

  it("renders a polite loading status", () => {
    const html = renderToStaticMarkup(
      <LoadingState message="Loading vehicles..." />,
    );
    expect(html).toContain("Loading vehicles...");
    expect(html).toContain('role="status"');
  });

  it("renders an error as an alert", () => {
    const html = renderToStaticMarkup(
      <ErrorState title="Could not load vehicles" />,
    );
    expect(html).toContain("Could not load vehicles");
    expect(html).toContain('role="alert"');
  });
});
