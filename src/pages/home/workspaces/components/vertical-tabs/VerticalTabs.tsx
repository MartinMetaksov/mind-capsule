import * as React from "react";
import { Box, IconButton, Tab, Tabs } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

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
  const tabsRef = React.useRef<HTMLDivElement | null>(null);
  const scrollerRef = React.useRef<HTMLElement | null>(null);
  const [scrollState, setScrollState] = React.useState({
    hasOverflow: false,
    canScrollUp: false,
    canScrollDown: false,
  });

  React.useLayoutEffect(() => {
    const root = tabsRef.current;
    if (!root) return;
    const scroller = root.querySelector<HTMLElement>(".MuiTabs-scroller");
    if (!scroller) return;
    scrollerRef.current = scroller;
    const update = () => {
      const maxScroll = scroller.scrollHeight - scroller.clientHeight;
      const hasOverflow = maxScroll > 1;
      const canScrollUp = scroller.scrollTop > 1;
      const canScrollDown = scroller.scrollTop < maxScroll - 1;
      setScrollState({ hasOverflow, canScrollUp, canScrollDown });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    observer.observe(root);
    scroller.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      scroller.removeEventListener("scroll", update);
    };
  }, [items.length, collapsed]);

  const handleScroll = React.useCallback((delta: number) => {
    scrollerRef.current?.scrollBy({ top: delta, behavior: "smooth" });
  }, []);

  return (
    <Box
      sx={{
        position: "relative",
        flex: 1,
        minHeight: 0,
        height: "100%",
        display: "flex",
      }}
    >
      <Tabs
        ref={tabsRef}
        orientation="vertical"
        value={value}
        onChange={(_, nextValue) => onChange(nextValue)}
        variant="scrollable"
        scrollButtons={false}
      data-collapsed={collapsed ? "true" : "false"}
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
            paddingTop: 6,
            paddingBottom: 10,
          },
          "& .MuiTab-root": {
            minHeight: 84,
            px: 1,
            py: 1.2,
            textTransform: "none",
            gap: 0.5,
            transition: "min-height 160ms ease, padding 160ms ease",
          },
          "& .MuiTab-wrapper": { gap: 0.5 },
          "& .tabs-label": {
            transition:
              "max-width 180ms ease, transform 180ms ease, opacity 0ms",
            overflow: "hidden",
            maxWidth: 200,
            transform: "translateX(0)",
            opacity: 1,
            visibility: "visible",
          },
          "&[data-collapsed='true'] .tabs-label": {
            maxWidth: 0,
            transform: "translateX(-8px)",
            opacity: 0,
            visibility: "hidden",
          },
          ...(collapsed
            ? {
                "& .MuiTab-root": {
                  minHeight: 56,
                  height: 56,
                  px: 0,
                  py: 0,
                  minWidth: 56,
                  justifyContent: "center",
                  alignItems: "center",
                },
                "& .MuiTab-wrapper": {
                  height: "100%",
                  width: "100%",
                  justifyContent: "center",
                  alignItems: "center",
                  flexDirection: "row",
                },
                "& .MuiTab-iconWrapper": {
                  margin: 0,
                  lineHeight: 1,
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
          iconPosition={collapsed ? "start" : "top"}
          label={<span className="tabs-label">{item.label}</span>}
        />
      ))}
      </Tabs>
      {scrollState.hasOverflow && (
        <>
          <IconButton
            size="small"
            onClick={() => handleScroll(-140)}
            disableRipple
            sx={{
              position: "absolute",
              top: 4,
              left: "50%",
              transform: "translateX(-50%)",
              opacity: scrollState.canScrollUp ? 1 : 0.35,
              pointerEvents: scrollState.canScrollUp ? "auto" : "none",
              bgcolor: "transparent",
              boxShadow: "none",
              color: "text.secondary",
              "&:hover": {
                bgcolor: "transparent",
                color: "text.primary",
              },
            }}
          >
            <KeyboardArrowUpIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleScroll(140)}
            disableRipple
            sx={{
              position: "absolute",
              bottom: 43,
              left: "50%",
              transform: "translateX(-50%)",
              opacity: scrollState.canScrollDown ? 1 : 0.35,
              pointerEvents: scrollState.canScrollDown ? "auto" : "none",
              bgcolor: "transparent",
              boxShadow: "none",
              color: "text.secondary",
              "&:hover": {
                bgcolor: "transparent",
                color: "text.primary",
              },
            }}
          >
            <KeyboardArrowDownIcon fontSize="small" />
          </IconButton>
        </>
      )}
    </Box>
  );
};
