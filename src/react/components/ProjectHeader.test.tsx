import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectHeader } from "./ProjectHeader";

describe("ProjectHeader", () => {
  it("renders the project name and version", () => {
    render(<ProjectHeader project={{ name: "checkout-service", version: "2.4.0" }} />);
    expect(screen.getByText("checkout-service")).toBeInTheDocument();
    expect(screen.getByText("v2.4.0")).toBeInTheDocument();
  });

  it("falls back to 'No information' when the project has no name", () => {
    render(<ProjectHeader project={{ version: "2.4.0" }} />);
    expect(screen.getByText("No information")).toBeInTheDocument();
  });

  it("renders nothing when there is no project meta", () => {
    const { container } = render(<ProjectHeader project={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the source and generatedAt as document-level metadata", () => {
    render(
      <ProjectHeader
        project={{ name: "checkout-service", version: "2.4.0" }}
        source="spdx"
        generatedAt="2026-08-01T12:00:00Z"
      />,
    );
    expect(screen.getByText("SPDX")).toBeInTheDocument();
    expect(screen.getByText("Generated 2026-08-01")).toBeInTheDocument();
  });

  it("renders the source/generatedAt even when there is no project meta", () => {
    const { container } = render(
      <ProjectHeader project={undefined} source="cyclonedx" generatedAt="2026-08-01T12:00:00Z" />,
    );
    expect(container).not.toBeEmptyDOMElement();
    expect(screen.getByText("CycloneDX")).toBeInTheDocument();
    expect(screen.queryByText("Project under investigation")).not.toBeInTheDocument();
  });
});
