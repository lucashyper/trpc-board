import type from "../../../backend/transformer";
import type { ParsedType, TreeData } from "../../../backend/transformer";

export type { ParsedType, TreeData };

export type TreeViewData = {
  name: string;
  type: "root" | "router" | "query" | "mutation";
  children?: TreeViewData[];
};
export const treeViewData: TreeViewData = {
  name: "",
  type: "root",
  children: [
    {
      name: "webAdmin",
      type: "router",
      children: [
        { name: "getUnis", type: "query" },
        {
          name: "users",
          type: "router",
          children: [
            { name: "getUsers", type: "query" },
            { name: "getUser", type: "query" },
            { name: "createUser", type: "mutation" },
          ],
        },
      ],
    },
    {
      name: "misc",
      type: "router",
      children: [
        { name: "getBrowserId", type: "query" },
        { name: "getServerTime", type: "query" },
      ],
    },
  ],
};

export const treeData: TreeData = {
  __trpc_board_type: "router",
  children: [
    {
      name: "greeting",
      treeData: {
        __trpc_board_type: "procedure",
        procedureType: "query",
        inputType: {
          type: "union",
          options: [{ type: "undefined" }, { type: "object", properties: {} }],
        },
        outputType: {
          type: "object",
          properties: {
            a: { type: "Date" },
            r: {
              type: "index",
              indexType: { type: "string" },
              indexedType: { type: "number" },
            },
          },
        },
        inputTypeString: "void | undefined",
        outputTypeString: "{ a: Date; r: Record<string, number>; }",
      },
    },
    {
      name: "add",
      treeData: {
        __trpc_board_type: "procedure",
        procedureType: "mutation",
        inputType: {
          type: "object",
          properties: {
            weirdDate: {
              type: "object",
              properties: { hello: { type: "number" } },
            },
            record: {
              type: "index",
              indexType: { type: "string" },
              indexedType: { type: "number" },
            },
            optionalDate: {
              type: "union",
              options: [{ type: "undefined" }, { type: "Date" }],
            },
          },
        },
        outputType: {
          type: "index",
          indexType: {
            type: "index",
            indexType: { type: "number" },
            indexedType: { type: "string" },
          },
          indexedType: {
            type: "index",
            indexType: { type: "string" },
            indexedType: {
              type: "literal",
              literalType: "boolean",
              literalValue: true,
            },
          },
        },
        inputTypeString:
          "{ weirdDate: { hello: number; }; record: Record<string, number>; optionalDate?: Date | undefined; }",
        outputTypeString: "{ [key: `A${string}A`]: { [key: string]: true; }; }",
      },
    },
    {
      name: "r",
      treeData: {
        __trpc_board_type: "router",
        children: [
          {
            name: "nested",
            treeData: {
              __trpc_board_type: "procedure",
              procedureType: "query",
              inputType: {
                type: "object",
                properties: {
                  b: {
                    type: "literal",
                    literalType: "number",
                    literalValue: 5,
                  },
                },
              },
              outputType: {
                type: "union",
                options: [
                  {
                    type: "object",
                    properties: { a: { type: "number" } },
                  },
                  {
                    type: "object",
                    properties: { d: { type: "string" } },
                  },
                ],
              },
              inputTypeString: "{ readonly b: 5; }",
              outputTypeString: "{ a: number; } | { d: string; }",
            },
          },
        ],
      },
    },
  ],
  isRoot: true,
};
