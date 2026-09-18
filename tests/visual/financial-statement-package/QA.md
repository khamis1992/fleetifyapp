# Browser QA evidence

Verified with the production exporter and production financial statement React workspace through the isolated fixture on 2026-09-18. All values, actors and approvals were synthetic and held only in the test fixture.

| Check | Observed result |
| --- | --- |
| Arabic normal pagination | 11 A4 pages, 0 measured overflows |
| Arabic long labels and notes | 16 A4 pages, 0 measured overflows |
| English normal pagination | 11 A4 pages, 0 measured overflows |
| English long labels and notes | 16 A4 pages, 0 measured overflows; LTR and left aligned |
| Actual Arabic PDF download | Valid `%PDF-`, parsed with pdf-lib; 1,609,233 bytes; 11 pages |
| PDF geometry | Portrait 210 × 297 mm; equity matrices and account appendix 297 × 210 mm |
| Actual Arabic XLSX download | 21,110 bytes, valid ZIP signature |
| Actual UI approved-version XLSX | 20,068 bytes, valid ZIP signature |
| Mobile UI, both languages | 390 px viewport; document width 375 px, workspace 336 px; no page-level horizontal overflow |
| Reviewer flow | Approval disabled until all five confirmations and the review conclusion; synthetic approval succeeded and showed the separate reviewer |
| Preparer flow | Self-approval controls disabled with an explanation |
| 2025 preset | Dates changed to 2025 and comparisons to 2024; exports disabled until recalculation, then enabled |
| English workspace CSS | Final computed direction LTR and headings/paragraphs left aligned |

Unit coverage: 27 exporter tests, including finite figures, row/column consistency, cross-company input rejection, exact saved snapshot matching, forged approval rejection, HTML escaping, spreadsheet formula-text escaping, numeric worksheets, signed contra values, repeating page metadata and long-content pagination. Focused TypeScript checks also passed.

Native print uses the same measured page DOM. Its operating-system print dialog was not submitted during this QA. These checks establish rendering and interaction behavior, not an audit of company records or a real approval.
