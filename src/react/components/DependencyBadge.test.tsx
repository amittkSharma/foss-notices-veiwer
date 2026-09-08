import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DependencyBadge } from "./DependencyBadge";

describe("DependencyBadge", () => {
  it("renders 'Direct'", () => {
    render(<DependencyBadge dependencyType="direct" />);
    expect(screen.getByText("Direct")).toBeInTheDocument();
  });

  it("renders 'Transitive'", () => {
    render(<DependencyBadge dependencyType="transitive" />);
    expect(screen.getByText("Transitive")).toBeInTheDocument();
  });

  it("renders 'Unknown' when dependencyType is undefined", () => {
    render(<DependencyBadge dependencyType={undefined} />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });
});
