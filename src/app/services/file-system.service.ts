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
  public isAutoSaveEnabled: boolean = true;

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

        if (!content || content.trim() === '') {
          this.toastr.error('The selected file is empty.');
          return;
        }

        this.repoService.uploadJsonContent(content).pipe(first()).subscribe(() => {
          this.lastSavedContent = content;
          if (this.isAutoSaveEnabled) {
            this.startAutoSave();
          }
          this.toastr.success('File opened successfully');
        }, (err) => {
          console.error('Failed to upload JSON content:', err);
          this.toastr.error('Error opening file: Invalid JSON content');
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
        if (this.isAutoSaveEnabled) {
          this.startAutoSave();
        }

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

    if (!this.isAutoSaveEnabled) return;

    this.autoSaveInterval = setInterval(() => {
      this.checkAndSave();
    }, 2000);
  }

  private stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  public toggleAutoSave() {
    this.isAutoSaveEnabled = !this.isAutoSaveEnabled;
    if (this.isAutoSaveEnabled) {
      if (this.hasFileOpen) {
        this.startAutoSave();
        this.toastr.info('Auto-save enabled');
      }
    } else {
      this.stopAutoSave();
      this.toastr.info('Auto-save disabled');
    }
  }

  private checkAndSave() {
    if (!this.fileHandle || !this.isAutoSaveEnabled) return;

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
      if (this.fileHandle && (await this.fileHandle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
        if ((await this.fileHandle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
          throw new Error('Write permission not granted');
        }
      }
      const writable = await this.fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    } catch (err) {
      console.error('Auto-save failed:', err);
      if (err.name === 'NotAllowedError') {
        this.toastr.error('Auto-save failed: Permission denied. Please click "Save As" to re-establish connection if this persists.');
        this.stopAutoSave();
      } else {
        this.toastr.error('Auto-save failed');
      }
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
