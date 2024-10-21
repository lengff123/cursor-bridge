import { Plugin, TFolder, TFile, Modal, Setting, App, Notice, TAbstractFile } from 'obsidian';
import { exec } from 'child_process';
import * as path from 'path';

export default class VSCodeProjectPlugin extends Plugin {
    async onload() {
        console.log('加载 Cursor Project Plugin');

        // 添加一个侧边栏按钮
        this.addRibbonIcon('folder', 'Open in Cursor', () => {
            new FileSelectionModal(this.app, this).open();
        });
    }

    onunload() {
        console.log('卸载 Cursor Project Plugin');
    }

    async openInVSCode(paths: string[]) {
        const vscodeCommand = 'Cursor'; // Cursor 命令行工具
        
        // 获取 Obsidian 库的根路径
        const vaultPath = this.app.vault.adapter.basePath;
        console.log('Vault root path:', vaultPath);
        
        // 转换路径
        const convertPath = (p: string) => {
            const fullPath = path.join(vaultPath, p);
            console.log(`Converting path: "${p}" to "${fullPath}"`);
            return fullPath;
        };
        
        // 分离文件和目录
        const directories = paths.filter(p => this.app.vault.getAbstractFileByPath(p) instanceof TFolder);
        const files = paths.filter(p => this.app.vault.getAbstractFileByPath(p) instanceof TFile);
        
        console.log('Selected directories:', directories);
        console.log('Selected files:', files);

        // 如果有目录，只打开第一个目录
        if (directories.length > 0) {
            const fullPath = convertPath(directories[0]);
            const command = `${vscodeCommand} --new-window "${fullPath}"`;
            console.log('Opening directory:', fullPath);
            console.log('Executing command:', command);
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`执行错误: ${error}`);
                    new Notice('打开 Cursor 失败');
                    return;
                }
                if (stderr) {
                    console.error(`stderr: ${stderr}`);
                }
                if (stdout) {
                    console.log(`stdout: ${stdout}`);
                }
                new Notice('已在 Cursor 中打开目录');
            });
        } else if (files.length > 0) {
            // 如果没有目录但有文件，打开所有选中的文件
            const fullPaths = files.map(convertPath);
            const command = `${vscodeCommand} --new-window ${fullPaths.map(p => `"${p}"`).join(' ')}`;
            console.log('Opening files:', fullPaths);
            console.log('Executing command:', command);
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`执行错误: ${error}`);
                    new Notice('打开 Cursor 失败');
                    return;
                }
                if (stderr) {
                    console.error(`stderr: ${stderr}`);
                }
                if (stdout) {
                    console.log(`stdout: ${stdout}`);
                }
                new Notice('已在 Cursor 中打开文件');
            });
        } else {
            new Notice('未选择任何文件或目录');
        }
    }
}

class FileSelectionModal extends Modal {
    plugin: VSCodeProjectPlugin;
    selectedPaths: Set<string> = new Set();

    constructor(app: App, plugin: VSCodeProjectPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: '选择文件和目录' });

        this.renderFileList(contentEl);

        new Setting(contentEl)
        .addButton(button => button
            .setButtonText('在 Cursor 中打开')
            .onClick(() => {
                console.log('Selected paths:', Array.from(this.selectedPaths)); // 添加这行
                this.plugin.openInVSCode(Array.from(this.selectedPaths));
                this.close();
            }));
    }

    renderFileList(container: HTMLElement) {
        const files = this.app.vault.getFiles();
        const fileTree: { [key: string]: TFile[] } = {};
    
        files.forEach(file => {
            const folderPath = file.parent?.path || '';
            if (!fileTree[folderPath]) {
                fileTree[folderPath] = [];
            }
            fileTree[folderPath].push(file);
        });
    
        Object.keys(fileTree).sort().forEach(folderPath => {
            const folderDiv = container.createEl('div', {
                cls: 'file-tree-folder',
                attr: { style: 'margin-left: 20px;' }
            });
    
            const folderCheckbox = folderDiv.createEl('input', { type: 'checkbox' });
            folderCheckbox.addEventListener('change', () => {
                if (folderCheckbox.checked) {
                    // 当选中文件夹时，添加文件夹路径而不是文件路径
                    this.selectedPaths.add(folderPath);
                } else {
                    this.selectedPaths.delete(folderPath);
                }
                // 更新所有子文件的选中状态
                const childCheckboxes = folderDiv.querySelectorAll('input[type="checkbox"]');
                childCheckboxes.forEach((cb: HTMLInputElement) => {
                    cb.checked = folderCheckbox.checked;
                    cb.dispatchEvent(new Event('change'));
                });
            });
    
            folderDiv.createEl('span', { text: folderPath || '根目录', cls: 'file-tree-folder-name' });
    
            fileTree[folderPath].forEach(file => {
                const fileDiv = folderDiv.createEl('div', {
                    cls: 'file-tree-item',
                    attr: { style: 'margin-left: 20px;' }
                });
    
                const checkbox = fileDiv.createEl('input', { type: 'checkbox' });
                checkbox.addEventListener('change', () => {
                    const path = this.getFullPath(file);
                    if (checkbox.checked) {
                        this.selectedPaths.add(path);
                    } else {
                        this.selectedPaths.delete(path);
                    }
                });
    
                fileDiv.createSpan({ text: file.name });
            });
        });
    }
    getFullPath(file: TAbstractFile): string {
        if (file instanceof TFile) {
            return this.app.vault.getAllLoadedFiles().find(f => f.path === file.path)?.path || file.path;
        } 
        throw new Error('Unsupported file type');
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
