import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";

import { ItemsHeader } from "./ItemsHeader";
import { ProjectsWorkspacePopover } from "./ProjectsWorkspacePopover";
import { VertexRowActions } from "./VertexRowActions";
import { ViewModeTabs } from "./ViewModeTabs";
import type { Workspace } from "@/core/workspace";

const renderWithI18n = (ui: React.ReactElement) =>
  render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);

describe("ItemsHeader", () => {
  it("starts edit on click when not editing", () => {
    const onEditToggle = vi.fn();
    const onCancel = vi.fn();

    renderWithI18n(
      <ItemsHeader
        labelDraft="Chapters"
        editingLabel={false}
        labelSaving={false}
        labelInputRef={React.createRef()}
        onChangeLabel={vi.fn()}
        onEditToggle={onEditToggle}
        onCommit={vi.fn()}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole("textbox"));
    expect(onEditToggle).toHaveBeenCalledWith(true);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("commits on Enter and cancels on Escape", () => {
    const onEditToggle = vi.fn();
    const onCommit = vi.fn();
    const onCancel = vi.fn();

    renderWithI18n(
      <ItemsHeader
        labelDraft="Chapters"
        editingLabel
        labelSaving={false}
        labelInputRef={React.createRef()}
        onChangeLabel={vi.fn()}
        onEditToggle={onEditToggle}
        onCommit={onCommit}
        onCancel={onCancel}
      />
    );

    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCommit).toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Escape" });
    expect(onEditToggle).toHaveBeenCalledWith(false);
    expect(onCancel).toHaveBeenCalled();
  });
});

describe("ProjectsWorkspacePopover", () => {
  const workspaces: Workspace[] = [
    {
      id: "ws-1",
      name: "Workspace One",
      path: "/tmp/ws",
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-02T00:00:00.000Z",
      tags: [],
    },
  ];

  it("renders workspaces and fires selection callbacks", () => {
    const anchorEl = document.createElement("button");
    document.body.appendChild(anchorEl);
    const onSelectWorkspace = vi.fn();
    const onHoverWorkspace = vi.fn();

    renderWithI18n(
      <ProjectsWorkspacePopover
        anchorEl={anchorEl}
        workspaces={workspaces}
        workspaceQuery=""
        activeWorkspaceIndex={0}
        onClose={vi.fn()}
        onQueryChange={vi.fn()}
        onKeyDown={vi.fn()}
        onSelectWorkspace={onSelectWorkspace}
        onHoverWorkspace={onHoverWorkspace}
      />
    );

    fireEvent.mouseEnter(screen.getByText("Workspace One"));
    expect(onHoverWorkspace).toHaveBeenCalledWith(workspaces[0]);

    fireEvent.click(screen.getByText("Workspace One"));
    expect(onSelectWorkspace).toHaveBeenCalledWith(workspaces[0]);
  });
});

describe("VertexRowActions", () => {
  it("fires open and delete callbacks", () => {
    const onOpenFolder = vi.fn();
    const onDelete = vi.fn();

    render(
      <VertexRowActions
        onOpenFolder={onOpenFolder}
        onDelete={onDelete}
        openLabel="Open folder"
        deleteLabel="Delete"
      />
    );

    fireEvent.click(screen.getByLabelText("Open folder"));
    fireEvent.click(screen.getByLabelText("Delete"));

    expect(onOpenFolder).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

describe("ViewModeTabs", () => {
  it("switches view modes", () => {
    const handleChange = vi.fn();

    renderWithI18n(<ViewModeTabs value="grid" onChange={handleChange} />);

    const listButtons = screen.getAllByRole("button", { name: "List view" });
    fireEvent.click(listButtons[0]);
    expect(handleChange).toHaveBeenCalledWith("list");
  });
});
