import * as React from "react";
import { Fab, Tooltip } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";

type CreateFabProps = {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  sx?: object;
};

export const CreateFab: React.FC<CreateFabProps> = ({
  onClick,
  title = "Create",
  sx = {},
}) => {
  return (
    <Tooltip title={title} placement="left">
      <Fab
        color="primary"
        onClick={onClick}
        sx={{
          position: "absolute",
          right: 20,
          bottom: 20,
          ...sx,
        }}
      >
        <AddRoundedIcon />
      </Fab>
    </Tooltip>
  );
};
