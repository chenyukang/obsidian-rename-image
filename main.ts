import { match } from 'assert';
import { moment, Editor, MarkdownView, Plugin, EditorPosition , MarkdownPostProcessorContext, MarkdownPostProcessor} from 'obsidian';
import { env } from 'process';
import { workerData } from 'worker_threads';

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
	ctrlDown: Boolean;

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

	exportMarkdown(): void {
		const editor = this.getEditor();
		const selectedText = this.getSelectedText(editor);
		let markdown = selectedText.content;
		let prefix: String = "";
		if (markdown.includes("[blog]")) {
			prefix = "http://catcoding.me/images/ob_";
		} else if (markdown.includes("[coderscat]")) {
			prefix = "http://coderscat.com/images/ob_";
		}
		let have_header = false;
		let res: String[] = [];
		markdown.split("\n").forEach((x) => {
			let line = x.trim();
			let pass = false;
			if ((line.startsWith("[[") && line.endsWith("]]")) || line.includes("date:") ||
				line.includes("pub_tags: ") ||
				line.includes("pub_link:")) {
				pass = true;
			}
			if (line.length == 0 && !have_header) {
				pass = true;
			}
			if (line == "---") {
				have_header = true;
			}
			if (!pass) {
				if (line.startsWith("![[") && line.endsWith("]]")) {
					const origin = line.substring(3, line.length - 2);
					let img = RenameImage.renameImage(origin);
					let new_line = "![" + img + "](" + prefix + img + ")";
					res.push(new_line);
				} else {
					res.push(line);
				}
			}
		});
		let final = res.join("\n");
		navigator.clipboard.writeText(final);
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

	handleDown = (evt: KeyboardEvent): void => {
		//console.log('=========================')
		//console.log('keydown:', evt.key);
		if (evt.key === "Control") {
			this.ctrlDown = true;
		} else {
			this.ctrlDown = false;
		}

	}

	handleKeyup = (evt: KeyboardEvent): void => {
		//console.log('=========================')
		//console.log('keyup:', evt.key);

		let editor = this.getEditor();
		if (!editor) return;
		const cursor = editor.getCursor();
		var prev = { line: cursor.line, ch: cursor.ch};
		var found = false;
		if (evt.key === '.' || evt.key === ',' || evt.key === ';') {
			var count = 0;
			while (true) {
				prev = { line: prev.line, ch: prev.ch - count };
				const text = editor.getRange(prev, cursor);
				console.log("text: " + text);
				if (text.contains("，") || text.contains("。") || text.contains("；") ||
					text.contains(",") || text.contains(".") || text.contains(";")) {
					console.log("right");
					found = true;
					break;
				}
				count++;
				if(count == 4) {
					console.log(count);
					break;
				}
			}
			if(found) {
				const pos = { line: prev.line, ch: prev.ch + 1 };
				editor.setSelection(pos, pos);
				editor.setCursor(pos);
			}
		}
		else if (this.markStart != undefined) {
			const cursor = editor.getCursor();
			console.log(cursor);
			this.markEnd = cursor;
			//editor.setCursor(cursor);
			editor.setSelection(this.markStart, this.markEnd);
		}
	}


	processExternalLinks(
		plugin: Plugin
	): ( el: HTMLElement, ctx: MarkdownPostProcessorContext ) => void {

		return function (
			el: HTMLElement,
			ctx: MarkdownPostProcessorContext
		): void {
			const links = el.querySelectorAll( 'a' );
			for(let index = 0; index < links.length; index++) {
				const link = links.item(index) as HTMLAnchorElement;
				console.log(link.text);
			}
		}
	}

	cleanupTitles() {
		let editor = this.getEditor();
		if (!editor) return;
		const content = editor.getValue()
		const regexMdLinks = /\[([^\[]+)\](\(.*\))/gm
		const matches = content.match(regexMdLinks)

		for (var i = 0; i < matches.length; i++) {
			const origin = matches[i];
			const elems = origin.split("](");
			var link = elems[1].replace(")", "");
			const title = elems[0].replace("[", "");
			const chars = ["|", "(", "（"]
			for(let x = 0; x < chars.length; x++) {
				const c = chars[x];
				if(title.indexOf(c) != -1) {
					const title_elems = title.split(c)
					console.log(title_elems);
					const striped = title_elems[0].trim()
					const new_title = "[" + striped + "](" + link + ")"
					RenameImage.replaceFirstOccurrence(editor, origin, new_title);
					break;
				}
			}
		}
	}

	insertCurrentTimestamp() {
		let editor = this.getEditor();
		let lastLineNumber = editor.lastLine();
		let lastLine = editor.getLine(lastLineNumber);
		const cursor = { line: lastLineNumber, ch: lastLine.length};
		const timestamp = "## " + moment().format("HH:mm");
		editor.replaceRange(`\n${timestamp}\n`, cursor);
		editor.setCursor({ line: lastLineNumber + 2, ch: 0 });
	}

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "cut-selected",
			name: "Cut selected region",
			callback: () => this.cutSelected(),
		});

		this.addCommand({
			id: "export-selected",
			name: "Export selected region",
			callback: () => this.exportMarkdown(),
		});

		this.addCommand({
			id: "external-link-title-cleanup",
			name: "Yukang: Cleanup link title",
			hotkeys: [
				{
					modifiers: ['Ctrl'],
					key: '7',
				},
			],
			callback: () => this.cleanupTitles(),
		});

		this.addCommand({
			id: "insert-current-timestamp",
			name: "Insert current timestamp",
			callback: () => this.insertCurrentTimestamp(),
		});

		this.registerMarkdownPostProcessor( this.processExternalLinks( this ) );

		//this.registerDomEvent(document, 'keyup', this.handleKeyup);
		//this.registerDomEvent(document, 'keydown', this.handleDown);

		/* 	this.registerEvent(
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
			) */
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
