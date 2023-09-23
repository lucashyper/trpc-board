import React, { useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ChevronDownIcon } from "@radix-ui/react-icons";

import { map } from "nanostores";
import { create } from "zustand";
import { combine } from "zustand/middleware";

import { useIsOpenStore } from "../stores";
import type { TreeData, TreeViewData } from "./data";
import { Badge, Flex, Separator } from "@radix-ui/themes";

const TreeView = ({
  name,
  data,
  leftMargin,
  routeKey = "root",
}: {
  name?: string;
  data: TreeData;
  leftMargin?: number;
  routeKey?: string;
}) => {
  // const visible = useIsOpenState((state) => state.isOpen[routeKey]);
  // const toggleOpen = useIsOpenState((state) => state.toggleOpen);
  // const snap = useSnapshot(state);

  const isVisible = useIsOpenStore((state) => state.isOpen[routeKey]);
  const toggleVisibleBase = useIsOpenStore((state) => state.toggleOpen);
  const toggleVisible = () => toggleVisibleBase(routeKey);

  // const [visible, setVisible] = useState(false);

  // const isVisible = snap.isOpen[routeKey];
  // const toggleVisible = () =>
  //   (state.isOpen[routeKey] = !state.isOpen[routeKey]);

  // const isVisible = visible;
  // const toggleVisible = () => toggleOpen(routeKey);

  // const isVisible = visible;
  // const toggleVisible = () => setVisible((v) => !v);

  // const isVisible = isOpenMap[routeKey];
  // const toggleVisible = () => $isOpenMap.setKey(routeKey, !isOpenMap[routeKey]);

  console.log(routeKey, isVisible);

  const children =
    data.__trpc_board_type === "router"
      ? data.children?.map((child) => {
          const childKey = routeKey + "." + child.name;
          return (
            <TreeView
              name={child.name}
              key={childKey}
              data={child.treeData}
              leftMargin={(leftMargin ?? -30) + 30}
              routeKey={childKey}
            />
          );
        })
      : null;

  if (data.__trpc_board_type === "router" && data.isRoot) {
    return children;
  }
  const [animateParent] = useAutoAnimate({ duration: 100 });

  const isRouter = data.__trpc_board_type === "router";

  const badge = React.useMemo(() => {
    if (data.__trpc_board_type === "router") {
      return { label: "Router", color: "sky" } as const;
    } else if (data.procedureType === "query") {
      return { label: "Query", color: "green" } as const;
    } else {
      return { label: "Mutation", color: "crimson" } as const;
    }
  }, []);

  return (
    <div className="w-full flex flex-col">
      <div ref={animateParent}>
        {/* <div> */}
        <div
          style={{ paddingLeft: leftMargin }}
          className={`w-full flex flex-row h-8 items-center ${
            true ? "cursor-pointer" : ""
          }`}
          onClick={true ? () => toggleVisible() : undefined}
        >
          <Flex direction={"row"} width={"100%"}>
            <Badge color={badge.color} mr={"2"}>
              {badge.label}
            </Badge>
            {name}

            {data.__trpc_board_type !== "router" && isVisible && (
              <Badge color="gray" ml="auto">
                open
              </Badge>
            )}
          </Flex>
          <div className="ml-auto">
            {isRouter ? (
              <ChevronDownIcon className={`${isVisible ? "rotate-180" : ""}`} />
            ) : // <span>{"<"}</span>

            null}
          </div>
        </div>
        <Separator size={"4"} />
        {isVisible && (
          <>
            <div className="w-full max-w-full flex flex-col">{children}</div>
          </>
        )}
      </div>
    </div>
  );
};

export default TreeView;
