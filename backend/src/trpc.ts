import {
  AnyProcedure,
  AnyRouter,
  inferProcedureInput,
  initTRPC,
} from "@trpc/server";
import { inferTransformedProcedureOutput } from "@trpc/server/shared";
import superjson from "superjson";

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.create({ transformer: superjson });

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;

type TestInput = {
  union: string | number;
  date: Date;
  string: string;
  number: number;
  boolean: boolean;
  array: string[];
  object: {
    string: string;
    nested: {
      string: string;
      number: number;
    };
    arrayOfObjects: {
      string: string;
      number: number;
    }[];
  };
};

// type Describe<T> = T extends {[key: string]: infer U} ? U : never;

type IsUnion<T> = (
  [T, never] extends [infer U, never]
    ? U extends unknown
      ? [T, keyof U] extends [U | boolean, keyof T]
        ? false
        : true
      : never
    : never
) extends false
  ? false
  : true;

// type Describe<T> = IsUnion<T> extends true
//   ? {
//       type: "union";
//       options: {
//         [K in T]: Describe<K>;
//       };
//     }
//   : T extends Date
//   ? {
//       type: "date";
//     }
//   : T extends string
//   ? {
//       type: "string";
//     }
//   : T extends number
//   ? {
//       type: "number";
//     }
//   : T extends boolean
//   ? {
//       type: "boolean";
//     }
//   : T extends Array<infer U>
//   ? {
//       type: "array";
//       items: Describe<U>;
//     }
//   : T extends object
//   ? {
//       type: "object";
//       properties: {
//         [K in keyof T]: Describe<T[K]>;
//       };
//     }
//   : T;

// type Test = Describe<TestInput>;

export type PrepareRouter<TRouter extends AnyRouter> = {
  [TKey in keyof TRouter["_def"]["record"]]: TRouter["_def"]["record"][TKey] extends infer TRouterOrProcedure
    ? TRouterOrProcedure extends AnyRouter
      ? PrepareRouter<TRouterOrProcedure>
      : TRouterOrProcedure extends AnyProcedure
      ? {
          __trpc_board_procedure: true;
          procedureType: TRouterOrProcedure["_type"];
          input: inferProcedureInput<TRouterOrProcedure>;
          output: inferTransformedProcedureOutput<TRouterOrProcedure>;
        }
      : never
    : never;
};
