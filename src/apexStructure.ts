import * as vscode from 'vscode';
import * as path from 'path';
import * as jsforce from 'jsforce';
import * as fs from 'fs';

export class ApexStructureProvider implements vscode.TreeDataProvider<any> {

	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

	private tree: any;
	private config: any;
	private editor: vscode.TextEditor;

	constructor(private context: vscode.ExtensionContext) {
		fs.readFile(path.join(vscode.workspace.rootPath, 'force.json'), 'utf8', (err, data) => {
			if (!err) {
				this.config = JSON.parse(data);
				vscode.window.onDidChangeActiveTextEditor(editor => {
					this.getSymbolTable();
					this._onDidChangeTreeData.fire();
				});
				vscode.workspace.onDidChangeTextDocument(e => { })
				this.getSymbolTable();
			} else {
				console.error('file read failed: ', err);
			}
		});
	}

	private onDocumentChanged(changeEvent: vscode.TextDocumentChangeEvent): void {
		if (changeEvent.document.uri.toString() === this.editor.document.uri.toString()) {
			for (const change of changeEvent.contentChanges) {
			}
		}
	}

	private processSymbols(data): void {
		this.tree = null;
		this.editor = vscode.window.activeTextEditor;

		let root = {
			type: 'object',
			children: []
		}

		root.children.push(this.processClasses(data));
		this.tree = root;
		this._onDidChangeTreeData.fire();
	}

	private processClasses(classData: any) {
		let modifierData = this.processModifiers(classData.tableDeclaration.modifiers);
		let parentClass = (classData.parentClass) ? '-- extends ' + classData.parentClass : '';
		let name = `${modifierData.access} ${classData.name}
			 ${modifierData.others.sort().join(' ')}
			 ${parentClass}`.replace(/\n/gm, '');
		let isEnum = (classData.properties[0] && classData.name === classData.properties[0].type);

		let classNode = {
			type: 'object',
			name: name,
			location: classData.tableDeclaration.location,
			category: (isEnum) ? 'enum' : 'class',
			children: []
		};

		classNode.children = classNode.children.concat(this.processConstructors(classData.constructors));
		classNode.children = classNode.children.concat(this.processMethods(classData.methods));
		classNode.children = classNode.children.concat(this.processProperties(classData.properties));
		classNode.children = classNode.children.concat(this.processVariables(classData.variables));
		if (classData.innerClasses) {
			classData.innerClasses.forEach(cls => {
				classNode.children.push(this.processClasses(cls));
			});
		}
		return classNode;
	}

	private processConstructors(constructors: any): any {
		return constructors.map(constructor => {
			let modifierData = this.processModifiers(constructor.modifiers);
			let name = `${modifierData.access} ${constructor.name}
				(${this.processParameters(constructor.parameters)})
				 ${modifierData.others.sort().join(' ')}`.replace(/\n/gm, '');

			return {
				name: name,
				modifiers: constructor.modifiers,
				location: constructor.location,
				type: constructor.type,
				category: 'constructor'
			}
		});
	}

	private processMethods(methods: any): any {
		return methods.map(method => {
			let modifierData = this.processModifiers(method.modifiers);
			let name = `${modifierData.access} ${method.name}
				(${this.processParameters(method.parameters)}): ${method.returnType}
				 ${modifierData.others.sort().join(' ')}`.replace(/\n/gm, '');
			return {
				name: name,
				modifiers: method.modifiers,
				location: method.location,
				type: method.type,
				category: 'method'
			}
		});
	}

	private processProperties(props: any): any {
		return props.map(prop => {
			let modifierData = this.processModifiers(prop.modifiers);
			let name = `${modifierData.access} ${prop.type} ${prop.name}
				 ${modifierData.others.sort().join(' ')}`.replace(/\n/gm, '');
			return {
				name: name,
				modifiers: prop.modifiers,
				location: prop.location,
				type: prop.type,
				category: 'property'
			}
		});
	}

