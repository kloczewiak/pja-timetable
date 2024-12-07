import { createContext, useContext } from "react";

type ViewstateContextType = {
  viewstate: string;
  setViewstate: (viewstate: string) => void;
};

const ViewstateContext = createContext<ViewstateContextType | undefined>(
  undefined,
);

export function ViewStateProvider({
  children,
  viewstate,
  setViewstate,
}: {
  children: React.ReactNode;
  viewstate: string;
  setViewstate: (viewstate: string) => void;
}) {
  const value = { viewstate, setViewstate };

  return (
    <ViewstateContext.Provider value={value}>
      {children}
    </ViewstateContext.Provider>
  );
}

export function useViewstate() {
  const context = useContext(ViewstateContext);
  if (context === undefined) {
    throw new Error("useViewstate must be used within a ViewStateProvider");
  }
  return context;
}
