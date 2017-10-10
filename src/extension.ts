'use strict';

import * as vscode from 'vscode';
import { ApexStructureProvider } from './apexStructure';

export function activate(context: vscode.ExtensionContext) {
	const rootPath = vscode.workspace.rootPath;

	const apexStructureProvider = new ApexStructureProvider(context);

	vscode.window.registerTreeDataProvider('apexStructure', apexStructureProvider);

	vscode.commands.registerCommand('extension.openApexSelection', range => {
		apexStructureProvider.select(range);
		apexStructureProvider.setViewOfRange(range);
	});

}
