import * as React from "react";
import { Box, Breadcrumbs, Link, Typography } from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

type BreadcrumbItem = {
  id: string;
  label: string;
  onClick?: () => void;
  title?: string;
};

type BreadcrumbsTrailProps = {
  rootLabel: string;
  onRootClick?: () => void;
  items?: BreadcrumbItem[];
};

export const BreadcrumbsTrail: React.FC<BreadcrumbsTrailProps> = ({
  rootLabel,
  onRootClick,
  items = [],
}) => {
  return (
    <Box
      sx={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        zIndex: 2,
        px: 2,
        py: 1.25,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
        {onRootClick ? (
          <Link
            component="button"
            onClick={onRootClick}
            underline="hover"
            color="inherit"
            style={{ fontWeight: 800 }}
          >
            {rootLabel}
          </Link>
        ) : (
          <Typography color="text.primary" sx={{ fontWeight: 900 }}>
            {rootLabel}
          </Typography>
        )}

        {items.map((item) =>
          item.onClick ? (
            <Link
              key={item.id}
              component="button"
              onClick={item.onClick}
              underline="hover"
              color="inherit"
              style={{ fontWeight: 800 }}
              title={item.title}
            >
              {item.label}
            </Link>
          ) : (
            <Typography
              key={item.id}
              color="text.primary"
              sx={{ fontWeight: 900 }}
            >
              {item.label}
            </Typography>
          ),
        )}
      </Breadcrumbs>
    </Box>
  );
};
