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
};

export const VerticalTabs = <T extends string>({
  value,
  onChange,
  items,
}: VerticalTabsProps<T>) => {
  return (
    <Tabs
      orientation="vertical"
      value={value}
      onChange={(_, nextValue) => onChange(nextValue)}
      variant="scrollable"
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
        overflowY: "auto",
        overflowX: "hidden",
        "& .MuiTab-root": {
          minHeight: 84,
          px: 1,
          py: 1.2,
          textTransform: "none",
          gap: 0.5,
        },
        "& .MuiTab-wrapper": { gap: 0.5 },
      }}
    >
      {items.map((item) => (
        <Tab
          key={item.value}
          value={item.value}
          icon={item.icon}
          iconPosition="top"
          label={item.label}
        />
      ))}
    </Tabs>
  );
};
