import * as React from "react";
import type { Vertex } from "@/core/vertex";
import { getFileSystem } from "@/integrations/fileSystem/integration";
import type { VertexItemCounts } from "../../grid/VertexGrid";
import type { GraphData } from "../types";

type UseGraphCountsResult = {
  countsByVertexId: Record<string, VertexItemCounts>;
};

export const useGraphCounts = (graphData: GraphData | null): UseGraphCountsResult => {
  const [countsByVertexId, setCountsByVertexId] = React.useState<
    Record<string, VertexItemCounts>
  >({});

  React.useEffect(() => {
    let active = true;
    const loadCounts = async () => {
      if (!graphData) {
        setCountsByVertexId({});
        return;
      }
      const vertices = graphData.nodes
        .filter((node) => node.kind === "vertex" && node.vertex)
        .map((node) => node.vertex as Vertex);
      if (vertices.length === 0) {
        setCountsByVertexId({});
        return;
      }
      const childCounts = new Map<string, number>();
      vertices.forEach((vertex) => {
        const parentId = vertex.parent_id ?? null;
        if (!parentId) return;
        childCounts.set(parentId, (childCounts.get(parentId) ?? 0) + 1);
      });
      try {
        const fs = await getFileSystem();
        const results = await Promise.all(
          vertices.map(async (vertex) => {
            try {
              const [notes, images, links] = await Promise.all([
                fs.listNotes(vertex),
                fs.listImages(vertex),
                fs.listLinks(vertex),
              ]);
              let filesCount = 0;
              try {
                const { isTauri } = await import("@tauri-apps/api/core");
                if (await isTauri()) {
                  const { readDir } = await import("@tauri-apps/plugin-fs");
                  const entries = await readDir(vertex.asset_directory);
                  filesCount = entries.filter((entry) => {
                    const name = entry.name ?? "";
                    if (!name || name.startsWith(".")) return false;
                    const ext = name.split(".").pop()?.toLowerCase() ?? "";
                    if (["json", "md"].includes(ext)) return false;
                    if (
                      [
                        "png",
                        "jpg",
                        "jpeg",
                        "gif",
                        "webp",
                        "bmp",
                        "tiff",
                        "svg",
                      ].includes(ext)
                    ) {
                      return false;
                    }
                    return true;
                  }).length;
                }
              } catch {
                filesCount = 0;
              }
              return [
                vertex.id,
                {
                  items: childCounts.get(vertex.id) ?? 0,
                  notes: notes.length,
                  images: images.length,
                  urls: links.length,
                  files: filesCount,
                },
              ] as const;
            } catch {
              return null;
            }
          })
        );
        if (!active) return;
        const next: Record<string, VertexItemCounts> = {};
        results.forEach((entry) => {
          if (!entry) return;
          next[entry[0]] = entry[1];
        });
        setCountsByVertexId(next);
      } catch {
        if (!active) return;
        setCountsByVertexId({});
      }
    };
    loadCounts();
    return () => {
      active = false;
    };
  }, [graphData]);

  return { countsByVertexId };
};
