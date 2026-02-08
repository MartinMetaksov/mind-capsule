import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import type { GraphData, GraphLink, GraphNode } from "../types";
import { useGraphCollapse } from "./useGraphCollapse";

type HarnessProps = {
  data: GraphData;
  collapseId: string;
  defaultCollapsedIds?: Set<string> | null;
};

const Harness: React.FC<HarnessProps> = ({
  data,
  collapseId,
  defaultCollapsedIds,
}) => {
  const { visibleGraphData, toggleCollapse } = useGraphCollapse(data, {
    defaultCollapsedIds,
  });
  return (
    <div>
      <div data-testid="nodes">
        {visibleGraphData?.nodes.map((node) => node.id).join("|") ?? ""}
      </div>
      <div data-testid="links">{visibleGraphData?.links.length ?? 0}</div>
      <button onClick={() => toggleCollapse(collapseId)}>toggle</button>
    </div>
  );
};

const makeGraph = (): GraphData => {
  const root: GraphNode = { id: "root", label: "root", kind: "root" };
  const workspace: GraphNode = {
    id: "ws:1",
    label: "Workspace",
    kind: "workspace",
    workspaceId: "ws-1",
  };
  const parent: GraphNode = {
    id: "v-parent",
    label: "Parent",
    kind: "vertex",
    workspaceId: "ws-1",
  };
  const child: GraphNode = {
    id: "v-child",
    label: "Child",
    kind: "vertex",
    parentId: "v-parent",
    workspaceId: "ws-1",
  };
  const grandchild: GraphNode = {
    id: "v-grandchild",
    label: "Grandchild",
    kind: "vertex",
    parentId: "v-child",
    workspaceId: "ws-1",
  };
  const links: GraphLink[] = [
    { source: root, target: workspace, kind: "anchor" },
    { source: workspace, target: parent, kind: "edge" },
    { source: parent, target: child, kind: "edge" },
    { source: child, target: grandchild, kind: "edge" },
  ];
  return {
    nodes: [root, workspace, parent, child, grandchild],
    links,
  };
};

describe("useGraphCollapse", () => {
  it("hides descendant nodes and links when collapsed", () => {
    const graph = makeGraph();
    render(<Harness data={graph} collapseId="v-parent" />);

    expect(screen.getByTestId("nodes").textContent).toContain("v-child");
    expect(screen.getByTestId("nodes").textContent).toContain("v-grandchild");
    expect(screen.getByTestId("links").textContent).toBe("4");

    fireEvent.click(screen.getByRole("button", { name: "toggle" }));

    expect(screen.getByTestId("nodes").textContent).not.toContain("v-child");
    expect(screen.getByTestId("nodes").textContent).not.toContain("v-grandchild");
    expect(screen.getByTestId("links").textContent).toBe("2");
  });

  it("hides workspace vertices when workspace collapsed", () => {
    const graph = makeGraph();
    render(<Harness data={graph} collapseId="ws:1" />);

    expect(screen.getByTestId("nodes").textContent).toContain("v-parent");
    expect(screen.getByTestId("nodes").textContent).toContain("v-child");

    fireEvent.click(screen.getByRole("button", { name: "toggle" }));

    expect(screen.getByTestId("nodes").textContent).not.toContain("v-parent");
    expect(screen.getByTestId("nodes").textContent).not.toContain("v-child");
    expect(screen.getByTestId("links").textContent).toBe("1");
  });

  it("applies default collapsed ids before any user interaction", () => {
    const graph = makeGraph();
    render(
      <Harness
        data={graph}
        collapseId="v-parent"
        defaultCollapsedIds={new Set(["v-parent"])}
      />
    );

    expect(screen.getByTestId("nodes").textContent).not.toContain("v-child");
    expect(screen.getByTestId("nodes").textContent).not.toContain("v-grandchild");
    expect(screen.getByTestId("links").textContent).toBe("2");
  });

  it("allows toggling when defaults are provided", () => {
    const graph = makeGraph();
    render(
      <Harness
        data={graph}
        collapseId="v-parent"
        defaultCollapsedIds={new Set(["v-parent"])}
      />
    );

    expect(screen.getByTestId("nodes").textContent).not.toContain("v-child");
    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByTestId("nodes").textContent).toContain("v-child");
  });
});
