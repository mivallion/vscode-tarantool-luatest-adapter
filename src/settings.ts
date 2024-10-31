import * as vscode from "vscode";

function substitutePath(s: string): string {
  const workspaceFolder = (vscode.workspace.workspaceFolders || [])[0]?.uri?.fsPath;
  if (!workspaceFolder) return s;
  return s
    .replace(/\${workspaceRoot}/g, workspaceFolder)
    .replace(/\${workspaceFolder}/g, workspaceFolder);
}

export function getLuaTestExe(): string {
  return substitutePath(getOrDefault("luaTestExe", ".rocks/bin/luatest"));
}

export function getLuatestDir(): string {
  return substitutePath(getOrDefault("luatestDir", "${workspaceRoot}/.rocks/share/tarantool/luatest"));
}

export function getTestGlob(): string {
  return getOrDefault("testGlob", "**/*[tT]est*.{lua}");
}

export function getTestRegex(): RegExp {
  const text = getOrDefault("testRegex", "");
  if (text !== "") return new RegExp(text, "gm");
  return /^(?<group_var>[a-zA-Z_]*)\.(?<test>[tT]est[a-zA-Z0-9_]*)\s*=\s*function\s*(?:[a-zA-Z][a-zA-Z0-9]*:)?\s*\([a-zA-Z_,.]*\)(?:.*)$/gm;
}

export function getTestGroupRegex(): RegExp {
  const text = getOrDefault("testGroupRegex", "");
  if (text !== "") return new RegExp(text, "gm");
  return /^local (?<group_var>[a-zA-Z][a-zA-Z*_]*)\s*=\s*[a-zA-Z]*.group\(['"](?<group_name>[a-z-A-Z_0-9.]*)['"]/gm;
}

export function getTestEncoding(): "ascii" | "utf8" | "utf-8" | "utf16le" | "ucs2" | "ucs-2" | "base64" | "latin1" | "binary" | "hex" | null | undefined {
  return getOrDefault("testEncoding", "utf8") as "ascii" | "utf8" | "utf-8" | "utf16le" | "ucs2" | "ucs-2" | "base64" | "latin1" | "binary" | "hex" | null | undefined;
}

export function getDecorationRegex(): RegExp {
  const text = getOrDefault("decorationRegex", "");
  if (text !== "") return new RegExp(text, "gs");
  return /\.lua:(?<line>[1-9][0-9]*):(?<message>.*)stack traceback:/gs;
}

function getOrDefault(section: string, fallback: string) {
  const config = vscode.workspace.getConfiguration("tarantoolLuatestAdapter");
  const value = config.get<string>(section);
  if (!value || value === "") return fallback;
  return value;
}
