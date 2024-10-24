# Tarantool luatest adapter for Visual Studio Code

This is a Tarantool luatest adapter for Test Explorer UI (https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-test-explorer)

## Supported

* Detect luatest tests
* Run luatest tests

## Not supported

* Automatic reloading of test definitions
* Autorun
* Debugging

## Getting Started


1. Install Test Explorer UI
  * https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-test-explorer

2. Install tarantool luatest adapter

3. Run the tests via the Test Explorer UI

## Configuration

| Property | Description |
| --- | --- |
| `tarantoolLuatestAdapter.luaTestExe` | Path to luatest executable. The current workspace folder can be referred to using `${workspaceFolder}`. Defaults to `.rocks/bin/luatest` |
| `tarantoolLuatestAdapter.testGlob` | Glob used to find test files. Defaults to `**/*[tT]est*.{lua}` |
| `tarantoolLuatestAdapter.testRegex` | Regex used to find tests. Defaults to `/^(?<group_var>[a-zA-Z_]*)\.(?<test>[tT]est[a-zA-Z0-9_]*)\s*=\s*function\s*(?:[a-zA-Z][a-zA-Z0-9]*:)?\s*\([a-zA-Z_,.]*\)(?:.*)$/gm` |
| `tarantoolLuatestAdapter.testGroupRegex` | Regex used to find tests groups. Defaults to `/^local (?<group_var>[a-zA-Z][a-zA-Z*_]*)\s*=\s*[a-zA-Z]*.group\(['"](?<group_name>[a-z-A-Z_0-9.]*)['"]/gm` |
| `tarantoolLuatestAdapter.testEncoding` | Test file encoding. Defaults to `utf8` |
| `tarantoolLuatestAdapter.decorationRegex` | Regex used to find line number and failure message. Defaults to `/\.lua:(?<line>[1-9][0-9]*):(?<message>.*)stack traceback:/` |
