import { renderToStaticMarkup } from 'react-dom/server';
import Report from '../../components/Report';
import { validateRecord, type DecisionRecord } from './record';
import { DEFAULT_REPORT_OPTIONS, type ReportOptions } from './options';
import reportStyles from './report.css?raw';
export function reportHtml(record: DecisionRecord, options: ReportOptions = DEFAULT_REPORT_OPTIONS): string {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Veridia manufacturer decision record</title><style>' + reportStyles + '</style></head><body><div class="print-tools"><button onclick="window.print()">Print / Save as PDF</button><p>Saved locally. No network connection required.</p></div>' + renderToStaticMarkup(<Report record={validateRecord(record)} options={options}/>) + '</body></html>';
}
