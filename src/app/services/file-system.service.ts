import { Injectable } from '@angular/core';
import { RepoService } from './repo.service';
import { ToastrService } from 'ngx-toastr';
import { first } from 'rxjs/operators';
import { FileSaverService } from 'ngx-filesaver';

@Injectable({
  providedIn: 'root'
})
export class FileSystemService {

  private fileHandle: any;
  private lastSavedContent: string = '';
  private autoSaveInterval: any;

  constructor(
    private repoService: RepoService,
    private toastr: ToastrService,
    private fileSaverService: FileSaverService
  ) { }

  get isSupported(): boolean {
    return 'showOpenFilePicker' in window;
  }

  get hasFileOpen(): boolean {
    return !!this.fileHandle;
  }

  async open() {
    if (this.isSupported) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{
            description: 'JSON Files',
            accept: {'application/json': ['.json']}
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
        if (err.name === 'AbortError') {
          console.log('User aborted the open operation');
          return;
        }
        console.error('Error opening file:', err);
        this.toastr.error('Error opening file: ' + (err.message || err));
      }
    } else {
      // Fallback: trigger the hidden file input from app.component if we can,
      // or just show a message that it's not supported and they should use the "Import Data" modal.
      this.toastr.info('Please use the "Import Data" option in the Repositories page or the main dashboard (if available) for browsers not supporting direct file access.');
    }
  }

  async saveAs() {
    if (this.isSupported) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          types: [{
            description: 'JSON Files',
            accept: {'application/json': ['.json']}
          }]
        });

        this.fileHandle = handle;
        this.saveCurrentState();
        this.startAutoSave();

      } catch (err) {
        if (err.name === 'AbortError') {
          console.log('User aborted the save-as operation');
          return;
        }
        console.error('Error saving file:', err);
        this.toastr.error('Error saving file: ' + (err.message || err));
      }
    } else {
      // Fallback for browsers that do not support the File System Access API
      this.repoService.downloadAsJson().pipe(first()).subscribe(blob => {
        this.fileSaverService.save(blob, 'landscapr-data.json');
        this.toastr.success('File downloaded');
      });
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
        try {
          await this.writeToFile(currentContent);
          this.lastSavedContent = currentContent;
          this.toastr.success('File saved');
        } catch (err) {
          console.error('Initial save failed:', err);
          this.toastr.error('Initial save failed');
        }
      };
      reader.onerror = (err) => {
        console.error('FileReader error:', err);
        this.toastr.error('Failed to read data for saving');
      };
      reader.readAsText(blob);
    });
  }
}
