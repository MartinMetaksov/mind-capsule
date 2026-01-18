import * as React from "react";
import {
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import type { Workspace } from "@/core/workspace";

type ProjectsWorkspacePopoverProps = {
  anchorEl: HTMLElement | null;
  workspaces: Workspace[];
  workspaceQuery: string;
  activeWorkspaceIndex: number;
  onClose: () => void;
  onQueryChange: (value: string) => void;
  onKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
  onSelectWorkspace: (workspace: Workspace) => void;
  onHoverWorkspace: (workspace: Workspace) => void;
};

export const ProjectsWorkspacePopover: React.FC<ProjectsWorkspacePopoverProps> = ({
  anchorEl,
  workspaces,
  workspaceQuery,
  activeWorkspaceIndex,
  onClose,
  onQueryChange,
  onKeyDown,
  onSelectWorkspace,
  onHoverWorkspace,
}) => {
  const { t } = useTranslation("common");

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "left" }}
      transformOrigin={{ vertical: "bottom", horizontal: "right" }}
      PaperProps={{
        sx: {
          width: 340,
          borderRadius: 2,
          overflow: "hidden",
        },
      }}
    >
      <Box sx={{ p: 1.25 }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>
          {t("projects.addToWorkspace")}
        </Typography>

        <TextField
          size="small"
          fullWidth
          value={workspaceQuery}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("projects.searchPlaceholder")}
          autoFocus
        />
      </Box>

      <Divider />

      <Box sx={{ maxHeight: 320, overflowY: "auto" }}>
        <List dense disablePadding>
          {workspaces.length === 0 ? (
            <Box sx={{ p: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                {t("projects.noWorkspaces")}
              </Typography>
            </Box>
          ) : (
            workspaces.map((ws) => (
              <ListItemButton
                key={ws.id}
                onClick={() => onSelectWorkspace(ws)}
                selected={ws.id === workspaces[activeWorkspaceIndex]?.id}
                onMouseEnter={() => onHoverWorkspace(ws)}
              >
                <ListItemText
                  primary={ws.name}
                  secondary={ws.path}
                  slotProps={{ secondary: { noWrap: true } }}
                />
              </ListItemButton>
            ))
          )}
        </List>
      </Box>
    </Popover>
  );
};
