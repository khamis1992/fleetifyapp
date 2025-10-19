/**
 * Report Styles
 * Extracted from useReportExport.ts for better organization
 * Contains all CSS styles for PDF/HTML report generation
 */

export const getReportStyles = (): string => `
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    body {
        font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333;
        background: #f8f9fa;
        direction: rtl;
    }

    .report-container {
        max-width: 1200px;
        margin: 0 auto;
        background: white;
        min-height: 100vh;
        box-shadow: 0 0 20px rgba(0,0,0,0.1);
    }

    .report-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 2rem;
        text-align: center;
    }

    .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
    }

    .company-logo {
        max-height: 60px;
        margin-bottom: 0.5rem;
    }

    .company-name {
        font-size: 1.8rem;
        font-weight: bold;
        margin-bottom: 0.5rem;
    }

    .report-title {
        font-size: 2rem;
        font-weight: bold;
        margin-bottom: 0.5rem;
    }

    .report-meta {
        display: flex;
        gap: 2rem;
        font-size: 0.9rem;
        opacity: 0.9;
    }

    .filters-section {
        background: #f8f9fa;
        padding: 1.5rem;
        border-bottom: 2px solid #e9ecef;
    }

    .filters-section h3 {
        margin-bottom: 1rem;
        color: #495057;
    }

    .filters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }

    .filter-item {
        background: white;
        padding: 0.75rem;
        border-radius: 6px;
        border: 1px solid #dee2e6;
        font-weight: 500;
    }

    .report-content {
        padding: 2rem;
    }

    .data-table {
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0;
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .data-table th,
    .data-table td {
        padding: 1rem;
        text-align: right;
        border-bottom: 1px solid #e9ecef;
    }

    .data-table th {
        background: #f8f9fa;
        font-weight: bold;
        color: #495057;
        border-bottom: 2px solid #dee2e6;
    }

    .data-table tbody tr:hover {
        background: #f8f9fa;
    }

    .summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin: 2rem 0;
    }

    .summary-card {
        background: white;
        padding: 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        border-right: 4px solid #667eea;
    }

    .summary-card h4 {
        color: #495057;
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .summary-card .value {
        font-size: 2rem;
        font-weight: bold;
        color: #2d3748;
        margin-bottom: 0.25rem;
    }

    .summary-card .change {
        font-size: 0.8rem;
        color: #666;
    }

    .report-footer {
        background: #f8f9fa;
        padding: 1.5rem 2rem;
        border-top: 2px solid #e9ecef;
        margin-top: 2rem;
    }

    .footer-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.9rem;
        color: #666;
    }

    .print-controls {
        position: fixed;
        bottom: 2rem;
        left: 2rem;
        display: flex;
        gap: 1rem;
        z-index: 1000;
    }

    .btn {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
    }

    .btn-primary {
        background: #667eea;
        color: white;
    }

    .btn-primary:hover {
        background: #5a6fd8;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102,126,234,0.4);
    }

    .btn-secondary {
        background: #6c757d;
        color: white;
    }

    .btn-secondary:hover {
        background: #5a6268;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(108,117,125,0.4);
    }

    /* Print Styles */
    @media print {
        body {
            background: white;
        }

        .report-container {
            box-shadow: none;
            max-width: none;
        }

        .no-print {
            display: none !important;
        }

        .report-header {
            background: #667eea !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
        }

        .data-table {
            break-inside: avoid;
        }

        .summary-card {
            break-inside: avoid;
            page-break-inside: avoid;
        }

        @page {
            margin: 1cm;
            size: A4;
        }
    }

    /* Damage Report Specific Styles */
    .vehicle-info-section {
        margin: 2rem 0;
        background: #f8f9fa;
        padding: 1.5rem;
        border-radius: 8px;
        border-right: 4px solid #28a745;
    }

    .vehicle-info-section h3 {
        margin-bottom: 1rem;
        color: #495057;
        font-size: 1.2rem;
    }

    .vehicle-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
    }

    .detail-item {
        background: white;
        padding: 0.75rem;
        border-radius: 6px;
        border: 1px solid #dee2e6;
    }

    .detail-item strong {
        color: #495057;
        margin-left: 0.5rem;
    }

    .damage-visualization {
        margin: 2rem 0;
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .damage-visualization h3 {
        margin-bottom: 1.5rem;
        color: #495057;
        text-align: center;
    }

    .vehicle-diagram {
        position: relative;
        max-width: 600px;
        margin: 0 auto;
        background: #f8f9fa;
        border-radius: 8px;
        padding: 2rem;
    }

    .vehicle-outline {
        width: 100%;
        height: auto;
        display: block;
    }

    .damage-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }

    .damage-point {
        position: absolute;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        color: white;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        transform: translate(-50%, -50%);
    }

    .damage-point.severity-minor {
        background: #28a745;
    }

    .damage-point.severity-moderate {
        background: #ffc107;
        color: #212529;
    }

    .damage-point.severity-severe {
        background: #dc3545;
    }

    .damage-legend {
        display: flex;
        justify-content: center;
        gap: 2rem;
        margin-top: 1.5rem;
        flex-wrap: wrap;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
    }

    .legend-color {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }

    .legend-color.severity-minor {
        background: #28a745;
    }

    .legend-color.severity-moderate {
        background: #ffc107;
    }

    .legend-color.severity-severe {
        background: #dc3545;
    }

    .no-damage {
        text-align: center;
        padding: 2rem;
        color: #666;
        background: #f8f9fa;
        border-radius: 8px;
        border: 2px dashed #dee2e6;
    }

    .damage-table-section {
        margin: 2rem 0;
    }

    .damage-table-section h3 {
        margin-bottom: 1rem;
        color: #495057;
    }

    .notes-section {
        margin: 2rem 0;
        background: #fff3cd;
        padding: 1.5rem;
        border-radius: 8px;
        border-right: 4px solid #ffc107;
    }

    .notes-section h3 {
        margin-bottom: 1rem;
        color: #856404;
    }

    .notes-content {
        color: #856404;
        line-height: 1.6;
        background: white;
        padding: 1rem;
        border-radius: 6px;
        border: 1px solid #ffeaa7;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .header-content {
            flex-direction: column;
            text-align: center;
        }

        .report-meta {
            flex-direction: column;
            gap: 0.5rem;
        }

        .filters-grid {
            grid-template-columns: 1fr;
        }

        .footer-content {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
        }

        .print-controls {
            position: relative;
            bottom: auto;
            left: auto;
            justify-content: center;
            margin: 2rem 0;
        }

        .no-data {
            text-align: center;
            padding: 3rem;
            color: #666;
            background: #f8f9fa;
            border-radius: 8px;
            margin: 2rem 0;
        }

        .data-section {
            margin: 2rem 0;
        }

        .data-section h3 {
            margin-bottom: 1rem;
            color: #495057;
            font-size: 1.2rem;
        }

        .table-note {
            text-align: center;
            color: #666;
            font-style: italic;
            margin-top: 1rem;
        }

        .vehicle-details {
            grid-template-columns: 1fr;
        }

        .damage-legend {
            flex-direction: column;
            align-items: center;
            gap: 1rem;
        }

        .vehicle-diagram {
            padding: 1rem;
        }
    }
`;
