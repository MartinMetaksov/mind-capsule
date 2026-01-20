import * as React from "react";
import { Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import {
  CreateVertexDialog,
  DeleteVertexDialog,
  CreateVertexForm,
} from "../../components/vertex-dialogs/VertexDialogs";
import type { VertexItem } from "../views/grid/VertexGrid";

type ItemsDialogsProps = {
  createOpen: boolean;
  createError: string | null;
  confirmDelete: VertexItem | null;
  onCloseCreate: () => void;
  onSubmitCreate: (data: CreateVertexForm) => void | Promise<void>;
  onCancelDelete: () => void;
  onConfirmDelete: () => void | Promise<void>;
};

export const ItemsDialogs: React.FC<ItemsDialogsProps> = ({
  createOpen,
  createError,
  confirmDelete,
  onCloseCreate,
  onSubmitCreate,
  onCancelDelete,
  onConfirmDelete,
}) => {
  const { t } = useTranslation("common");

  return (
    <>
      <CreateVertexDialog
        open={createOpen}
        onClose={onCloseCreate}
        onSubmit={onSubmitCreate}
        submitLabel={t("itemsTab.create")}
        title={t("itemsTab.create")}
      />
      {createError && (
        <Typography color="error" variant="body2" sx={{ px: 2, pt: 1 }}>
          {createError}
        </Typography>
      )}

      <DeleteVertexDialog
        open={Boolean(confirmDelete)}
        name={confirmDelete?.vertex.title}
        onCancel={onCancelDelete}
        onConfirm={onConfirmDelete}
        entityLabel="item"
      />
    </>
  );
};
