import * as React from "react";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import CommentOutlinedIcon from "@mui/icons-material/CommentOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import { useTranslation } from "react-i18next";

import type { VertexItem } from "../../grid/VertexGrid";
import type { GraphNode } from "../types";
import { GraphActionModal } from "./GraphActionModal";
import type { GraphAction } from "./GraphActionRing";

type GraphReferenceModalProps = {
  open: boolean;
  items: VertexItem[];
  onClose: () => void;
  onSelectVertex?: (node: GraphNode) => void;
  onSelectNote?: (node: GraphNode) => void;
  onSelectImage?: (node: GraphNode) => void;
  onSelectFile?: (node: GraphNode) => void;
};

export const GraphReferenceModal: React.FC<GraphReferenceModalProps> = ({
  open,
  items,
  onClose,
  onSelectVertex,
  onSelectNote,
  onSelectImage,
  onSelectFile,
}) => {
  const { t } = useTranslation("common");

  const buildActions = React.useCallback(
    (selectedNode: GraphNode | null): GraphAction[] => {
      const isVertex = selectedNode?.kind === "vertex";
      const vertexNode = selectedNode ?? null;
      return [
        {
          key: "link-vertex",
          label: t("graphReferenceModal.actions.vertex"),
          icon: <AccountTreeOutlinedIcon fontSize="small" />,
          angle: 225,
          onClick: () => {
            if (vertexNode) onSelectVertex?.(vertexNode);
          },
          disabled: !isVertex,
        },
        {
          key: "link-note",
          label: t("graphReferenceModal.actions.note"),
          icon: <CommentOutlinedIcon fontSize="small" />,
          angle: 255,
          onClick: () => {
            if (vertexNode) onSelectNote?.(vertexNode);
          },
          disabled: !isVertex,
        },
        {
          key: "link-image",
          label: t("graphReferenceModal.actions.image"),
          icon: <ImageOutlinedIcon fontSize="small" />,
          angle: 285,
          onClick: () => {
            if (vertexNode) onSelectImage?.(vertexNode);
          },
          disabled: !isVertex,
        },
        {
          key: "link-file",
          label: t("graphReferenceModal.actions.file"),
          icon: <InsertDriveFileOutlinedIcon fontSize="small" />,
          angle: 315,
          onClick: () => {
            if (vertexNode) onSelectFile?.(vertexNode);
          },
          disabled: !isVertex,
        },
      ];
    },
    [onSelectFile, onSelectImage, onSelectNote, onSelectVertex, t]
  );

  return (
    <GraphActionModal
      open={open}
      onClose={onClose}
      title={t("graphReferenceModal.title")}
      subtitle={t("graphReferenceModal.subtitle")}
      items={items}
      getActions={buildActions}
    />
  );
};
