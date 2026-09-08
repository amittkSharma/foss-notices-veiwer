import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { NoticesFileUpload } from "./NoticesFileUpload";

function fixture(name: string): string {
  return readFileSync(path.resolve(process.cwd(), "fixtures", name), "utf-8");
}

function uploadFile(text: string, name: string, type: string) {
  return new File([text], name, { type });
}

describe("NoticesFileUpload", () => {
  it("renders the viewer once a valid SPDX file passes schema validation", async () => {
    const user = userEvent.setup();
    render(<NoticesFileUpload />);

    const input = screen.getByLabelText("Notices file");
    const file = uploadFile(fixture("spdx-sample.json"), "spdx-sample.json", "application/json");
    await user.upload(input, file);

    expect(await screen.findByText("left-pad")).toBeInTheDocument();
  });

  it("shows the validation report instead of the viewer when schema validation fails", async () => {
    const user = userEvent.setup();
    render(<NoticesFileUpload />);

    const input = screen.getByLabelText("Notices file");
    const file = uploadFile(
      fixture("spdx-invalid-sample.json"),
      "spdx-invalid-sample.json",
      "application/json",
    );
    await user.upload(input, file);

    expect(await screen.findByText("✗ Invalid")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /group by/i })).not.toBeInTheDocument();
  });

  it("flags a format mismatch before attempting schema validation", async () => {
    const user = userEvent.setup();
    render(<NoticesFileUpload defaultFormat="black-duck" />);

    const input = screen.getByLabelText("Notices file");
    const file = uploadFile(fixture("spdx-sample.json"), "spdx-sample.json", "application/json");
    await user.upload(input, file);

    expect(
      await screen.findByText(/expects a plain-text notices file, but this one looks like JSON/i),
    ).toBeInTheDocument();
  });

  it("shows the validation report instead of the viewer for a Black Duck file with a garbled header", async () => {
    const user = userEvent.setup();
    render(<NoticesFileUpload defaultFormat="black-duck" />);

    const input = screen.getByLabelText("Notices file");
    const file = uploadFile(
      fixture("blackduck-invalid-sample.txt"),
      "blackduck-invalid-sample.txt",
      "text/plain",
    );
    await user.upload(input, file);

    expect(await screen.findByText("✗ Invalid")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /group by/i })).not.toBeInTheDocument();
    // Regression guard: a section header that doesn't match "<name> <version>" (e.g. just
    // "1.3.0") used to be downgraded to a warning, so the garbled component (name="1.3.0",
    // no version) would render in the viewer instead of being caught here.
    expect(screen.queryByText("1.3.0")).not.toBeInTheDocument();
  });

  it("switching format resets a previously loaded file's results", async () => {
    const user = userEvent.setup();
    render(<NoticesFileUpload />);

    const input = screen.getByLabelText("Notices file");
    const file = uploadFile(fixture("spdx-sample.json"), "spdx-sample.json", "application/json");
    await user.upload(input, file);
    expect(await screen.findByText("left-pad")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Format"), "cyclonedx");
    expect(screen.queryByText("left-pad")).not.toBeInTheDocument();
  });

  it("always starts the resulting viewer in detail view", async () => {
    const user = userEvent.setup();
    render(<NoticesFileUpload />);

    const input = screen.getByLabelText("Notices file");
    const file = uploadFile(fixture("spdx-sample.json"), "spdx-sample.json", "application/json");
    await user.upload(input, file);

    expect(await screen.findByRole("button", { name: /left-pad/ })).toBeInTheDocument();
    expect(screen.getByLabelText("View")).toHaveValue("detail");
  });
});
