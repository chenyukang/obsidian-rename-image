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
					this.app.vault.rename(file, file.parent.path + "/" + file.name.replaceAll(" ", "_").toLocaleLowerCase());
					this.app.workspace.iterateCodeMirrors(cm: CodeMirror.Editor) {
						cm.refresh();
					}
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
