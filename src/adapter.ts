import * as vscode from "vscode";
import { TestAdapter, TestLoadStartedEvent, TestLoadFinishedEvent, TestRunStartedEvent, TestRunFinishedEvent, TestSuiteEvent, TestEvent, TestSuiteInfo } from "vscode-test-adapter-api";
import { Log } from "vscode-test-adapter-util";
import * as settings from "./settings";
import { loadTests, runTests, findNode } from "./tests";

export class LuaTestAdapter implements TestAdapter {

	private disposables: { dispose(): void }[] = [];

	private readonly testsEmitter = new vscode.EventEmitter<TestLoadStartedEvent | TestLoadFinishedEvent>();
	private readonly testStatesEmitter = new vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>();
	private readonly autorunEmitter = new vscode.EventEmitter<void>();

	get tests(): vscode.Event<TestLoadStartedEvent | TestLoadFinishedEvent> { return this.testsEmitter.event; }
	get testStates(): vscode.Event<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent> { return this.testStatesEmitter.event; }
	get autorun(): vscode.Event<void> | undefined { return this.autorunEmitter.event; }

	private suite: TestSuiteInfo | undefined;

	constructor(
		public readonly workspace: vscode.WorkspaceFolder,
		private readonly log: Log
	) {
		this.log.info("Initializing Tarantool luatest adapter");
		this.disposables.push(this.testsEmitter);
		this.disposables.push(this.testStatesEmitter);
		this.disposables.push(this.autorunEmitter);
	}

	async load(): Promise<void> {
		this.log.info("Loading Tarantool luatest tests");
		this.testsEmitter.fire(<TestLoadStartedEvent>{ type: "started" });
		this.suite = await loadTests();
		this.testsEmitter.fire(<TestLoadFinishedEvent>{ type: "finished", suite: this.suite });
	}

	async run(tests: string[]): Promise<void> {
		this.log.info(`Running Tarantool luatest tests ${JSON.stringify(tests)}`);
		this.testStatesEmitter.fire(<TestRunStartedEvent>{ type: "started", tests });
		await runTests(tests, this.testStatesEmitter);
		this.testStatesEmitter.fire(<TestRunFinishedEvent>{ type: "finished" });
	}

	async debug(tests: string[]): Promise<void> {
		if (!this.suite) {
			this.log.error("No tests loaded", tests);
			return;
		}

		const node = findNode(this.suite, tests[0]);
		if (!node) {
			this.log.error("Test not found", tests[0]);
			return;
		}

		if (!node.file) {
			this.log.error("Test does not specify test file", node);
			return;
		}

		const file = vscode.Uri.file(node.file);
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(file);

		if (!workspaceFolder) {
			this.log.error("Failed to find test file workspaceFolder", node.file);
			return;
		}

		const luaTestExe = settings.getLuaTestExe();
		return new Promise<void>(() => {
			vscode.debug.startDebugging(workspaceFolder, {
				"type": "lua",
				"request": "launch",
				"name": "Launch",
				"luaexe": luaTestExe,
				"cwd": workspaceFolder.uri.fsPath,
				"program": file.fsPath,
				"arg": [node.label],
				"console": "internalConsole",
				"stopOnEntry": false
			});
		});
	}

	cancel(): void {
		// in a "real" TestAdapter this would kill the child process for the current test run (if there is any)
		throw new Error("Method not implemented.");
	}

	dispose(): void {
		this.cancel();
		for (const disposable of this.disposables) {
			disposable.dispose();
		}
		this.disposables = [];
	}
}
