import * as vscode from "vscode";
import * as path from "path";
import * as settings from "./settings";
import * as child_process from "child_process";
import * as fs from "fs";
import * as util from "util";
import { JSONPlugin } from "./plugins/json";
import { TestSuiteInfo, TestInfo, TestRunStartedEvent, TestRunFinishedEvent, TestSuiteEvent, TestEvent, TestDecoration } from "vscode-test-adapter-api";
import { error } from "console";

const luaUnitSuite: TestSuiteInfo = {
	type: "suite",
	id: "root",
	label: "luatest",
	children: []
};

type TGroupInfo = {
	name: string;
	suite: TestSuiteInfo;
}

type TGroups = {
	[dict_key: string]: TGroupInfo;
}

type TTests = {
	[dict_key: string]: TestInfo
}

type TGroupsSuits = {
	[dict_key: string]: TTests;
}

type TLineNumberMatch = {
	line: string;
	number: number;
	match: RegExpMatchArray | null;
}

let groupsSuits: TGroupsSuits = {};

function debugLog(...args: any[]) {
	if (settings.getDebug()) {
		console.log(...args);
	}
}

export function lineNo(str: string, re: RegExp) {
	return str.split(/\r?\n/).map(function (line: string, i: number): TLineNumberMatch | undefined {
		if (re.test(line)) {
			const match = re.exec(line)
			return {
				line: line,
				number: i + 1,
				match: match,
			}
		}
		return undefined;
	}).filter(Boolean);
}

export async function loadPlugins(): Promise<void> {
	debugLog("Loading plugins");
	const writeFile = util.promisify(fs.writeFile);
	const luatestDir = settings.getLuatestDir();
	debugLog("Loading json output plugin into", luatestDir);
	await writeFile(luatestDir + "/output/json.lua", JSONPlugin, { flag: "w+" });
	debugLog("Plugins were loaded successfully");
}

function listTestCases(pattern: string): Array<string> {
	const luaTestExe = settings.getLuaTestExe();

	let commandToRun = luaTestExe

	commandToRun = commandToRun + ' --list-test-cases -p ' + pattern + ' || exit 0'
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		let err = "Failed to find test files workspaceFolders"
		console.error(err);
		error(err);
		return [];
	}
	const workspaceFolder = workspaceFolders[0];
	if (!workspaceFolder) {
		let err = "Failed to find test files workspaceFolder";
		console.error(err);
		error(err);
		return [];
	}
	debugLog("exec: ", commandToRun, workspaceFolder.uri.fsPath);
	let stdout: string = "";
	let stderr: string = "";
	try {
		stdout = child_process.execSync(commandToRun, {
			cwd: workspaceFolder.uri.fsPath,
		}).toString();
	} catch (err) {
		if (err instanceof Error) {
			stderr = err.message;
			error(stderr);
			return [];
		}
	}


	const testCases = stdout.split('\n');
	if (testCases) {
		testCases.shift();
		testCases.pop();
		return testCases;
	}
	return [];
}

