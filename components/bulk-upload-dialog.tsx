'use client';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase, Category, Brand } from '@/lib/supabase';
import { Dialog, Button, useToast } from '@/components/ui';
import { UploadCloud, Download, FileSpreadsheet } from 'lucide-react';

type ParsedRow = {
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryName: string;
  brandName: string;
  image_url: string | null;
};

const CHUNK_SIZE = 300;

export function BulkUploadDialog({
  categories,
  brands,
  onClose,
  onDone,
}: {
  categories: Category[];
  brands: Brand[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [status, setStatus] = useState<'idle' | 'parsed' | 'uploading' | 'done'>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState({ inserted: 0, failed: 0 });
  const toast = useToast();

  function downloadTemplate() {
    const sample = [
      { Name: 'iPhone 11 Pro OLED Screen', Description: 'Screen assembly for iPhone 11 Pro', Price: 1850, Stock: 10, Category: 'Screens', Brand: 'Apple', 'Image URL': '' },
      { Name: 'Samsung A50 Battery', Description: '4000mAh replacement battery', Price: 650, Stock: 25, Category: 'Batteries', Brand: 'Samsung', 'Image URL': '' },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'partshop-product-template.xlsx');
  }

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target?.result, { type: 'binary' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const parsed: ParsedRow[] = [];
      let skippedCount = 0;
      for (const r of raw) {
        // case-insensitive column lookup so "name"/"Name"/"NAME" all work
        const get = (keys: string[]) => {
          for (const k of Object.keys(r)) {
            if (keys.includes(k.trim().toLowerCase())) return r[k];
          }
          return '';
        };
        const name = String(get(['name'])).trim();
        const price = parseFloat(String(get(['price'])));
        if (!name || isNaN(price)) {
          skippedCount++;
          continue;
        }
        parsed.push({
          name,
          description: String(get(['description'])).trim(),
          price,
          stock: parseInt(String(get(['stock']))) || 0,
          categoryName: String(get(['category'])).trim(),
          brandName: String(get(['brand'])).trim(),
          image_url: String(get(['image url', 'image_url', 'image'])).trim() || null,
        });
      }
      setRows(parsed);
      setSkipped(skippedCount);
      setStatus('parsed');
    };
    reader.readAsBinaryString(file);
  }

  async function upload() {
    setStatus('uploading');
    const sb = supabase();

    // Resolve category/brand names to IDs, creating any that don't exist yet.
    const catMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
    const brandMap = new Map(brands.map((b) => [b.name.toLowerCase(), b.id]));

    const newCatNames = [...new Set(rows.map((r) => r.categoryName).filter((n) => n && !catMap.has(n.toLowerCase())))];
    const newBrandNames = [...new Set(rows.map((r) => r.brandName).filter((n) => n && !brandMap.has(n.toLowerCase())))];

    if (newCatNames.length) {
      const { data } = await sb.from('categories').insert(newCatNames.map((name) => ({ name }))).select();
      (data || []).forEach((c: any) => catMap.set(c.name.toLowerCase(), c.id));
    }
    if (newBrandNames.length) {
      const { data } = await sb.from('brands').insert(newBrandNames.map((name) => ({ name }))).select();
      (data || []).forEach((b: any) => brandMap.set(b.name.toLowerCase(), b.id));
    }

    const payload = rows.map((r) => ({
      name: r.name,
      description: r.description || null,
      price: r.price,
      stock: r.stock,
      category_id: r.categoryName ? catMap.get(r.categoryName.toLowerCase()) || null : null,
      brand_id: r.brandName ? brandMap.get(r.brandName.toLowerCase()) || null : null,
      image_url: r.image_url,
    }));

    let inserted = 0;
    let failed = 0;
    const total = Math.ceil(payload.length / CHUNK_SIZE);
    setProgress({ done: 0, total });

    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const chunk = payload.slice(i, i + CHUNK_SIZE);
      const { error } = await sb.from('products').insert(chunk);
      if (error) failed += chunk.length;
      else inserted += chunk.length;
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setResult({ inserted, failed });
    setStatus('done');
    if (inserted > 0) toast(`${inserted} products uploaded`, 'good');
    if (failed > 0) toast(`${failed} products failed to upload`, 'bad');
    onDone();
  }

  return (
    <Dialog open onClose={onClose} title="Bulk upload products">
      <div className="space-y-4">
        <p className="text-sm text-muted leading-relaxed">
          Upload an Excel or CSV file with columns: <b>Name</b>, Description, <b>Price</b>, Stock, Category,
          Brand, Image URL. Category and Brand are matched by name — new ones are created automatically if
          they don't already exist. Only Name and Price are required.
        </p>

        <button onClick={downloadTemplate} className="flex items-center gap-2 text-sm text-accent2 hover:underline">
          <Download size={15} /> Download a template file
        </button>

        {status === 'idle' && (
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-line rounded-lg py-10 cursor-pointer hover:border-accent transition-colors">
            <UploadCloud size={28} className="text-muted" />
            <span className="text-sm text-muted">Click to choose a .xlsx, .xls, or .csv file</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        )}

        {status === 'parsed' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-ink bg-panel2 border border-line rounded-lg p-3">
              <FileSpreadsheet size={18} className="text-accent2 shrink-0" />
              <div>
                <p className="font-medium">{fileName}</p>
                <p className="text-muted text-xs mt-0.5">
                  {rows.length} products ready to upload{skipped > 0 ? `, ${skipped} rows skipped (missing name or price)` : ''}
                </p>
              </div>
            </div>
            <Button className="w-full" onClick={upload}>Upload {rows.length} products</Button>
          </div>
        )}

        {status === 'uploading' && (
          <div className="space-y-2">
            <p className="text-sm text-muted">Uploading batch {progress.done} of {progress.total}…</p>
            <div className="h-2 rounded-full bg-panel2 overflow-hidden">
              <div className="h-full bg-accent transition-all" style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }} />
            </div>
          </div>
        )}

        {status === 'done' && (
          <div className="space-y-3">
            <p className="text-sm text-ink">
              <span className="text-good font-medium">{result.inserted} uploaded</span>
              {result.failed > 0 && <span className="text-bad font-medium"> · {result.failed} failed</span>}
            </p>
            <Button className="w-full" variant="outline" onClick={onClose}>Done</Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
