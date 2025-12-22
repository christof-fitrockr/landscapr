import { Injectable } from '@angular/core';
import { RepoService } from './repo.service';
import { ToastrService } from 'ngx-toastr';
import { first } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FileSystemService {

  private fileHandle: any;
  private lastSavedContent: string = '';
  private autoSaveInterval: any;

  constructor(
    private repoService: RepoService,
    private toastr: ToastrService
  ) { }

  get isSupported(): boolean {
    return 'showOpenFilePicker' in window;
  }

  get hasFileOpen(): boolean {
    return !!this.fileHandle;
  }

  async open() {
    if (!this.isSupported) return;

    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] }
        }],
        multiple: false
      });

      this.fileHandle = handle;
      const file = await this.fileHandle.getFile();
      const content = await file.text();

      this.repoService.uploadJsonContent(content).pipe(first()).subscribe(() => {
        this.lastSavedContent = content;
        this.startAutoSave();
        this.toastr.success('File opened successfully');
      });

    } catch (err) {
      console.error('Error opening file:', err);
    }
  }

  async saveAs() {
    if (!this.isSupported) return;

    try {
      const handle = await (window as any).showSaveFilePicker({
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] }
        }]
      });

      this.fileHandle = handle;
      this.saveCurrentState();
      this.startAutoSave();

    } catch (err) {
      console.error('Error saving file:', err);
    }
  }

  private startAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(() => {
      this.checkAndSave();
    }, 2000);
  }

  private checkAndSave() {
    if (!this.fileHandle) return;

    this.repoService.downloadAsJson().pipe(first()).subscribe(blob => {
      const reader = new FileReader();
      reader.onload = async () => {
        const currentContent = reader.result as string;
        if (currentContent !== this.lastSavedContent) {
           await this.writeToFile(currentContent);
           this.lastSavedContent = currentContent;
        }
      };
      reader.readAsText(blob);
    });
  }

  private async writeToFile(content: string) {
    try {
      const writable = await this.fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    } catch (err) {
      console.error('Auto-save failed:', err);
      this.toastr.error('Auto-save failed');
    }
  }

  private saveCurrentState() {
     this.repoService.downloadAsJson().pipe(first()).subscribe(blob => {
      const reader = new FileReader();
      reader.onload = async () => {
        const currentContent = reader.result as string;
        await this.writeToFile(currentContent);
        this.lastSavedContent = currentContent;
        this.toastr.success('File saved');
      };
      reader.readAsText(blob);
    });
  }
}
