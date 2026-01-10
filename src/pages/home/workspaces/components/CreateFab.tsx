import * as React from "react";
import { Fab, Tooltip } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";

export type CreateFabHandle = {
  click: () => void;
  button: HTMLButtonElement | null;
};

type CreateFabProps = {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  sx?: object;
};

export const CreateFab = React.forwardRef<CreateFabHandle, CreateFabProps>(
  ({ onClick, title = "Create", sx = {} }, ref) => {
    const buttonRef = React.useRef<HTMLButtonElement | null>(null);

    React.useImperativeHandle(ref, () => ({
      click: () => buttonRef.current?.click(),
      button: buttonRef.current,
    }));

    return (
      <Tooltip title={title} placement="left">
        <Fab
          ref={buttonRef}
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
  }
);