export async function loadTests(): Promise<TestSuiteInfo> {
	debugLog("Loading tests from test files");

	luaUnitSuite.children = [];

	if (!vscode.workspace) {
		console.error("Failed to find workspace");
		return luaUnitSuite;
	}

	if (!vscode.workspace.workspaceFolders) {
		console.error("Failed to find workspaceFolders");
		return luaUnitSuite;
	}

	const testGlob = settings.getTestGlob();
	const files = await vscode.workspace.findFiles(testGlob);

	debugLog("Found test files", testGlob, files.length);

	const testRegex = settings.getTestRegex();
	const testGroupRegex = settings.getTestGroupRegex();
	const testEncoding = settings.getTestEncoding();
	const readFile = util.promisify(fs.readFile);

	let testId = 1;
	let groupId = 1;
	for (const file of files) {

		debugLog("Found test file", file.fsPath);

		const workspaceFolder = vscode.workspace.getWorkspaceFolder(file);
		if (!workspaceFolder) {
			console.error("Failed to find workspaceFolder");
			continue;
		}
		const suiteId = path.relative(workspaceFolder.uri.fsPath, file.fsPath)

		const testSuite: TestSuiteInfo = {
			type: "suite",
			id: suiteId,
			label: suiteId,
			children: []
		};


		const content = await readFile(file.fsPath, {
			encoding: testEncoding
		}) as string;
		const groups: TGroups = {};
		const foundGroups: Map<string, string> = new Map<string, string>();

		// find all groups in file
		let groupsMatch: RegExpExecArray | null;
		do {
			groupsMatch = testGroupRegex.exec(content);
			if (!groupsMatch) {
				debugLog("Groups not found");
			}
			if (groupsMatch && groupsMatch.groups && groupsMatch.groups["groupVar"] && groupsMatch.groups["groupName"]) {
				foundGroups.set(groupsMatch.groups["groupVar"], groupsMatch.groups["groupName"]);
				debugLog("Found group", file.fsPath, groupsMatch.groups["groupVar"], groupsMatch.groups["groupName"]);
			}
			groupId += 1;
		} while (groupsMatch);

		// find all tests in file
		let suiteIsEmpty = true;
		let match: RegExpMatchArray | null;
		content.split(/\r?\n/).map(function (line: string, i: number) {
			match = testRegex.exec(line)
			if (match && match.groups && match.groups["test"]) {
				const groupVar = match.groups["groupVar"];
				const testName = match.groups["test"];
				if (groupVar) {
					const groupName = foundGroups.get(groupVar);
					if (!groupName) {
						error("Group not found for test", testId.toString());
						return;
					}
					debugLog("Found group for test", file.fsPath, groupVar, testId.toString());
					const testCases = listTestCases(groupName + '.*.' + testName);
					for (const testCase of testCases) {
						let parametrizedGroupName = testCase.replace('.' + testName, "");
						let parameters: string = parametrizedGroupName.replace(groupName + '.', "");
						let parametrizedGroupVar = groupVar + "$LUATESTVAR" + parameters;
						if (parameters === groupName) {
							parametrizedGroupVar = groupVar;
							parameters = "";
						}
						const test: TestInfo = {
							type: "test",
							id: testId.toString(),
							label: testCase,
							file: file.fsPath,
							line: i,
							debuggable: false,
						}
						debugLog("Found test", file.fsPath, testCase, testId.toString());
						debugLog(parametrizedGroupName, parametrizedGroupVar, parameters, groupsSuits, groups)
						try {
							if (!groupsSuits[parametrizedGroupName]) {
								groupsSuits[parametrizedGroupName] = {};
								groupsSuits[parametrizedGroupName][test.label] = test;

								const groupSuite: TestSuiteInfo = {
									type: "suite",
									id: "luatestGroup" + groupId,
									label: parametrizedGroupName,
									children: [],
									file: file.fsPath,
								};
								groups[parametrizedGroupVar] = { name: parametrizedGroupName, suite: groupSuite };
								testSuite.children.push(groupSuite);
								groupId += 1;
							}
							groups[parametrizedGroupVar].suite.children.push(test);
							groupsSuits[parametrizedGroupName][test.label] = test;
							testId++;
						} catch (err) {
							error("Error occured while adding test, skipping", testCase)
						}

					}
				}
				suiteIsEmpty = false;
			}
		});

		const testRegexSecond = /^function\s*(?<groupVar>[a-zA-Z_]*)\.(?<test>[tT]est[a-zA-Z0-9_]*)*(?:[a-zA-Z][a-zA-Z0-9]*:)?\s*\([a-zA-Z_,.]*\)(?:.*)$/gm;
		content.split(/\r?\n/).map(function (line: string, i: number) {
			match = testRegexSecond.exec(line)
			if (match && match.groups && match.groups["test"]) {
				debugLog("Found test", file.fsPath, match.groups["test"], testId.toString());

				const groupVar = match.groups["groupVar"];
				const testName = match.groups["test"];
				if (groupVar) {
					const groupName = foundGroups.get(groupVar);
					if (!groupName) {
						error("Group not found for test", testId.toString());
						return;
					}
					debugLog("Found group for test", file.fsPath, groupVar, testId.toString());
					const testCases = listTestCases(groupName + '.*.' + testName);
					for (const testCase of testCases) {
						let parametrizedGroupName = testCase.replace('.' + testName, "");
						let parameters: string = parametrizedGroupName.replace(groupName + '.', "");
						let parametrizedGroupVar = groupVar + parameters;
						if (parameters === groupName) {
							parametrizedGroupVar = groupVar;
							parameters = "";
						}
						const test: TestInfo = {
							type: "test",
							id: testId.toString(),
							label: testCase,
							file: file.fsPath,
							line: i,
							debuggable: false,
						}
						if (!groupsSuits[parametrizedGroupName]) {
							groupsSuits[parametrizedGroupName] = {};
							groupsSuits[parametrizedGroupName][test.label] = test;

							const groupSuite: TestSuiteInfo = {
								type: "suite",
								id: "luatestGroup" + groupId,
								label: parametrizedGroupName,
								children: [],
								file: file.fsPath,
							};
							groups[parametrizedGroupVar] = { name: parametrizedGroupName, suite: groupSuite };
							testSuite.children.push(groupSuite);
							groupId += 1;
						}
						groups[parametrizedGroupVar].suite.children.push(test);
						groupsSuits[parametrizedGroupName][test.label] = test;
						testId++;
					}
				}
				suiteIsEmpty = false;
			}
		});
		if (!suiteIsEmpty) {
			luaUnitSuite.children.push(testSuite);
		} else {
			debugLog("Tests not found");
		}
	}

	return Promise.resolve<TestSuiteInfo>(luaUnitSuite);
}