	private processVariables(variables: any): any {
		return variables.map(variable => {
			let modifierData = this.processModifiers(variable.modifiers);
			let name = `${modifierData.access} ${variable.type} ${variable.name}
				 ${modifierData.others.sort().join(' ')}`.replace(/\n/gm, '');
			return {
				name: name,
				modifiers: variable.modifiers,
				location: variable.location,
				type: variable.type,
				category: 'variable'
			}
		});
	}

	private processParameters(params: any): any {
		let paramLabel = '';
		params.forEach((param, index) => {
			if (params.length > 1 && params.length === index + 1 || params.length === 1) {
				paramLabel += '' + param.type + ' ' + param.name + '';
			} else {
				paramLabel += '' + param.type + ' ' + param.name + ', ';
			}
		});
		return paramLabel;
	}

	private processModifiers(mods: any): any {
		let modifierData = {
			access: '',
			others: []
		};
		mods.forEach(mod => {
			if (utfToModifiers.hasOwnProperty(mod)) {
				modifierData.access = utfToModifiers[mod];
			} else {
				modifierData.others.push(mod);
			}
		});
		if (modifierData.others.length > 0) {
			modifierData.others.unshift('-- ')
		}
		return modifierData;
	}

	private getSymbolTable(): void {

		this.tree = null;
		this.editor = vscode.window.activeTextEditor;
		let fileName = this.editor.document.fileName.replace(/^.*[\\\/]/, '');
		fileName = fileName.substring(0, fileName.indexOf('.'));

		const conn = new jsforce.Connection();
		if (this.editor && this.editor.document && this.editor.document.languageId === 'apex') {

			conn.login(this.config.username, this.config.password, (err, res) => {
				conn.tooling.sobject('ApexClass')
					.find({ Name: fileName, NamespacePrefix: this.config.prefix || '' })
					.execute((err, records) => {
						const record = records[0];
						this.processSymbols(record.SymbolTable);
					});
			});

		}

	}

	getChildren(node) {
		if (node) {
			return Promise.resolve(node.children ? node.children : []);
		} else {
			return Promise.resolve(this.tree ? this.tree.children : []);
		}
	}

	getTreeItem(node: any): vscode.TreeItem {
		let hasChildren = node.children && node.children.length > 0;
		let location = node.location;
		let treeItem: vscode.TreeItem = new vscode.TreeItem(node.name, hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);

		treeItem.command = {
			command: 'extension.openApexSelection',
			title: '',
			arguments: [
				new vscode.Range(
					location.line - 1,
					location.column - 1,
					location.line - 1,
					location.column - 1
				)
			]
		};

		treeItem.iconPath = this.getIcon(node.category);
		treeItem.contextValue = node.type || 'none';
		return treeItem;
	}

	select(range: vscode.Range) {
		this.editor.selection = new vscode.Selection(range.start, range.end);
	}

	setViewOfRange(range: vscode.Range) {
		this.editor.revealRange(range, 1);
	}

	private getIcon(category: string): string {
		switch (category) {
			case 'class':
				return this.context.asAbsolutePath(path.join('resources', 'class.svg'));
			case 'enum':
				return this.context.asAbsolutePath(path.join('resources', 'enum.svg'));
			case 'method':
				return this.context.asAbsolutePath(path.join('resources', 'method.svg'));
			case 'constructor':
				return this.context.asAbsolutePath(path.join('resources', 'constructor.svg'));
			case 'property':
				return this.context.asAbsolutePath(path.join('resources', 'property.svg'));
			case 'variable':
				return this.context.asAbsolutePath(path.join('resources', 'var.svg'));
			default:
				return this.context.asAbsolutePath(path.join('resources', 'default.svg'));
		}
	}

}

const utfToModifiers = {
	'global': '\u{1F30E}\u{00A0}',
	'public': '\u{1F511}\u{00A0}',
	'private': '\u{1F512}\u{00A0}',
	'protected': '\u{1F510}\u{00A0}'
}
