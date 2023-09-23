import { Card, ScrollArea, Theme } from "@radix-ui/themes";
import TreeView from "./TreeView";
import MainView from "./MainView";

import { treeData, treeViewData } from "./data";

export default () => {
  return (
    <Theme>
      <div className="w-full h-screen relative flex flex-row">
        <div className="w-96 h-full flex flex-col">
          <Card m={"2"}>
            <TreeView data={treeData} />
          </Card>
        </div>
        <div className="flex-1 h-full bg-slate-300">
          <MainView />
        </div>
      </div>
    </Theme>
  );
};
