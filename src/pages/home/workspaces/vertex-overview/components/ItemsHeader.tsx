import * as React from "react";
import { Box, InputBase } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { useTranslation } from "react-i18next";

type ItemsHeaderProps = {
  labelDraft: string;
  editingLabel: boolean;
  labelSaving: boolean;
  labelInputRef: React.RefObject<HTMLInputElement>;
  onChangeLabel: (value: string) => void;
  onEditToggle: (editing: boolean) => void;
  onCommit: (value?: string) => void | Promise<void>;
  onCancel: () => void;
};

export const ItemsHeader: React.FC<ItemsHeaderProps> = ({
  labelDraft,
  editingLabel,
  labelSaving,
  labelInputRef,
  onChangeLabel,
  onEditToggle,
  onCommit,
  onCancel,
}) => {
  const { t } = useTranslation("common");

  return (
    <Box
      sx={(theme) => ({
        mb: 1,
        minHeight: `calc(${theme.typography.h6.fontSize} * ${String(
          theme.typography.h6.lineHeight ?? 1.4
        )})`,
        display: "flex",
        alignItems: "center",
        maxWidth: 360,
        cursor: "text",
        "&:hover .items-title-input": editingLabel
          ? undefined
          : {
              textDecorationColor: "currentColor",
              textDecorationThickness: "2px",
            },
      })}
      onClick={() => {
        if (!editingLabel) {
          onEditToggle(true);
        }
      }}
    >
      <EditOutlinedIcon
        fontSize="small"
        sx={{
          mr: 1,
          color: "text.secondary",
          opacity: editingLabel ? 0.6 : 0.9,
        }}
      />
      <InputBase
        value={labelDraft}
        onChange={(e) => onChangeLabel(e.target.value)}
        onBlur={() => {
          if (editingLabel) {
            void onCommit();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void onCommit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onEditToggle(false);
            onCancel();
          }
        }}
        placeholder={t("vertex.tabs.items")}
        readOnly={!editingLabel}
        disabled={labelSaving}
        className="items-title-input"
        inputRef={labelInputRef}
        inputProps={{
          "aria-label": t("vertex.tabs.items"),
        }}
        sx={(theme) => ({
          flex: 1,
          fontSize: theme.typography.h6.fontSize,
          fontWeight: theme.typography.h6.fontWeight,
          lineHeight: theme.typography.h6.lineHeight,
          color: "text.primary",
          padding: 0,
          "& .MuiInputBase-input": {
            padding: 0,
            cursor: "text",
          },
        })}
      />
    </Box>
  );
};
