import * as vscode from "vscode";
import { TestHub, testExplorerExtensionId } from "vscode-test-adapter-api";
import { Log, TestAdapterRegistrar } from "vscode-test-adapter-util";
import { LuaTestAdapter } from "./adapter";

export async function activate(context: vscode.ExtensionContext) {

	const workspaceFolder = (vscode.workspace.workspaceFolders || [])[0];

	const log = new Log("tarantoolLuatestAdapter", workspaceFolder, "Lua Test Adapter Log");
	context.subscriptions.push(log);

	const testExplorerExtension = vscode.extensions.getExtension<TestHub>(testExplorerExtensionId);
	if (log.enabled) log.info(`Test Explorer ${testExplorerExtension ? "" : "not "}found`);

	if (testExplorerExtension) {

		const testHub = testExplorerExtension.exports;

		context.subscriptions.push(new TestAdapterRegistrar(
			testHub,
			workspaceFolder => new LuaTestAdapter(workspaceFolder, log),
			log
		));
	}
}
