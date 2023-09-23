import {
  CaretDownIcon,
  ChevronDownIcon,
  Cross1Icon,
} from "@radix-ui/react-icons";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Code,
  Container,
  DropdownMenu,
  Flex,
  ScrollArea,
  Select,
  Separator,
  Text,
  TextField,
} from "@radix-ui/themes";
import React, { useContext, useEffect, useRef, useState } from "react";

import {
  InputAdornment,
  TextField as TextFieldMui,
  IconButton,
  FormControl,
  FormLabel,
  FormGroup,
  Card as CardMui,
  Paper,
  CardContent,
  Button as ButtonMui,
} from "@mui/material";

import NotchedOutline from "@mui/material/OutlinedInput/NotchedOutline";

import ClearIcon from "@mui/icons-material/Clear";

import { treeData, type TreeData, type ParsedType } from "./data";

import { useIsOpenStore } from "../stores";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { create, createStore, useStore } from "zustand";
import { combine } from "zustand/middleware";
import { useStoreWithEqualityFn } from "zustand/traditional";

//deep equal two objects
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (!a || !b || (typeof a !== "object" && typeof b !== "object")) {
    return a === b;
  }

  if (a.prototype !== b.prototype) return false;

  let keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;

  return keys.every((k) => deepEqual(a[k], b[k]));
}

const createInputStore = () => {
  type inputMapEntry = {
    key: string;
    value: unknown;
  };
  return createStore(
    combine(
      {
        inputMap: {} as Record<string, inputMapEntry>,
      },
      (set) => ({
        setInput: (key: string, value: inputMapEntry) => {
          set((state) => {
            return {
              inputMap: {
                ...state.inputMap,
                [key]: value,
              },
            };
          });
        },
        deleteInput: (key: string) => {
          set((state) => {
            let newState = { ...state };
            delete newState.inputMap[key];
            return newState;
          });
        },
      })
    )
  );
};

type InputStore = ReturnType<typeof createInputStore>;
type InputState = ReturnType<InputStore["getState"]>;

const InputContext = React.createContext<InputStore | null>(null);

export const InputContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const storeRef = useRef<InputStore>();
  if (!storeRef.current) {
    storeRef.current = createInputStore();
  }

  return (
    <InputContext.Provider value={storeRef.current}>
      {children}
    </InputContext.Provider>
  );
};

function useInputContext<T>(selector: (state: InputState) => T): T {
  const store = useContext(InputContext);
  if (!store) throw new Error("Missing BearContext.Provider in the tree");
  return useStoreWithEqualityFn(store, selector, (a, b) => {
    if (a !== b) console.log("compare", a, b, a === b);
    return a === b;
  });
}

// const UNSET = Symbol("UNSET");

