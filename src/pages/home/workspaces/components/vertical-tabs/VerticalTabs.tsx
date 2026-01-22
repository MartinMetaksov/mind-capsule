import * as React from "react";
import { Tab, Tabs } from "@mui/material";

type VerticalTabItem<T extends string> = {
  value: T;
  label: string;
  icon: React.ReactElement;
};

type VerticalTabsProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  items: VerticalTabItem<T>[];
  collapsed?: boolean;
};

export const VerticalTabs = <T extends string>({
  value,
  onChange,
  items,
  collapsed = false,
}: VerticalTabsProps<T>) => {
  return (
    <Tabs
      orientation="vertical"
      value={value}
      onChange={(_, nextValue) => onChange(nextValue)}
      variant="scrollable"
      scrollButtons={collapsed ? false : "auto"}
      allowScrollButtonsMobile
      TabIndicatorProps={{
        sx: {
          left: 0,
          right: "auto",
          width: 3,
        },
      }}
      sx={{
        flex: 1,
        minHeight: 0,
        height: "100%",
        overflow: "hidden",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": {
          display: "none",
        },
        "& .MuiTabs-scroller": {
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          paddingBottom: 8,
        },
        "& .MuiTab-root": {
          minHeight: 84,
          px: 1,
          py: 1.2,
          textTransform: "none",
          gap: 0.5,
        },
        "& .MuiTab-wrapper": { gap: 0.5 },
        ...(collapsed
          ? {}
          : {
              "& .MuiTabs-scrollButtons:last-of-type": {
                marginBottom: 5,
              },
            }),
        ...(collapsed
          ? {
              "& .MuiTab-root": {
                minHeight: 68,
                px: 0,
                py: 1,
                minWidth: 56,
                justifyContent: "center",
                alignItems: "center",
              },
              "& .MuiTab-iconWrapper": {
                margin: 0,
              },
            }
          : {}),
      }}
    >
      {items.map((item) => (
        <Tab
          key={item.value}
          value={item.value}
          icon={item.icon}
          iconPosition="top"
          label={collapsed ? "" : item.label}
        />
      ))}
    </Tabs>
  );
};
