import * as React from "react";

export type SplitScreenContextValue = {
  splitEnabled: boolean;
};

const SplitScreenContext = React.createContext<SplitScreenContextValue>({
  splitEnabled: false,
});

export const useSplitScreen = () => React.useContext(SplitScreenContext);

export default SplitScreenContext;