export const Input = React.memo(
  ({
    inputType,
    root = true,
    label,
    inputMapKey = "",
    jsonKey = "",
  }: {
    inputType: ParsedType;
    root?: boolean;
    label?: React.ReactNode;
    inputMapKey?: string;
    jsonKey?: string;
  }) => {
    console.log("render", jsonKey);
    // const [value, setValue] = useState<unknown>(UNSET);

    const v = useInputContext((state) => state.inputMap[inputMapKey]);
    const deleteVRaw = useInputContext((state) => state.deleteInput);
    const setVRaw = useInputContext((state) => state.setInput);

    const deleteV = () => deleteVRaw(inputMapKey);
    const setV = (value: Parameters<typeof setVRaw>[1]) =>
      setVRaw(inputMapKey, value);

    let fieldLabel: React.ReactNode;
    let defaultValue: unknown;

    function simpleFieldLabel(labelText: React.ReactNode, typeString: string) {
      return (
        <Flex direction={"row"} align={"center"} gap={"1"}>
          {labelText}
          <Code>
            <Flex direction={"row"} align={"center"} gap={"1"}>
              {typeString}
            </Flex>
          </Code>
        </Flex>
      );
    }

    if (Math.random() > 0.5) {
      fieldLabel = (
        <DropdownMenu.Root>
          <Flex direction={"row"} align={"center"} gap={"1"}>
            {label}
            {/* <TextField.Input size={"1"} variant="soft"></TextField.Input> */}
            <DropdownMenu.Trigger>
              <Code
                onClick={(e) => {
                  e.preventDefault();
                }}
                className="hover:opacity-70 active:opacity-90 cursor-pointer"
              >
                <Flex direction={"row"} align={"center"} gap={"1"}>
                  <b>string</b> | ...
                  <ChevronDownIcon />
                </Flex>
              </Code>
            </DropdownMenu.Trigger>
          </Flex>
          <DropdownMenu.Content>
            <DropdownMenu.Item>string</DropdownMenu.Item>
            <DropdownMenu.Item>{`object: {type: "friend"}`}</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      );
    } else {
      fieldLabel = simpleFieldLabel(label, "string");
    }

    let fieldType:
      | {
          type: "string";
          optionalType?: "null" | "undefined";
        }
      | {
          type: "number";
          optionalType?: "null" | "undefined";
        }
      | {
          type: "boolean";
          optionalType?: "null" | "undefined";
        }
      | {
          type: "rootObject";
          properties: Record<string, ParsedType>;
        }
      | {
          type: "object";
          properties: Record<string, ParsedType>;
        }
      | {
          type: "enum";
          options: (string | undefined | null)[];
        };

    if (inputType.type === "object") {
      defaultValue = {};
      fieldType = {
        type: root ? "rootObject" : "object",
        properties: inputType.properties,
      };
      fieldLabel = simpleFieldLabel(label, "object");
    } else if (inputType.type === "string") {
      defaultValue = "";
      fieldType = {
        type: "string",
      };
      fieldLabel = simpleFieldLabel(label, "string");
    } else if (inputType.type === "number") {
      defaultValue = 0;
      fieldType = {
        type: "number",
      };
      fieldLabel = simpleFieldLabel(label, "number");
    } else if (inputType.type === "boolean") {
      defaultValue = false;
      fieldType = {
        type: "boolean",
      };
      fieldLabel = simpleFieldLabel(label, "boolean");
    } else if (inputType.type === "union") {
      const nullishOption = inputType.options.find(
        (v) => v.type === "undefined" || v.type === "null"
      )?.type as "undefined" | "null" | undefined;
      const textFieldType = inputType.options.find((v) =>
        ["string", "number", "boolean"].includes(v.type)
      )?.type as "string" | "number" | "boolean" | undefined;

      const optionalTextField =
        inputType.type === "union" &&
        inputType.options.length === 2 &&
        textFieldType &&
        nullishOption
          ? {
              textFieldType,
              nullishOption,
            }
          : undefined;

      if (optionalTextField) {
        defaultValue = nullishOption === "null" ? null : undefined;
        fieldType = {
          type: optionalTextField.textFieldType,
          optionalType: optionalTextField.nullishOption,
        };
        fieldLabel = simpleFieldLabel(
          label,
          `${optionalTextField.textFieldType} | ${optionalTextField.nullishOption}`
        );
      } else if (
        inputType.options.every(
          (v) =>
            v.type === "null" ||
            v.type === "undefined" ||
            (v.type === "literal" && v.literalType === "string")
        )
      ) {
        const hasNull = inputType.options.some((v) => v.type === "null");
        const hasUndefined = inputType.options.some(
          (v) => v.type === "undefined"
        );
        let options: (string | null | undefined)[] = inputType.options.flatMap(
          (v) =>
            v.type === "literal" && v.literalType === "string"
              ? [v.literalValue]
              : []
        );
        if (hasNull) {
          options.unshift(null);
        }
        if (hasUndefined) {
          options.unshift(undefined);
        }
        defaultValue = options[0];
        fieldType = {
          type: "enum",
          options: inputType.options.map(
            (v) =>
              (v.type === "literal" &&
                v.literalType === "string" &&
                v.literalValue) as string
          ),
        };
        fieldLabel = simpleFieldLabel(label, "enum");
      } else {
        throw new Error("Union unimplemented");
        // fieldType = {
        //   type: "string",
        //   optionalType: "undefined",
        // };
        // fieldLabel = simpleFieldLabel(label, "unknown");
      }
    } else {
      throw new Error("Unknown type: " + inputType.type);
    }

    useEffect(() => {
      setV({
        key: jsonKey,
        value: defaultValue,
      });
      return () => deleteV();
    }, []);

    const vWithDefault = v || { key: jsonKey, value: defaultValue };

    const value = vWithDefault.value;
    const setValue = (value: unknown) => {
      setV({
        key: jsonKey,
        value,
      });
    };

    if (fieldType.type === "rootObject") {
      return (
        <Flex direction={"column"} gap={"1"}>
          {Object.entries(fieldType.properties).map(([propKey, value]) => {
            const newKey = inputMapKey + propKey;
            const newJsonKey = jsonKey + "." + propKey;
            return (
              <Input
                inputType={value}
                label={propKey}
                key={newKey}
                inputMapKey={newKey}
                jsonKey={newJsonKey}
                root={false}
              ></Input>
            );
          })}
        </Flex>
      );
    } else if (fieldType.type === "object") {
      return (
        <Paper
          variant="outlined"
          component="fieldset"
          color="transparent"
          style={{ padding: "12px" }}
        >
          <legend style={{}}>{fieldLabel}</legend>
          {/* <CardContent> */}
          <Flex direction={"column"} gap={"1"}>
            {Object.entries(fieldType.properties).map(([propKey, value]) => {
              const newKey = inputMapKey + propKey;
              const newJsonKey = jsonKey + "." + propKey;
              return (
                <Input
                  inputType={value}
                  label={propKey}
                  key={newKey}
                  inputMapKey={newKey}
                  jsonKey={newJsonKey}
                  root={false}
                ></Input>
              );
            })}
          </Flex>
          {/* </CardContent> */}
        </Paper>
      );
    } else if (fieldType.type === "string") {
      const optionalTypeValue =
        fieldType.optionalType === "null" ? null : undefined;
      return (
        <TextFieldMui
          label={
            <Flex direction={"row"} align={"center"} gap={"1"}>
              {fieldLabel}
              {!fieldType.optionalType && value === "" ? '= ""' : ""}
              {fieldType.optionalType && value === optionalTypeValue
                ? "= " + fieldType.optionalType
                : ""}
            </Flex>
          }
          placeholder={
            fieldType.optionalType && value === "" ? '= ""' : undefined
          }
          value={value || ""}
          onChange={(e) => setValue(e.target.value)}
          InputLabelProps={{
            style: {
              pointerEvents: "auto",
            },
          }}
          InputProps={{
            startAdornment:
              fieldType.optionalType && value !== optionalTypeValue ? (
                <InputAdornment position="start">
                  <IconButton
                    sx={{ marginLeft: -1 }}
                    onClick={() => setValue(optionalTypeValue)}
                  >
                    <Cross1Icon />
                  </IconButton>
                </InputAdornment>
              ) : // </>
              undefined,
          }}
          size="small"
          fullWidth
          variant="outlined"
        />
      );
    } else if (fieldType.type === "boolean") {
      const optionalTypeValue =
        fieldType.optionalType === "null" ? null : undefined;
      return (
        <Paper
          variant="outlined"
          component="fieldset"
          color="transparent"
          style={{ padding: "6px 12px" }}
        >
          <Flex direction={"row"} gap={"1"} align={"center"}>
            {fieldLabel}

            <Checkbox
              onCheckedChange={(checked) => setValue(!!checked)}
              checked={!!value}
            />
            <Text ml={"1"} color="gray">
              {" "}
              ={" "}
              {value === optionalTypeValue
                ? fieldType.optionalType
                : value
                ? "true"
                : "false"}
              {fieldType.optionalType && value !== optionalTypeValue ? (
                <IconButton
                  size="small"
                  onClick={() => setValue(optionalTypeValue)}
                >
                  <Cross1Icon />
                </IconButton>
              ) : null}
            </Text>
          </Flex>
        </Paper>
      );
    } else if (fieldType.type === "enum") {
      const UNKNOWN = "TRPCBOARD_UNKNOWN_____";
      const NULL = "TRPCBOARD_NULL_____";

      function optionToString(option: string | null | undefined) {
        if (option === null) {
          return NULL;
        } else if (option === undefined) {
          return UNKNOWN;
        } else {
          return option;
        }
      }

      function stringToOption(str: string) {
        if (str === NULL) {
          return null;
        } else if (str === UNKNOWN) {
          return undefined;
        } else {
          return str;
        }
      }

      return (
        <Paper
          variant="outlined"
          component="fieldset"
          color="transparent"
          style={{ padding: "6px 12px" }}
        >
          <Flex direction={"row"} gap={"1"} align={"center"}>
            {fieldLabel}

            <Select.Root
              defaultValue={optionToString(fieldType.options[0])}
              value={optionToString(value as string | null | undefined)}
              onValueChange={(newValue) => setValue(stringToOption(newValue))}
            >
              <Select.Trigger />
              <Select.Content>
                {fieldType.options.map((option) => {
                  let itemLabel: string;
                  if (typeof option === "string") {
                    itemLabel = '"' + option + '"';
                  } else if (option === null) {
                    itemLabel = "null";
                  } else {
                    itemLabel = "undefined";
                  }

                  return (
                    <Select.Item key={itemLabel} value={itemLabel}>
                      {itemLabel}
                    </Select.Item>
                  );
                })}
              </Select.Content>
            </Select.Root>
          </Flex>
        </Paper>
      );
    }

    return null;
  },
  (prevProps, nextProps) => {
    const isEqual = deepEqual(prevProps, nextProps);

    if (!isEqual) console.log("not equal", prevProps, nextProps);

    return isEqual;
  }
);

