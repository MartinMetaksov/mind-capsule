import * as React from "react";
import { Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import {
  CreateVertexDialog,
  DeleteVertexDialog,
  CreateVertexForm,
} from "../../components/vertex-dialogs/VertexDialogs";
import type { VertexItem } from "../views/grid/VertexGrid";

type ProjectsDialogsProps = {
  editorOpen: boolean;
  error: string | null;
  confirmDelete: VertexItem | null;
  workspaceLabel?: string;
  onCloseCreate: () => void;
  onSubmitCreate: (data: CreateVertexForm) => void | Promise<void>;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
};

export const ProjectsDialogs: React.FC<ProjectsDialogsProps> = ({
  editorOpen,
  error,
  confirmDelete,
  workspaceLabel,
  onCloseCreate,
  onSubmitCreate,
  onCancelDelete,
  onConfirmDelete,
}) => {
  const { t } = useTranslation("common");

  return (
    <>
      <CreateVertexDialog
        open={editorOpen}
        onClose={onCloseCreate}
        onSubmit={onSubmitCreate}
        workspaceLabel={workspaceLabel}
        submitLabel={t("projects.create")}
        title={t("projects.create")}
      />
      {error && (
        <Typography color="error" variant="body2" sx={{ px: 2, pt: 1 }}>
          {error}
        </Typography>
      )}

      <DeleteVertexDialog
        open={Boolean(confirmDelete)}
        name={confirmDelete?.vertex.title}
        onCancel={onCancelDelete}
        onConfirm={onConfirmDelete}
        entityLabel={t("projects.entityLabel")}
      />
    </>
  );
};
