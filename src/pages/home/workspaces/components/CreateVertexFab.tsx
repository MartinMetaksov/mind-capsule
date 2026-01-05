import * as React from "react";
import { Fab, Tooltip } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";

type CreateVertexFabProps = {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

export const CreateVertexFab: React.FC<CreateVertexFabProps> = ({
  onClick,
}) => {
  return (
    <Tooltip title="Create vertex" placement="left">
      <Fab
        color="primary"
        onClick={onClick}
        sx={{
          position: "absolute",
          right: 20,
          bottom: 20,
        }}
      >
        <AddRoundedIcon />
      </Fab>
    </Tooltip>
  );
};
