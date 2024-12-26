# Tarantool luatest adapter for Visual Studio Code

This is a Tarantool luatest adapter for Test Explorer UI (https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-test-explorer)

## Supported

* Detect luatest tests
* Run luatest tests

[!WARNING]
IT IS NOT RECOMMENDED TO RUN ALL THE TESTS AT ONCE

## Not supported

* Automatic reloading of test definitions
* Autorun
* Debugging

## Getting Started


1. Install Test Explorer UI
  * https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-test-explorer

2. Install tarantool

3. Install luatest rocks

4. Install tarantool luatest adapter

5. Run the tests via the Test Explorer UI

## Configuration

| Property | Description |
| --- | --- |
| `tarantoolLuatestAdapter.luaTestExe` | Path to luatest executable. The current workspace folder can be referred to using `${workspaceFolder}`. Defaults to `.rocks/bin/luatest` |
| `tarantoolLuatestAdapter.testGlob` | Glob used to find test files. Defaults to `**/*[tT]est*.{lua}` |
| `tarantoolLuatestAdapter.testRegex` | Regex used to find tests. Defaults to `/^(?<groupVar>[a-zA-Z][a-zA-Z*_0-9]*)\.(?<test>[tT]est[a-zA-Z0-9_]*)\s*=\s*function\s*(?:[a-zA-Z][a-zA-Z0-9]*:)?\s*\([a-zA-Z_,.]*\)(?:.*)$/gm` |
| `tarantoolLuatestAdapter.testGroupRegex` | Regex used to find tests groups. Defaults to `/^local (?<groupVar>[a-zA-Z][a-zA-Z*_0-9]*)\s*=\s*[a-zA-Z]*.group\(['"](?<groupName>[a-z-A-Z_0-9.]*)['"]/gm` |
| `tarantoolLuatestAdapter.testEncoding` | Test file encoding. Defaults to `utf8` |
| `tarantoolLuatestAdapter.decorationRegex` | Regex used to find line number and failure message. Defaults to `/\.lua:(?<line>[1-9][0-9]*):(?<message>.*)stack traceback:/` |
| `tarantoolLuatestAdapter.debug` | Print debug log. Defaults to `false` |

## Known bugs
A bug occurs when the name of one group is a prefix of another group.