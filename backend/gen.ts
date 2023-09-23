import { Project } from "ts-morph";

const project = new Project({
  tsConfigFilePath: "./tsconfig.json",
});

const sourceFile = project.getSourceFileOrThrow("src/index.ts");

console.log(
  sourceFile
    .getTypeAliasOrThrow("AppRouterOutputs")
    .getType()
    .getProperties()
    .map((p) => p.getMembers().map((m) => m.getName()))
);