export const Procedure = ({}) => {
  let inputStore = useRef<InputStore>();
  if (!inputStore.current) {
    inputStore.current = createInputStore();
  }

  const [combinedInput, setCombinedInput] = useState<string>("");

  useEffect(() => {
    const listener = inputStore.current?.subscribe((state) => {
      let entries = Object.entries(state.inputMap);
      entries.sort((a, b) => a[1].key.localeCompare(b[1].key));
      let combined = entries
        .map(([key, value]) => {
          return value.key + ":" + JSON.stringify(value.value);
        })
        .join("\n");
      setCombinedInput(combined);
    });
  }, []);

  return (
    <InputContext.Provider value={inputStore.current}>
      <Input
        inputMapKey="root"
        jsonKey="root"
        inputType={{
          type: "object",
          properties: {
            testUnion: {
              type: "union",
              options: [{ type: "string" }, { type: "undefined" }],
            },
            testObject: {
              type: "object",
              properties: {
                a: {
                  type: "string",
                },
                b: {
                  type: "boolean",
                },
                testOptionalBoolean: {
                  type: "union",
                  options: [
                    {
                      type: "boolean",
                    },
                    {
                      type: "undefined",
                    },
                  ],
                },
                testEnum: {
                  type: "union",
                  options: [
                    {
                      type: "literal",
                      literalType: "string",
                      literalValue: "a",
                    },
                    {
                      type: "literal",
                      literalType: "string",
                      literalValue: "b",
                    },
                  ],
                },
              },
            },
          },
        }}
      />
      <div className="whitespace-pre">{combinedInput}</div>
    </InputContext.Provider>
  );
};

