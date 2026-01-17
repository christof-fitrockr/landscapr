import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { jsPDF } from 'jspdf';

interface LicenseInfo {
  licenses: string;
  repository?: string;
  publisher?: string;
  email?: string;
  url?: string;
  path?: string;
  licenseFile?: string;
}

interface LicensesData {
  [key: string]: LicenseInfo;
}

@Component({
  selector: 'app-licenses',
  templateUrl: './licenses.component.html',
  styles: [`
    .license-card {
      margin-bottom: 20px;
    }
  `]
})
export class LicensesComponent implements OnInit {
  licenses: { name: string; info: LicenseInfo }[] = [];
  distinctLicenses: string[] = [];
  loading = true;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loading = true;
    this.http.get<LicensesData>('assets/licenses.json').subscribe(data => {
      this.licenses = Object.keys(data).map(key => ({
        name: key,
        info: data[key]
      }));
      this.calculateDistinctLicenses();
      this.loading = false;
    });
  }

  calculateDistinctLicenses() {
    const licensesSet = new Set<string>();
    this.licenses.forEach(l => {
      if (l.info.licenses) {
        // Handle cases where multiple licenses might be listed (e.g., "(MIT OR Apache-2.0)")
        // This is a simple split, might need more refinement depending on format
        const splitLicenses = l.info.licenses.replace(/[()]/g, '').split(/ OR | AND | , /);
        splitLicenses.forEach(lic => licensesSet.add(lic.trim()));
      }
    });
    this.distinctLicenses = Array.from(licensesSet).sort();
  }

  getLicenseUrl(license: string): string {
    const licenseMap: { [key: string]: string } = {
      'MIT': 'https://opensource.org/licenses/MIT',
      'Apache-2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
      'ISC': 'https://opensource.org/licenses/ISC',
      'BSD-3-Clause': 'https://opensource.org/licenses/BSD-3-Clause',
      'BSD-2-Clause': 'https://opensource.org/licenses/BSD-2-Clause',
      'GPL-3.0': 'https://www.gnu.org/licenses/gpl-3.0',
      'LGPL-3.0': 'https://www.gnu.org/licenses/lgpl-3.0',
      'MPL-2.0': 'https://www.mozilla.org/MPL/2.0/',
      'Unlicense': 'https://unlicense.org/'
    };
    return licenseMap[license] || `https://www.google.com/search?q=${encodeURIComponent(license + ' license')}`;
  }


  exportToPdf() {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - 2 * margin;
    let y = margin;

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    // Title
    doc.setFontSize(22);
    doc.text('Licenses', margin, y);
    y += 15;

    doc.setFontSize(12);
    doc.text('The following third-party libraries are used in this project:', margin, y);
    y += 10;

    // Summary
    doc.setFontSize(16);
    checkPageBreak(10);
    doc.text('Summary of Licenses', margin, y);
    y += 10;

    doc.setFontSize(11);
    this.distinctLicenses.forEach(lic => {
      checkPageBreak(6);
      doc.text(`• ${lic}`, margin + 5, y);
      y += 6;
    });

    y += 10;

    // Details
    doc.setFontSize(16);
    checkPageBreak(10);
    doc.text('Detailed License Information', margin, y);
    y += 10;

    doc.setFontSize(11);
    this.licenses.forEach(l => {
      // Approximate height calculation
      let entryHeight = 10; // Name
      entryHeight += 6; // License
      if (l.info.publisher) entryHeight += 6;
      if (l.info.repository) {
        const lines = doc.splitTextToSize(`Repository: ${l.info.repository}`, contentWidth);
        entryHeight += 6 * lines.length;
      }
      if (l.info.url) {
        const lines = doc.splitTextToSize(`URL: ${l.info.url}`, contentWidth);
        entryHeight += 6 * lines.length;
      }
      entryHeight += 10; // padding and line

      checkPageBreak(entryHeight);

      doc.setFont('helvetica', 'bold');
      doc.text(l.name, margin, y);
      y += 7;

      doc.setFont('helvetica', 'normal');
      doc.text(`License: ${l.info.licenses}`, margin, y);
      y += 6;

      if (l.info.publisher) {
        doc.text(`Publisher: ${l.info.publisher}`, margin, y);
        y += 6;
      }

      if (l.info.repository) {
        const lines = doc.splitTextToSize(`Repository: ${l.info.repository}`, contentWidth);
        doc.text(lines, margin, y);
        y += 6 * lines.length;
      }

      if (l.info.url) {
        const lines = doc.splitTextToSize(`URL: ${l.info.url}`, contentWidth);
        doc.text(lines, margin, y);
        y += 6 * lines.length;
      }

      y += 2;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;
    });

    doc.save('licenses.pdf');
  }
}
