import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { router, publicProcedure, PrepareRouter } from "./trpc";
import { AnyRouter, inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import * as z from "zod";

/**
 * testcomment
 */
const add = publicProcedure
  .input(
    z.object({
      /** date type wooss
       *  sdf sdfsdf sdfsdf
       * @dfg
       * sdfsdf ssddddddd
       */
      weirdDate: z.object({
        hello: z.number(),
      }),
      optionalDate: z.date().optional(),
      record: z.record(z.number()),
    })
  )
  .mutation((opts) => {
    opts.input.weirdDate;

    return { c: { a: 5 } } as {
      [key: `A${string}A`]: { [key: string]: true };
    };
  });

const appRouter = router({
  greeting: publicProcedure.query(() => ({
    a: new Date(),
    r: {} as Record<string, number>,
  })),
  add,
  /**
   * helloboi
   */
  r: router({
    nested: publicProcedure
      .input(function (a: unknown) {
        return { b: 5 } as const;
      })
      .query((opts) => ({ a: 5 } as { a: number } | { d: string })),
  }),
  type: publicProcedure.query(() => {
    return hey();
  }),
});

const hey: () => string = () => JSON.stringify(a<typeof appRouter>());

const server = createHTTPServer({
  router: appRouter,
});

export type AppRouter = typeof appRouter;

type ExpandRecursively<T> = T extends Date
  ? T
  : T extends Function
  ? T
  : T extends object
  ? T extends infer O
    ? { [K in keyof O]: ExpandRecursively<O[K]> }
    : never
  : T;

const UserSchema = z.object({
  /** Full name ooo */
  name: z.string(),
});

type User = z.TypeOf<typeof UserSchema>;

const u = UserSchema.parse({ name: "London" });

type B = typeof u;

let bb: B;

export type AppRouterInputs = inferRouterInputs<AppRouter>;

function a<T>() {}

type Final = ExpandRecursively<PrepareRouter<AppRouter>>;

console.dir(a<PrepareRouter<AppRouter>>(), {
  depth: 15,
  colors: true,
});

server.listen(5000);

type A = {
  [key: `A${string}A`]: string;
  [key: `B${string}B`]: number;
};

const b: A = {} as any as A;
