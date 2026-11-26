import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReportPayload } from '../../shared/types.ts';

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadReportCsv(report: ReportPayload): void {
  const lines: string[] = [];

  lines.push(['Book Rating Analysis — Analytics Report'].map(escapeCsvCell).join(','));
  lines.push(['Developed by', report.projectMetadata.studentName, 'Project ID', report.projectMetadata.projectId, 'Section', report.projectMetadata.section, 'Academic Year', report.projectMetadata.academicYear].map(escapeCsvCell).join(','));
  lines.push(['Generated At', report.generatedAt].map(escapeCsvCell).join(','));
  lines.push(['Active Filters', `Source: ${report.appliedFilters.source}; Genre: ${report.appliedFilters.genre}; Years: ${report.appliedFilters.yearMin ?? 'Any'}–${report.appliedFilters.yearMax ?? 'Any'}; Min Rating Count: ${report.appliedFilters.minRatingCount}`].map(escapeCsvCell).join(','));
  lines.push('');

  lines.push(['SUMMARY METRICS'].map(escapeCsvCell).join(','));
  lines.push(['Metric', 'Value'].join(','));
  lines.push(['Total Books Analyzed', report.summary.totalBooks].map(escapeCsvCell).join(','));
  lines.push(['Rated Books', report.summary.ratedBooks].map(escapeCsvCell).join(','));
  lines.push(['Unrated Books', report.summary.unratedBooks].map(escapeCsvCell).join(','));
  lines.push(['Total Ratings Collected', report.summary.totalRatings].map(escapeCsvCell).join(','));
  lines.push(['Unweighted Average Rating (Mean of Book Averages)', report.summary.unweightedAverageRating?.toFixed(3) ?? 'Not Available'].map(escapeCsvCell).join(','));
  lines.push(['Weighted Average Rating (Weighted by Rating Count)', report.summary.weightedAverageRating?.toFixed(3) ?? 'Not Available'].map(escapeCsvCell).join(','));
  lines.push(['Most Popular Genre', report.mostPopularGenre ? `${report.mostPopularGenre.genre} (${report.mostPopularGenre.totalRatings} ratings)` : 'Not Available'].map(escapeCsvCell).join(','));
  lines.push(['Highest-Rated Genre (Weighted)', report.highestRatedGenre ? `${report.highestRatedGenre.genre} (${report.highestRatedGenre.weightedAvgRating?.toFixed(2) ?? 'N/A'})` : 'Not Available'].map(escapeCsvCell).join(','));
  lines.push('');

  lines.push(['GENRE-WISE RATING COMPARISON'].join(','));
  lines.push(['Genre', 'Total Books', 'Rated Books', 'Total Ratings', 'Unweighted Avg Rating', 'Weighted Avg Rating'].join(','));
  for (const g of report.genreComparison) {
    lines.push(
      [
        g.genre,
        g.bookCount,
        g.ratedBookCount,
        g.totalRatings,
        g.unweightedAvgRating !== null ? g.unweightedAvgRating.toFixed(3) : 'Not Rated',
        g.weightedAvgRating !== null ? g.weightedAvgRating.toFixed(3) : 'Not Rated',
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }
  lines.push('');

  lines.push(['ANALYZED BOOK DATASET'].join(','));
  lines.push([
    'Book ID',
    'Title',
    'Authors',
    'Primary Genre',
    'Publication Year',
    'ISBN-13',
    'ISBN-10',
    'Language',
    'Average Rating',
    'Ratings Count',
    'Bayesian Confidence Score',
    'Data Source',
    'Source URL',
  ].join(','));

  for (const b of report.books) {
    lines.push(
      [
        b.id,
        b.title,
        b.authors.join('; ') || 'Not Available',
        b.primaryGenre,
        b.publicationYear ?? 'Not Available',
        b.isbn13 ?? 'Not Available',
        b.isbn10 ?? 'Not Available',
        b.language ?? 'Not Available',
        b.averageRating !== null ? b.averageRating.toFixed(2) : 'Not Rated',
        b.ratingsCount ?? 'No ratings available',
        b.bayesianScore !== null ? b.bayesianScore.toFixed(3) : 'Not Eligible',
        b.dataSource,
        b.sourceUrl,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `book-rating-analysis-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadReportPdf(report: ReportPayload): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 42;
  let y = 46;

  // Header Banner
  doc.setFillColor(11, 16, 32);
  doc.rect(0, 0, pageWidth, 106, 'F');

  doc.setTextColor(198, 169, 107);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DATA SCIENCE MINI PROJECT — ANALYTICS REPORT', margin, 32);

  doc.setTextColor(245, 241, 232);
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.text(report.projectMetadata.projectName, margin, 58);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(210, 214, 224);
  doc.text(
    `Developed by ${report.projectMetadata.studentName}  |  Project ID: ${report.projectMetadata.projectId}  |  Section: ${report.projectMetadata.section}  |  Academic Year: ${report.projectMetadata.academicYear}`,
    margin,
    80
  );

  doc.setFontSize(8.5);
  doc.setTextColor(165, 173, 188);
  doc.text(
    `Generated: ${new Date(report.generatedAt).toLocaleString()}   |   Scope: ${report.appliedFilters.source}, ${report.appliedFilters.genre}, Min Rating Count: ${report.appliedFilters.minRatingCount}`,
    margin,
    95
  );

  y = 128;

  // Section 1: Executive Summary
  doc.setTextColor(17, 24, 39);
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.text('1. Executive Summary Metrics', margin, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [23, 32, 51], textColor: [245, 241, 232], fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
    head: [['Metric', 'Computed Value', 'Methodology Note']],
    body: [
      ['Total Books Analyzed', report.summary.totalBooks.toLocaleString(), `${report.summary.ratedBooks} rated, ${report.summary.unratedBooks} unrated`],
      ['Total Ratings Collected', report.summary.totalRatings.toLocaleString(), 'Sum of genuine user rating counts'],
      ['Unweighted Average Rating', report.summary.unweightedAverageRating !== null ? `${report.summary.unweightedAverageRating.toFixed(2)} / 5.00` : 'Not Available', 'Arithmetic mean of book average ratings'],
      ['Weighted Average Rating', report.summary.weightedAverageRating !== null ? `${report.summary.weightedAverageRating.toFixed(2)} / 5.00` : 'Not Available', 'Sum(R_i * v_i) / Sum(v_i)'],
      ['Most Popular Genre', report.mostPopularGenre ? report.mostPopularGenre.genre : 'Not Available', report.mostPopularGenre ? `${report.mostPopularGenre.totalRatings.toLocaleString()} ratings` : '-'],
      ['Highest-Rated Genre', report.highestRatedGenre ? report.highestRatedGenre.genre : 'Not Available', report.highestRatedGenre?.weightedAvgRating ? `${report.highestRatedGenre.weightedAvgRating.toFixed(2)} weighted avg` : '-'],
      ['Most Rated Book', report.mostRatedBook ? report.mostRatedBook.title : 'Not Available', report.mostRatedBook ? `${report.mostRatedBook.ratingsCount?.toLocaleString()} ratings (${report.mostRatedBook.averageRating?.toFixed(2)} avg)` : '-'],
    ],
  });

  y = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 140;
  y += 22;

  // Section 2: Key Empirical Observations
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text('2. Key Data-Driven Observations', margin, y);
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  for (const obs of report.observations) {
    const wrapped = doc.splitTextToSize(`•  ${obs}`, pageWidth - margin * 2);
    if (y + wrapped.length * 13 > 760) {
      doc.addPage();
      y = 50;
    }
    doc.text(wrapped, margin, y);
    y += wrapped.length * 13 + 5;
  }

  y += 12;

  // Section 3: Genre-Wise Rating Comparison
  if (y > 620) {
    doc.addPage();
    y = 50;
  }
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text('3. Genre-Wise Rating Comparison', margin, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'striped',
    headStyles: { fillColor: [23, 32, 51], textColor: [245, 241, 232], fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    head: [['Genre', 'Books', 'Rated', 'Total Ratings', 'Unweighted Avg', 'Weighted Avg']],
    body: report.genreComparison.map((g) => [
      g.genre,
      String(g.bookCount),
      String(g.ratedBookCount),
      g.totalRatings.toLocaleString(),
      g.unweightedAvgRating !== null ? g.unweightedAvgRating.toFixed(2) : 'Not Rated',
      g.weightedAvgRating !== null ? g.weightedAvgRating.toFixed(2) : 'Not Rated',
    ]),
  });

  y = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 140;
  y += 22;

  // Section 4: Highest-Rated Books (Thresholded)
  if (y > 600) {
    doc.addPage();
    y = 50;
  }
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text(`4. Highest-Rated Books (Min ${report.appliedFilters.minRatingCount} Ratings)`, margin, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'striped',
    headStyles: { fillColor: [23, 32, 51], textColor: [245, 241, 232], fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    head: [['Title', 'Author', 'Year', 'Orig. Rating', 'Ratings', 'Bayesian Score', 'Source']],
    body: report.highestRatedBooks.slice(0, 10).map((b) => [
      b.title.length > 36 ? `${b.title.slice(0, 35)}…` : b.title,
      b.authors[0] ?? 'Not Available',
      b.publicationYear ? String(b.publicationYear) : 'N/A',
      b.averageRating !== null ? b.averageRating.toFixed(2) : 'Not Rated',
      b.ratingsCount !== null ? b.ratingsCount.toLocaleString() : 'N/A',
      b.bayesianScore !== null ? b.bayesianScore.toFixed(3) : 'N/A',
      b.dataSource.replace(' API', ''),
    ]),
  });

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 145);
    doc.text(
      `Book Rating Analysis — Developed by Sarvagya Jain (ID: 122042, Section B2) — Page ${i} of ${pageCount}`,
      margin,
      doc.internal.pageSize.getHeight() - 22
    );
  }

  doc.save(`Book-Rating-Analysis-Report-Sarvagya-Jain-${new Date().toISOString().slice(0, 10)}.pdf`);
}
