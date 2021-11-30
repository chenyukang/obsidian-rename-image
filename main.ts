import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!
interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class RenameImage extends Plugin {
	settings: MyPluginSettings;

	private static replaceFirstOccurrence(
		editor: CodeMirror.Editor,
		target: string,
		replacement: string
	  ) {
		const lines = editor.getValue().split("\n");
		for (let i = 0; i < lines.length; i += 1) {
		  const ch = lines[i].indexOf(target);
		  if (ch !== -1) {
			const from = { line: i, ch };
			const to = { line: i, ch: ch + target.length };
			editor.replaceRange(replacement, from, to);
			break;
		  }
		}
	  }

	async onload() {
		await this.loadSettings();
		this.registerEvent(
			this.app.workspace.on('editor-paste', (evt: ClipboardEvent, editor: Editor, markdownView: MarkdownView) => {
				console.log("evnt: ", evt);
			}
			)
		);
		this.registerEvent(
			this.app.vault.on('create', (file) => {
				console.log("File created: ", file.name);
				if (file.name.startsWith("Pasted image")) {
					console.log("Paste Image:", file);
					console.log("parent: ", file.parent);
					let new_name = file.name.replaceAll(" ", "_").toLocaleLowerCase();
					this.app.vault.rename(file, file.parent.path + "/" + new_name);
					this.app.workspace.iterateCodeMirrors((cm: CodeMirror.Editor) => {
						console.log("rename: ", file.name, new_name);
						RenameImage.replaceFirstOccurrence(cm, file.name, new_name);
					})
				}
			})
		)
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
