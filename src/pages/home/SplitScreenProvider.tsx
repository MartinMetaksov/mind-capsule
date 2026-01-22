import * as React from "react";
import SplitScreenContext, {
  type SplitScreenContextValue,
} from "./SplitScreenContext";

export const SplitScreenProvider: React.FC<
  React.PropsWithChildren<SplitScreenContextValue>
> = ({ splitEnabled, children }) => {
  return (
    <SplitScreenContext.Provider value={{ splitEnabled }}>
      {children}
    </SplitScreenContext.Provider>
  );
};