export async function runTests(
	tests: string[],
	testStatesEmitter: vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>
): Promise<void> {
	let nodes = new Array<TestSuiteInfo | TestInfo>();
	for (const suiteOrTestId of tests) {
		const node = findNode(luaUnitSuite, suiteOrTestId);
		if (node) {
			nodes.push(node);
		}
	}
	await runTestGroups(nodes, testStatesEmitter);
}

export function findNode(searchNode: TestSuiteInfo | TestInfo, id: string): TestSuiteInfo | TestInfo | undefined {
	if (searchNode.id === id) {
		return searchNode;
	} else if (searchNode.type === "suite") {
		for (const child of searchNode.children) {
			const found = findNode(child, id);
			if (found) return found;
		}
	}
	return undefined;
}

async function runTestGroups(
	nodes: Array<TestSuiteInfo | TestInfo>,
	testStatesEmitter: vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>): Promise<void> {
	const luaTestExe = settings.getLuaTestExe();
	let nodesToRun = new Array<TestSuiteInfo | TestInfo>();
	for (const node of nodes) {
		nodesToRun.push(node);
	}

	if (nodesToRun.length == 0) {
		return;
	}

	let commandToRun = luaTestExe
	for (const node of nodesToRun) {
		let nodeSuit = node as TestSuiteInfo;
		if (nodeSuit.children) {
			for (const child of nodeSuit.children) {
				testStatesEmitter.fire(<TestEvent>{ type: "test", test: child.id, state: "running" });
			}
			commandToRun = commandToRun + " '" + nodeSuit.label + "'"
		} else {
			commandToRun = commandToRun + " '" + node.label + "'"
		}
	}
	commandToRun = commandToRun + ' -o json || exit 0'
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		console.error("Failed to find test files workspaceFolders");
		return;
	}
	const workspaceFolder = workspaceFolders[0];
	if (!workspaceFolder) {
		console.error("Failed to find test files workspaceFolder");
		return;
	}
	debugLog("exec: ", commandToRun, workspaceFolder.uri.fsPath);
	let stdout: string = "";
	let stderr: string = "";
	try {
		stdout = child_process.execSync(commandToRun, {
			cwd: workspaceFolder.uri.fsPath,
		}).toString();
	} catch (error) {
		if (error instanceof Error) {
			stderr = error.message;
		}
	}

	let testResults: any;
	try {
		stdout = stdout.split("\n")[1];
		testResults = JSON.parse(stdout);
	} catch (error) {
		console.error("Failed to parse tests results", error);
		return;
	}

	for (const testResult of testResults["tests"]) {
		const testName = testResult["name"];
		const testGroup = testResult["group"];
		const status = testResult["status"];
		const passed = status != "ERROR" && status != "FAIL";
		const state = passed ? "passed" : "failed";
		const test_node = groupsSuits[testGroup][testName];
		const event = <TestEvent>{ type: "test", test: test_node.id, state: state, message: testResult["message"] };
		if (stderr.length > 0) {
			console.error("Failed to execute test files", stderr);
			event.state = "failed";
			event.message = stderr;
		} else if (!passed) {
			const infoRegex = settings.getDecorationRegex();
			const match = infoRegex.exec(testResult["message"]);
			if (match && match.groups && match.groups["line"]) {
				const line = Number(match.groups["line"]);
				if (Number.isSafeInteger(line)) {
					const message = (match.groups["message"] || "").trim();
					event.decorations = [<TestDecoration>{
						line: line,
						message: message,
						hover: testResult["message"]
					}];
				}
			}
		}

		testStatesEmitter.fire(event);
	}
}
