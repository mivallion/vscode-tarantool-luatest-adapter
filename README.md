# Tarantool luatest adapter for Visual Studio Code

This is a Tarantool luatest adapter for Test Explorer UI (https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-test-explorer)

## Supported

* Detect luatest tests
* Run luatest tests

## Not supported

* Automatic reloading of test definitions
* Autorun
* Debugging

## Notes
* **IT IS NOT RECOMMENDED TO RUN ALL THE TESTS AT ONCE**
* Test's file name should match `'.*/test/.*_test.lua'`
* Plugin modifies luatest code:
  * **runner.lua**
  * **group.lua**
  * adds file **output/json.lua**
* It's recommend to reinstall luatest after plugin's update

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
| `tarantoolLuatestAdapter.testEncoding` | Test file encoding. Defaults to `utf8` |
| `tarantoolLuatestAdapter.decorationRegex` | Regex used to find line number and failure message. Defaults to `/\.lua:(?<line>[1-9][0-9]*):(?<message>.*)stack traceback:/` |
| `tarantoolLuatestAdapter.debug` | Print debug log. Defaults to `false` |
