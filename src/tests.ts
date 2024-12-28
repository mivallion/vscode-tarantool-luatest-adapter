import * as vscode from "vscode";
import * as path from "path";
import * as settings from "./settings";
import * as child_process from "child_process";
import * as fs from "fs";
import * as util from "util";
import { JSONPlugin, JSONList, JSONListBefore, JSONListFlag, JSONListFlagBefore, GroupFileAfter, GroupFileBefore } from "./plugins/json";
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

type TFiles = {
	[dict_key: string]: TestSuiteInfo;
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

type TTestData = {
	name: string;
	group: string;
	methodName: string;
	line: number;
	file: string | any;
}

const groupsSuits: TGroupsSuits = {};

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
	const readFile = util.promisify(fs.readFile);
	const writeFile = util.promisify(fs.writeFile);
	const luatestDir = settings.getLuatestDir();
	debugLog("Loading json output plugin into", luatestDir);
	await writeFile(luatestDir + "/output/json.lua", JSONPlugin, { flag: "w+" });
	try {
        const data = (await readFile(luatestDir + "/runner.lua", settings.getTestEncoding())).toString();

        let result = data.replace(JSONListFlagBefore, JSONListFlag);
        result = result.replace(JSONListBefore, JSONList);

        await writeFile(luatestDir + "/runner.lua", result, settings.getTestEncoding());

        debugLog('runner.lua was updated successfully');
    } catch (err) {
        console.error(`Error: ${err}`);
    }
	try {
        const data = (await readFile(luatestDir + "/group.lua", settings.getTestEncoding())).toString();

        const result = data.replace(GroupFileBefore, GroupFileAfter);

        await writeFile(luatestDir + "/group.lua", result, settings.getTestEncoding());

        debugLog('group.lua was updated successfully');
    } catch (err) {
        console.error(`Error: ${err}`);
    }
	debugLog("Plugins were loaded successfully");
}

function listTestCasesJSON(): Array<TTestData> {
	const luaTestExe = settings.getLuaTestExe();

	let commandToRun = luaTestExe

	commandToRun = commandToRun + ' --list-test-cases-json' + ' || exit 0'
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		const err = "Failed to find test files workspaceFolders"
		console.error(err);
		error(err);
		return [];
	}
	const workspaceFolder = workspaceFolders[0];
	if (!workspaceFolder) {
		const err = "Failed to find test files workspaceFolder";
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

	const i = stdout.indexOf('\n');
	const jsonData = stdout.slice(i + 1);
	
	const jsonParsed = JSON.parse(jsonData);
	const groupsData: Map<string, string> = new Map<string, string>();
	const testsData: Array<TTestData> = [];
	for (const groupData of jsonParsed["groups"]) {
		groupsData.set(groupData["name"], groupData["file"])
	}
	for (const testData of jsonParsed["tests"]) {
		testsData.push({
			name: testData["name"],
			group: testData["group"],
			methodName: testData["method_name"],
			line: testData["line"] - 1, // because lua indexing starts with 1
			file: groupsData.get(testData["group"])?.replace("@", ""),
		})
	}
	return testsData;
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
	const tests = listTestCasesJSON();
	let testId = 1;
	let groupId = 1;
	const filesSuites: TFiles = {};
	const groups: TGroups = {};
	for (const testData of tests) {
		const testRelativeFilepath = path.relative(settings.getWorkspaceFolder(), testData.file);
		const suiteId = testRelativeFilepath;
		if (!filesSuites[suiteId]) {
			const fileSuite: TestSuiteInfo = {
				type: "suite",
				id: suiteId,
				label: suiteId,
				children: []
			};
			debugLog("Found group", fileSuite);
			filesSuites[suiteId] = fileSuite
			luaUnitSuite.children.push(fileSuite);
		}
		const testSuite: TestInfo = {
			type: "test",
			id: testId.toString(),
			label: testData.name,
			file: testData.file,
			line: testData.line,
			debuggable: false,
		}
		debugLog("Found test", testSuite);
		try {
			if (!groupsSuits[testData.group]) {
				groupsSuits[testData.group] = {};
				groupsSuits[testData.group][testSuite.label] = testSuite;

				const groupSuite: TestSuiteInfo = {
					type: "suite",
					id: "luatestGroup" + groupId,
					label: testData.group,
					children: [],
					file: testData.file,
				};
				debugLog("Found group", groupSuite);
				groups[testData.group] = { name: testData.group, suite: groupSuite };
				filesSuites[suiteId].children.push(groupSuite);
				groupId += 1;
			}
			groups[testData.group].suite.children.push(testSuite);
			groupsSuits[testData.group][testSuite.label] = testSuite;
			testId++;
		} catch (err) {
			error("Error occured while adding test, skipping", testData.group, err)
		}
	}

	return Promise.resolve<TestSuiteInfo>(luaUnitSuite);
}

export async function runTests(
	tests: string[],
	testStatesEmitter: vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>
): Promise<void> {
	const nodes = new Array<TestSuiteInfo | TestInfo>();
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
	const nodesToRun = new Array<TestSuiteInfo | TestInfo>();
	for (const node of nodes) {
		nodesToRun.push(node);
	}

	if (nodesToRun.length == 0) {
		return;
	}

	let commandToRun = luaTestExe
	for (const node of nodesToRun) {
		const nodeSuit = node as TestSuiteInfo;
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
