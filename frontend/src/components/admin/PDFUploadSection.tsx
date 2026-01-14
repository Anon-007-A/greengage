import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { usePortfolio } from '@/contexts/PortfolioContext';

// Minimal parser using pdfjs to extract text and simple covenant heuristics
export default function PDFUploadSection() {
  const { toast } = useToast();
  const { loadLoans, appendLoans, setLoans, loans: currentLoans } = usePortfolio() as any;
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<'append' | 'replace'>('append');

  const onFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming).filter(f => f.type === 'application/pdf');
    if (arr.length !== incoming.length) {
      toast({ title: 'Invalid file type', description: 'Only PDF files are accepted', variant: 'destructive' });
    }
    setFiles(prev => [...prev, ...arr]);
  }, [setFiles, toast]);

  const onDrop: React.DragEventHandler = (e) => {
    e.preventDefault();
    onFiles(e.dataTransfer.files);
  };

  const onUpload = async () => {
    if (files.length === 0) {
      toast({ title: 'No files', description: 'Please select at least one PDF to upload', variant: 'destructive' });
      return;
    }

    // Load PDF.js from CDN at runtime to avoid Vite resolving local node_modules paths
    const ensurePdfJs = async () => {
      const win = window as any;
      if (win.pdfjsLib) return win.pdfjsLib;

      // inject legacy build which exposes pdfjsLib globally
      const scriptUrl = 'https://unpkg.com/pdfjs-dist@latest/legacy/build/pdf.min.js';
      const workerUrl = 'https://unpkg.com/pdfjs-dist@latest/build/pdf.worker.min.js';

      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector(`script[src="${scriptUrl}"]`);
        if (existing) {
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', () => reject(new Error('Failed to load pdfjs script')));
          return;
        }
        const s = document.createElement('script');
        s.src = scriptUrl;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load pdfjs script'));
        document.head.appendChild(s);
      });

      const pdfjsLib = (window as any).pdfjsLib;
      try {
        pdfjsLib.GlobalWorkerOptions = pdfjsLib.GlobalWorkerOptions || {};
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      } catch (e) {
        // ignore
      }
      return pdfjsLib;
    };

    const pdfjs = await ensurePdfJs();

    let extractedCount = 0;
    try {
      const parsedLoans: any[] = [];
      for (const file of files) {
        setProgress(p => ({ ...p, [file.name]: 5 }));
        const arrayBuffer = await file.arrayBuffer();
        setProgress(p => ({ ...p, [file.name]: 20 }));
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer } as any);
        const pdf = await loadingTask.promise;
        setProgress(p => ({ ...p, [file.name]: 40 }));
        // read first page text as heuristic
        const page = await pdf.getPage(1);
        const textContent = await page.getTextContent();
        const text = textContent.items.map((it: any) => it.str).join(' ');
        setProgress(p => ({ ...p, [file.name]: 70 }));

        // Simple regex heuristics to extract borrower name, amount, covenant
        const borrowerMatch = text.match(/Borrower[:\s]*([A-Z][\w &,-]{2,50})/i) || text.match(/Company[:\s]*([A-Z][\w &,-]{2,50})/i);
        const amountMatch = text.match(/€\s?([0-9,.]{3,})/i) || text.match(/EUR\s?([0-9,.]{3,})/i);
        const covenantMatch = text.match(/(DSCR|Debt-to-EBITDA|Leverage|Interest Coverage|Current Ratio)/i);

        const loanObj: any = {
          id: `uploaded-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
          companyName: borrowerMatch ? borrowerMatch[1] : `Uploaded Loan ${parsedLoans.length + 1}`,
          sector: 'Unknown',
          loanAmount: amountMatch ? Number(String(amountMatch[1]).replace(/[,]/g, '')) : 10000000,
          currency: 'EUR',
          covenants: covenantMatch ? [{ name: covenantMatch[1], threshold: 1.0, currentValue: 0 }] : [],
          riskScore: { overall: 50, covenantComponent: 30, impactComponent: 20, level: 'medium', trend: 'stable' }
        };

        parsedLoans.push(loanObj);
        extractedCount += 1;
        setProgress(p => ({ ...p, [file.name]: 100 }));
      }

      // merge into portfolio
      if (mode === 'replace') {
        // replace current loans with parsed loans
        setLoans(parsedLoans);
      } else {
        // append parsed loans to current portfolio
        setLoans([...(currentLoans || []), ...parsedLoans]);
      }

      toast({ title: 'Upload complete', description: `${extractedCount} covenants extracted from ${files.length} PDFs` });

    } catch (e) {
      logger.error('PDF upload error', e);
      toast({ title: 'Upload failed', description: 'Failed to parse uploaded PDF(s)', variant: 'destructive' });
    } finally {
      // keep files list for re-processing as requested
    }
  };

  return (
    <div onDrop={onDrop} onDragOver={(e)=>e.preventDefault()} className="p-4 rounded border border-dashed border-gray-300 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-semibold">Upload PDFs (Covenant Extraction)</p>
          <p className="text-xs text-muted-foreground">Drag & drop PDF files here or use the file browser. Only PDF accepted.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <Input type="file" accept="application/pdf" onChange={(e) => onFiles(e.target.files)} />
          </label>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2 mb-2">
          {files.map(f => (
            <div key={f.name} className="flex items-center justify-between">
              <div className="text-sm">{f.name}</div>
              <div className="text-xs text-muted-foreground">{(progress[f.name] || 0)}%</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="p-2 border rounded">
          <option value="append">Append to portfolio</option>
          <option value="replace">Replace current loans</option>
        </select>
        <Button onClick={onUpload}>Process PDFs</Button>
      </div>
    </div>
  );
}
