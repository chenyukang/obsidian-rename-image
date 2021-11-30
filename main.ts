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
			this.app.vault.on('create', (file) => {
				console.log("File created: ", file.name);
				if (file.name.startsWith("Pasted image")) {
					console.log("Paste Image:", file);
					this.app.vault.rename(file, file.name.replace(" ", "_").toLocaleLowerCase());
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
