import { Editor, MarkdownView, Plugin, EditorPosition } from 'obsidian';

// Remember to rename these classes and interfaces!
interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class RenameImage extends Plugin {
	settings: MyPluginSettings;

	markStart: EditorPosition;
	markEnd: EditorPosition;

	private static replaceFirstOccurrence(
		editor: Editor,
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

	private static renameImage(origin: string) {
		return origin.replaceAll(" ", "-").toLocaleLowerCase();
	}

	getSelectedText(editor: Editor) {
		if (editor.somethingSelected()) {
			const cursorStart = editor.getCursor("from");
			const cursorEnd = editor.getCursor("to");
			const content = editor.getRange(
				{ line: cursorStart.line, ch: cursorStart.ch },
				{ line: cursorEnd.line, ch: cursorEnd.ch }
			);

			return {
				start: { line: cursorStart.line, ch: cursorStart.ch },
				end: {
					line: cursorEnd.line,
					ch: cursorEnd.ch,
				},
				content: content,
			};
		} else {
			// Toggle the todo in the line
			const lineNr = editor.getCursor().line;
			const contents = editor.getDoc().getLine(lineNr);
			const cursorStart = {
				line: lineNr,
				ch: 0,
			};
			const cursorEnd = {
				line: lineNr,
				ch: contents.length,
			};
			const content = editor.getRange(cursorStart, cursorEnd);
			return { start: cursorStart, end: cursorEnd, content: content };
		}
	}

	getEditor(): Editor {
		return this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
	}

	cutSelected(): void {
		const editor = this.getEditor();
		const selectedText = this.getSelectedText(editor);
		editor.replaceRange("", selectedText.start, selectedText.end);
		navigator.clipboard.writeText(selectedText.content);
	}

	emacsMark() {
		console.log(this.markStart);
		const editor = this.getEditor();
		if (this.markStart === undefined) {
			this.markStart = editor.getCursor();
		} else if (this.markEnd === undefined) {
			this.markEnd = editor.getCursor();
		} else {
			editor.setSelection(this.markStart, this.markEnd);
			this.markStart = undefined;
			this.markEnd = undefined;
		}
		console.log("start: ", this.markStart);
		console.log("end: ", this.markEnd);
		/* if (this.markStart !== undefined && this.markEnd !== undefined) {
			editor.setSelection(this.markStart, this.markEnd);
			console.log("selection: ", editor.getSelection());
		} */
	}

	updateCursor = (cm: CodeMirror.Editor) => {
		const editor = this.getEditor();
		if (editor) {
			const cursor = editor.getCursor();
			if (this.markStart !== undefined) {
				console.log("mark: ", this.markStart);
				console.log("cursor: ", cursor);
				this.markEnd = cursor;
			}
			editor.setCursor(cursor);
			if (this.markStart !== undefined && this.markEnd !== undefined) {
				editor.setSelection(this.markStart, this.markEnd);
				console.log("selection: ", editor.getSelection());
			}
		}
	}

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "cut-selected",
			name: "Cut selected region",
			callback: () => this.cutSelected(),
		});

		this.addCommand({
			id: "emacs-mark-begin",
			name: "Emacs mark",
			hotkeys: [
				{
					modifiers: ['Ctrl'],
					key: 'Space',
				},
			],
			callback: () => this.emacsMark(),
		});

		this.registerCodeMirror((cm: CodeMirror.Editor) => {
			//console.log("cm: ", cm);
			//cm.on("keyHandled", this.updateCursor);
		});

		this.registerEvent(
			this.app.workspace.on('editor-change', (editor: Editor, markdownView: MarkdownView) => {
				const pos = editor.getCursor();
				const line = editor.getLine(pos.line);
				if (line.trim().startsWith("![[Pasted image")) {
					const orig = line.trim().replace("![[", "").replace("]]", "").split("|").first();
					const new_name = RenameImage.renameImage(orig);
					RenameImage.replaceFirstOccurrence(editor, orig, new_name);
				}
			}
			)
		);
		this.registerEvent(
			this.app.vault.on('create', (file) => {
				if (file.name.startsWith("Pasted image")) {
					console.log("Paste Image:", file);
					console.log("parent: ", file.parent);
					const new_name = RenameImage.renameImage(file.name);
					this.app.vault.rename(file, file.parent.path + "/" + new_name);
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
