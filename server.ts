import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.PORT) || 3000;

interface LocalCapabilities {
  pythonInstalled: boolean;
  pythonCmd: string | null;
  pythonVersion?: string;
  libreOfficeInstalled: boolean;
  libreOfficeCmd: string | null;
  pdfToDocx: boolean;
  pdfToXlsx: boolean;
  officeToPdf: boolean;
  hasDocx2Pdf: boolean;
  missingPackages: string[];
}

let cachedCapabilities: LocalCapabilities | null = null;
let lastCapabilityCheckTime = 0;

async function detectLocalCapabilities(forceRefresh = false): Promise<LocalCapabilities> {
  const now = Date.now();
  if (!forceRefresh && cachedCapabilities && (now - lastCapabilityCheckTime < 3000)) {
    return cachedCapabilities;
  }
  lastCapabilityCheckTime = now;

  const isWin = process.platform === 'win32';
  const checkCmd = isWin ? 'where.exe' : 'which';

  let libreOfficeCmd: string | null = null;
  const officeCandidates = isWin
    ? ['soffice', 'libreoffice', 'C:\\Program Files\\LibreOffice\\program\\soffice.exe']
    : ['soffice', 'libreoffice'];

  for (const cmd of officeCandidates) {
    try {
      if (cmd.includes('\\') || cmd.includes('/')) {
        await fs.access(cmd);
        libreOfficeCmd = cmd;
        break;
      }
      await execFileAsync(checkCmd, [cmd]);
      libreOfficeCmd = cmd;
      break;
    } catch {
      // not found
    }
  }

  let pythonCmd: string | null = null;
  let pythonVersion: string | undefined;
  const pyCandidates = isWin
    ? ['python', 'py', 'C:\\Python314\\python.exe', 'python3']
    : ['python3', 'python'];

  for (const py of pyCandidates) {
    try {
      const verOut = await execFileAsync(py, ['--version']);
      const str = String(verOut.stdout || verOut.stderr || '').trim();
      if (str.toLowerCase().includes('python')) {
        pythonCmd = py;
        pythonVersion = str;
        break;
      }
    } catch {
      // not found
    }
  }

  let hasPdf2Docx = false;
  if (pythonCmd) {
    try {
      await execFileAsync(pythonCmd, ['-c', 'import pdf2docx']);
      hasPdf2Docx = true;
    } catch {
      hasPdf2Docx = false;
    }
  }

  let hasPdfPlumber = false;
  if (pythonCmd) {
    try {
      await execFileAsync(pythonCmd, ['-c', 'import pdfplumber, openpyxl']);
      hasPdfPlumber = true;
    } catch {
      hasPdfPlumber = false;
    }
  }

  let hasDocx2Pdf = false;
  if (pythonCmd) {
    try {
      await execFileAsync(pythonCmd, ['-c', 'import docx2pdf']);
      hasDocx2Pdf = true;
    } catch {
      hasDocx2Pdf = false;
    }
  }

  const missingPackages: string[] = [];
  if (pythonCmd) {
    if (!hasPdf2Docx) missingPackages.push('pdf2docx');
    if (!hasPdfPlumber) {
      missingPackages.push('openpyxl');
      missingPackages.push('pdfplumber');
    }
    if (!hasDocx2Pdf && !libreOfficeCmd) {
      missingPackages.push('docx2pdf');
    }
  }

  cachedCapabilities = {
    pythonInstalled: Boolean(pythonCmd),
    pythonCmd,
    pythonVersion,
    libreOfficeInstalled: Boolean(libreOfficeCmd),
    libreOfficeCmd,
    pdfToDocx: hasPdf2Docx,
    pdfToXlsx: hasPdfPlumber,
    officeToPdf: Boolean(libreOfficeCmd || hasDocx2Pdf),
    hasDocx2Pdf,
    missingPackages,
  };

  return cachedCapabilities;
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // 1. Silent Local Engine Capability Check (under the hood)
  app.get('/api/local-engine/capabilities', async (_req, res) => {
    const currentCaps = await detectLocalCapabilities(true);
    res.json({
      pythonInstalled: currentCaps.pythonInstalled,
      pythonCmd: currentCaps.pythonCmd,
      pythonVersion: currentCaps.pythonVersion,
      libreOfficeInstalled: currentCaps.libreOfficeInstalled,
      pdfToDocx: currentCaps.pdfToDocx,
      pdfToXlsx: currentCaps.pdfToXlsx,
      officeToPdf: currentCaps.officeToPdf,
      hasDocx2Pdf: currentCaps.hasDocx2Pdf,
      hasServerFreeConvertKey: Boolean(process.env.FREECONVERT_API_KEY),
      missingPackages: currentCaps.missingPackages,
    });
  });

  // 1b. Install local Python conversion packages with explicit user consent
  app.post('/api/local-engine/install-packages', express.json(), async (_req, res) => {
    cachedCapabilities = null;
    const currentCaps = await detectLocalCapabilities();
    if (!currentCaps.pythonCmd) {
      return res.status(400).json({ error: 'Python non rilevato su questo PC. Installa Python per abilitare il motore locale.' });
    }
    try {
      await execFileAsync(
        currentCaps.pythonCmd,
        ['-m', 'pip', 'install', 'pdf2docx', 'openpyxl', 'pdfplumber', 'docx2pdf'],
        { timeout: 300000 }
      );
      cachedCapabilities = null;
      const updatedCaps = await detectLocalCapabilities();
      return res.json({
        success: true,
        capabilities: {
          pythonInstalled: updatedCaps.pythonInstalled,
          pythonCmd: updatedCaps.pythonCmd,
          pythonVersion: updatedCaps.pythonVersion,
          libreOfficeInstalled: updatedCaps.libreOfficeInstalled,
          pdfToDocx: updatedCaps.pdfToDocx,
          pdfToXlsx: updatedCaps.pdfToXlsx,
          officeToPdf: updatedCaps.officeToPdf,
          hasDocx2Pdf: updatedCaps.hasDocx2Pdf,
          hasServerFreeConvertKey: Boolean(process.env.FREECONVERT_API_KEY),
          missingPackages: updatedCaps.missingPackages,
        },
      });
    } catch (err: any) {
      console.error('Errore installazione pacchetti locali:', err);
      return res.status(500).json({ error: err?.message || 'Errore durante l\'installazione dei pacchetti.' });
    }
  });

  // 2. Under-the-hood High-Fidelity Local Python / LibreOffice Conversion
  app.post(
    '/api/local-engine/convert',
    express.raw({ type: '*/*', limit: '100mb' }),
    async (req, res) => {
      const rawFilename = String(req.headers['x-filename'] || 'document.bin');
      const targetFormat = String(req.headers['x-target-format'] || 'pdf').toLowerCase();
      const safeName = path.basename(rawFilename).replace(/[^a-zA-Z0-9._-]/g, '_');

      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: 'File vuoto o non valido.' });
      }

      const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'librepdf-'));
      const inputPath = path.join(workDir, safeName);
      const baseName = safeName.replace(/\.[^.]+$/, '');

      try {
        await fs.writeFile(inputPath, req.body);
        const activeCaps = await detectLocalCapabilities(true);

        if (targetFormat === 'docx' && safeName.toLowerCase().endsWith('.pdf')) {
          if (!activeCaps.pdfToDocx) {
            return res.status(501).json({ error: 'Motore locale pdf2docx non disponibile su questo host.' });
          }
          const outputPath = path.join(workDir, `${baseName}.docx`);
          const pyCode = [
            'import sys',
            'from pdf2docx import Converter',
            'cv = Converter(sys.argv[1])',
            'cv.convert(sys.argv[2], start=0, end=None)',
            'cv.close()',
          ].join('\n');

          await execFileAsync(activeCaps.pythonCmd || 'python', ['-c', pyCode, inputPath, outputPath], {
            timeout: 120000,
          });

          const outBuf = await fs.readFile(outputPath);
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          res.setHeader('Content-Disposition', `attachment; filename="${baseName}.docx"`);
          return res.send(outBuf);
        }

        if (targetFormat === 'xlsx' && safeName.toLowerCase().endsWith('.pdf')) {
          if (!activeCaps.pdfToXlsx) {
            return res.status(501).json({ error: 'Motore locale pdfplumber & openpyxl non disponibile su questo host.' });
          }
          const outputPath = path.join(workDir, `${baseName}.xlsx`);
          const pyCode = [
            'import sys, pdfplumber',
            'from openpyxl import Workbook',
            'wb = Workbook()',
            'if wb.active:',
            '    wb.remove(wb.active)',
            'with pdfplumber.open(sys.argv[1]) as pdf:',
            '    for i, page in enumerate(pdf.pages, 1):',
            '        tables = page.extract_tables() or []',
            '        if tables:',
            '            for t_i, tbl in enumerate(tables, 1):',
            '                ws = wb.create_sheet(title=f"Pag_{i}_Tab_{t_i}"[:31])',
            '                for row in tbl:',
            '                    ws.append([c if c is not None else "" for c in row])',
            '        else:',
            '            txt = page.extract_text()',
            '            if txt and txt.strip():',
            '                ws = wb.create_sheet(title=f"Pagina_{i}"[:31])',
            '                for line in txt.splitlines():',
            '                    ws.append([line])',
            'if not wb.sheetnames:',
            '    ws = wb.create_sheet(title="Foglio1")',
            '    ws.append(["Nessun contenuto estraibile dal PDF"])',
            'wb.save(sys.argv[2])',
          ].join('\n');

          await execFileAsync(activeCaps.pythonCmd || 'python', ['-c', pyCode, inputPath, outputPath], {
            timeout: 120000,
          });

          const outBuf = await fs.readFile(outputPath);
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', `attachment; filename="${baseName}.xlsx"`);
          return res.send(outBuf);
        }

        if (targetFormat === 'pdf') {
          if (activeCaps.libreOfficeCmd) {
            await execFileAsync(
              activeCaps.libreOfficeCmd,
              ['--headless', '--convert-to', 'pdf', '--outdir', workDir, inputPath],
              { timeout: 120000 }
            );
            const outputPath = path.join(workDir, `${baseName}.pdf`);
            const outBuf = await fs.readFile(outputPath);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${baseName}.pdf"`);
            return res.send(outBuf);
          } else if (activeCaps.hasDocx2Pdf && safeName.toLowerCase().endsWith('.docx')) {
            const outputPath = path.join(workDir, `${baseName}.pdf`);
            const pyCode = [
              'import sys',
              'from docx2pdf import convert',
              'convert(sys.argv[1], sys.argv[2])',
            ].join('\n');
            await execFileAsync(activeCaps.pythonCmd || 'python', ['-c', pyCode, inputPath, outputPath], {
              timeout: 120000,
            });
            const outBuf = await fs.readFile(outputPath);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${baseName}.pdf"`);
            return res.send(outBuf);
          } else {
            return res.status(501).json({ error: 'Nessun motore locale (LibreOffice o docx2pdf) disponibile per convertire questo file in PDF.' });
          }
        }

        return res.status(400).json({ error: 'Combinazione formato non supportata dal motore locale.' });
      } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Errore motore di conversione interno.' });
      } finally {
        await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  );

  // 3. FreeConvert REST API Reverse Proxy (works seamlessly in both dev and production)
  app.use('/api/freeconvert', express.raw({ type: '*/*', limit: '50mb' }), async (req, res) => {
    try {
      const targetPath = req.originalUrl.replace(/^\/api\/freeconvert/, '');
      const targetUrl = `https://api.freeconvert.com${targetPath}`;

      const headers: Record<string, string> = {};
      if (req.headers['authorization']) {
        headers['Authorization'] = String(req.headers['authorization']);
      } else if (process.env.FREECONVERT_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.FREECONVERT_API_KEY}`;
      }
      if (req.headers['content-type']) {
        headers['Content-Type'] = String(req.headers['content-type']);
      }
      headers['Accept'] = 'application/json';

      const fetchInit: RequestInit = {
        method: req.method,
        headers,
      };
      if (req.method !== 'GET' && req.method !== 'HEAD' && Buffer.isBuffer(req.body) && req.body.length > 0) {
        fetchInit.body = new Uint8Array(req.body);
      }

      const upstream = await fetch(targetUrl, fetchInit);
      const buf = Buffer.from(await upstream.arrayBuffer());
      const contentType = upstream.headers.get('content-type');
      if (contentType) res.setHeader('Content-Type', contentType);
      return res.status(upstream.status).send(buf);
    } catch (err: any) {
      return res.status(502).json({ error: err?.message || 'Errore proxy FreeConvert.' });
    }
  });

  // 4. Vite Dev Middleware vs Production Static Assets
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve('dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  function listenOnPort(port: number, maxRetries = 10) {
    httpServer.listen(port, '0.0.0.0', () => {
      console.log(`\n🚀 LibrePDF Studio listening on http://localhost:${port} (and http://0.0.0.0:${port})\n`);
    });

    httpServer.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE' && maxRetries > 0) {
        console.warn(`⚠️ Porta ${port} già occupata. Tentativo automatico su porta ${port + 1}...`);
        httpServer.removeAllListeners('error');
        listenOnPort(port + 1, maxRetries - 1);
      } else {
        console.error('Errore listener server:', err);
      }
    });
  }

  listenOnPort(PORT);
}

startServer();
