import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly themeKey = 'theme';

  constructor() {
    this.loadTheme();
  }

  isDarkMode(): boolean {
    return document.body.classList.contains('dark-theme');
  }

  setDarkMode(isDarkMode: boolean): void {
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
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
