import * as React from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { ACTION_EXIT_MS, ACTION_STAGGER_MS } from "../constants";

type GraphAction = {
  key: string;
  label: string;
  icon: React.ReactNode;
  angle: number;
  onClick: () => void;
  disabled?: boolean;
};

type GraphActionRingProps = {
  actionRef: React.RefObject<HTMLDivElement>;
  radius: number;
  actions: GraphAction[];
  isOpen: boolean;
  sequenceKey: string;
};

export const GraphActionRing: React.FC<GraphActionRingProps> = ({
  actionRef,
  radius,
  actions,
  isOpen,
  sequenceKey,
}) => {
  const [phase, setPhase] = React.useState<
    "closed" | "opening" | "open" | "closing"
  >("closed");

  React.useEffect(() => {
    if (isOpen) {
      const frame = window.requestAnimationFrame(() => {
        setPhase("opening");
        window.requestAnimationFrame(() => {
          setPhase("open");
        });
      });
      return () => window.cancelAnimationFrame(frame);
    }

    setPhase("closing");
    const duration = actions.length * ACTION_STAGGER_MS + ACTION_EXIT_MS;
    const timeout = window.setTimeout(() => {
      setPhase("closed");
    }, duration);
    return () => window.clearTimeout(timeout);
  }, [actions.length, isOpen, sequenceKey]);

  const isActive = phase === "open";
  const isClosing = phase === "closing";

  return (
    <Box
      ref={actionRef}
      sx={{
        position: "absolute",
        left: 0,
        top: 0,
        transform: "translate(-9999px, -9999px)",
        pointerEvents: isOpen ? "auto" : "none",
        zIndex: 3,
        opacity: 1,
        willChange: "opacity, transform",
      }}
    >
      <Box sx={{ position: "relative", width: 0, height: 0 }}>
        {actions.map((action, index) => {
          const radians = (action.angle * Math.PI) / 180;
          const left = Math.cos(radians) * radius;
          const top = Math.sin(radians) * radius;
          const order = isClosing ? actions.length - 1 - index : index;
          const delay = `${order * ACTION_STAGGER_MS}ms`;
          return (
            <Tooltip
              key={action.key}
              title={action.label}
              placement="right"
              followCursor
            >
              <span>
                <IconButton
                  size="small"
                  sx={{
                    position: "absolute",
                    left,
                    top,
                    transform: `translate(-50%, -50%) scale(${
                      isActive ? 1 : 0.7
                    })`,
                    bgcolor: "background.paper",
                    opacity: isActive ? 1 : 0,
                    transition: "opacity 180ms ease, transform 180ms ease",
                    transitionDelay: delay,
                  }}
                  onClick={() => {
                    action.onClick();
                  }}
                  disabled={action.disabled}
                  aria-label={action.label}
                >
                  {action.icon}
                </IconButton>
              </span>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
};
