import { Plugin, TFolder, TFile, Modal, Setting, App, Notice, TAbstractFile , FileSystemAdapter} from 'obsidian';
import { exec } from 'child_process';
import * as path from 'path';

export default class VSCodeProjectPlugin extends Plugin {
    async onload() {
  
        this.addRibbonIcon('folder', 'Open in Cursor', () => {
            new FileSelectionModal(this.app, this).open();
        });
    }

    async openInVSCode(paths: string[]) {
        const vscodeCommand = 'Cursor'; // Cursor 


        // Get vault path using FileSystemAdapter
        const adapter = this.app.vault.adapter;
        const vaultPath = adapter instanceof FileSystemAdapter ? adapter.getBasePath() : '';
        if (!vaultPath) {
            new Notice('Unable to get vault path');
            return;
        }
        
        const convertPath = (p: string) => path.join(vaultPath, p);
        
        
        const directories = paths.filter(p => this.app.vault.getAbstractFileByPath(p) instanceof TFolder);
        const files = paths.filter(p => this.app.vault.getAbstractFileByPath(p) instanceof TFile);
        

        if (directories.length > 0) {
            const fullPath = convertPath(directories[0]);
            const command = `${vscodeCommand} --new-window "${fullPath}"`;

            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    new Notice('Failed to open in Cursor');
                    return;
                }
                if (stderr) {
                    console.error(`stderr: ${stderr}`);
                }
                if (stdout) {
                    console.log(`stdout: ${stdout}`);
                }
                new Notice('Directory opened in Cursor');
            });
        } else if (files.length > 0) {
             // If no directories are selected but files exist, open all selected files
            const fullPaths = files.map(convertPath);
            const command = `${vscodeCommand} --new-window ${fullPaths.map(p => `"${p}"`).join(' ')}`;
            console.log('Opening files:', fullPaths);
            console.log('Executing command:', command);
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    new Notice('Failed to open in Cursor');
                    return;
                }
                new Notice('Files opened in Cursor');
            });
        } else {
            new Notice('No files or directories selected');
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
        contentEl.createEl('h2', { text: 'Select Files and Directories' });

        this.renderFileList(contentEl);

        new Setting(contentEl)
        .addButton(button => button
            .setButtonText('Open in Cursor')
            .onClick(() => {
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
                    // When folder is selected, add folder path instead of file paths
                    this.selectedPaths.add(folderPath);
                } else {
                    this.selectedPaths.delete(folderPath);
                }
                // Update all child file checkbox states
                const childCheckboxes = folderDiv.querySelectorAll('input[type="checkbox"]');
                childCheckboxes.forEach((cb: HTMLInputElement) => {
                    cb.checked = folderCheckbox.checked;
                    cb.dispatchEvent(new Event('change'));
                });
            });
    
            folderDiv.createEl('span', { text: folderPath || 'Root', cls: 'file-tree-folder-name' });
    
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
        return file.path;
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