export const Frame = ({
  name,
  data,
  routeKey = "root",
}: {
  name: string;
  data: TreeData;
  routeKey?: string;
}) => {
  const isVisible = useIsOpenStore((state) => state.isOpen[routeKey]);
  const toggleVisibleBase = useIsOpenStore((state) => state.toggleOpen);
  const toggleVisible = () => toggleVisibleBase(routeKey);

  const children =
    data.__trpc_board_type === "router"
      ? data.children?.map((child) => {
          const childKey = routeKey + "." + child.name;
          return (
            <Frame
              name={child.name}
              key={childKey}
              data={child.treeData}
              routeKey={childKey}
            />
          );
        })
      : [<Procedure key="procedure" />];

  if (data.__trpc_board_type === "router" && data.isRoot) {
    return children;
  }

  const badge = React.useMemo(() => {
    if (data.__trpc_board_type === "router") {
      return { label: "Router", color: "sky" } as const;
    } else if (data.procedureType === "query") {
      return { label: "Query", color: "green" } as const;
    } else {
      return { label: "Mutation", color: "crimson" } as const;
    }
  }, []);

  const [animateParent] = useAutoAnimate({ duration: 100 });

  return (
    <Card mb={"2"} size={"1"}>
      <Flex gap="0" direction={"column"} align={"stretch"} ref={animateParent}>
        <Flex
          gap="3"
          align="center"
          className="cursor-pointer"
          onClick={toggleVisible}
        >
          <Badge color={badge.color}>{badge.label}</Badge>
          <Box>
            <Text as="div" size="2" weight="bold">
              {name}
            </Text>
            <Text as="div" size="2" color="gray">
              {children?.length ? `${children.length} children` : null}
            </Text>
          </Box>
          <ChevronDownIcon
            className={`ml-auto w-6 h-6 ${isVisible ? "rotate-180" : ""}`}
          />
        </Flex>
        {isVisible ? (
          <>
            <Separator my={"4"} size={"4"} mb={"3"} />
            {children}
          </>
        ) : null}
      </Flex>
    </Card>
  );
};

export default () => {
  return (
    <ScrollArea type="always" scrollbars="vertical" className="h-screen">
      <Container m={"2"}>
        <Flex direction={"column"} align={"stretch"}>
          <Frame name="" data={treeData} />
        </Flex>
      </Container>
    </ScrollArea>
  );
};
