import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly themeKey = 'theme';
  private darkModeSubject = new BehaviorSubject<boolean>(false);
  public darkMode$: Observable<boolean> = this.darkModeSubject.asObservable();

  constructor() {
    this.loadTheme();
  }

  isDarkMode(): boolean {
    return this.darkModeSubject.value;
  }

  setDarkMode(isDarkMode: boolean): void {
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    this.darkModeSubject.next(isDarkMode);
    localStorage.setItem(this.themeKey, isDarkMode ? 'dark' : 'light');
  }

  private loadTheme(): void {
    const theme = localStorage.getItem(this.themeKey);
    if (theme === 'dark') {
      this.setDarkMode(true);
    } else {
      this.setDarkMode(false);
    }
  }
}
