import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Box,
} from "@mui/material";
import { ThemePreference } from "@/utils/themes/themePreference";

type Props = {
  open: boolean;
  onClose: () => void;
  preference: ThemePreference;
  onChangePreference: (val: ThemePreference) => void;
};

export const SettingsDialog: React.FC<Props> = ({
  open,
  onClose,
  preference,
  onChangePreference,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { minHeight: "60vh" } }}
    >
      <DialogTitle>Settings</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 2fr" },
            columnGap: 3,
            rowGap: 2,
            alignItems: "center",
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Theme
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose how the app looks.
            </Typography>
          </Box>
          <Box
            sx={{
              borderLeft: { xs: "none", sm: (theme) => `1px solid ${theme.palette.divider}` },
              pl: { xs: 0, sm: 3 },
            }}
          >
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={preference}
              onChange={(_, val) => val && onChangePreference(val)}
              size="small"
            >
              <ToggleButton value="system">Auto</ToggleButton>
              <ToggleButton value="light">Light</ToggleButton>
              <ToggleButton value="dark">Dark</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
