import * as React from "react";
import { Box, Typography } from "@mui/material";
import { Loading } from "@/common/loading/Loading";
import { useWorkspaces } from "./hooks/useWorkspaces";

import type { Vertex } from "@/core/vertex";
import type { Workspace } from "@/core/workspace";
import { WorkspaceSetup } from "./workspace-setup/WorkspaceSetup";
import { useVertices } from "./hooks/useVertices";
import { VertexRow } from "./vertices/VertexRow";
import { Reference } from "@/core/common/reference";

export const VertexOrchestrator: React.FC = () => {
  const {
    workspaces,
    loading: workspacesLoading,
    error: workspacesError,
    refreshWorkspaces,
  } = useWorkspaces();

  const {
    verticesByWorkspace,
    loading: verticesLoading,
    error: verticesError,
    reloadVertices,
  } = useVertices(workspaces);

  // 1) Loading workspaces
  if (workspacesLoading || !workspaces) {
    return <Loading />;
  }

  // 2) No workspaces => setup flow
  if (workspaces.length === 0) {
    return (
      <>
        {workspacesError && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Typography color="error" variant="body2">
              {workspacesError}
            </Typography>
          </Box>
        )}

        <WorkspaceSetup
          workspaces={workspaces}
          onChanged={async () => {
            await refreshWorkspaces();
            await reloadVertices();
          }}
        />
      </>
    );
  }

  // 3) Normal flow: rows per workspace
  return (
    <Box sx={{ pt: 1 }}>
      {(workspacesError || verticesError) && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Typography color="error" variant="body2">
            {workspacesError ?? verticesError}
          </Typography>
        </Box>
      )}

      {verticesLoading && (
        <Box sx={{ px: 2, py: 1 }}>
          <Loading />
        </Box>
      )}

      {workspaces.map((ws: Workspace) => (
        <VertexRow
          key={ws.id}
          workspace={ws}
          vertices={verticesByWorkspace[ws.id] ?? []}
          onCreateVertex={(workspace) => {
            // Wire this later to your create vertex flow
            console.log("Create vertex in workspace:", workspace);
          }}
          onOpenReferences={(vertex: Vertex, type: Reference["type"]) => {
            // Wire later (open drawer/modal)
            console.log("Open references:", { vertexId: vertex.id, type });
          }}
          onOpenChildren={(vertex: Vertex) => {
            // Wire later (drill down / navigate)
            console.log("Open children for:", vertex.id);
          }}
        />
      ))}
    </Box>
  );
};
