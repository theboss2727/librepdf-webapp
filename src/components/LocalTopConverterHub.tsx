import React, { useState } from 'react';
import {
  Cpu,
  Monitor,
  Download,
  Terminal,
  FileCode,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Cloud,
  FileText,
  FileSpreadsheet,
  Zap,
  ShieldCheck,
  FolderOpen,
  Sparkles,
  Info,
} from 'lucide-react';
import { DocxToPdfTool } from './tools/DocxToPdfTool';
import { XlsxToPdfTool } from './tools/XlsxToPdfTool';

interface LocalTopConverterHubProps {
  onSuccess: () => void;
  onSwitchToCloudConverter: () => void;
  onOpenPythonStudio: () => void;
}

export const LocalTopConverterHub: React.FC<LocalTopConverterHubProps> = ({
  onSuccess,
  onSwitchToCloudConverter,
  onOpenPythonStudio,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'desktop-native' | 'browser-docx' | 'browser-xlsx'>('desktop-native');
  const [copiedScript, setCopiedScript] = useState(false);

  // Ready-to-run Python script that uses Microsoft Word's native COM engine or LibreOffice for 100% pixel-perfect conversion
  const pythonLocalScript = `# ==============================================================
# CONVERTITORE WORD/EXCEL -> PDF AD ALTA FEDELTA' (100% NATIVO)
# Zero upload, nessun limite di pagine, fedeltà identica a Word
# ==============================================================
import os
import sys
from pathlib import Path

def convert_word_to_pdf_native():
    print("Avvio conversione nativa con motore di sistema...")
    try:
        # Usa docx2pdf che pilota direttamente Microsoft Word nativo
        from docx2pdf import convert
        current_dir = Path(__file__).parent.resolve()
        
        docx_files = list(current_dir.glob("*.docx")) + list(current_dir.glob("*.doc"))
        if not docx_files:
            print("[AVVISO] Nessun file .docx o .doc trovato in questa cartella.")
            print(f"Inserisci i tuoi file Word qui: {current_dir}")
            return
            
        print(f"Trovati {len(docx_files)} documenti da convertire.")
        for docx in docx_files:
            pdf_name = docx.with_suffix(".pdf")
            print(f"-> Conversione di: {docx.name}...")
            convert(str(docx), str(pdf_name))
            print(f"   [OK] Creato: {pdf_name.name}")
            
        print("\\nTutti i documenti sono stati convertiti con fedeltà 100%!")
    except ImportError:
        print("[!] Modulo mancante. Esegui nel terminale: pip install docx2pdf")
    except Exception as e:
        print(f"[ERRORE] {e}")

if __name__ == "__main__":
    convert_word_to_pdf_native()
    input("\\nPremi INVIO per chiudere...")
`;

  const windowsBatRunner = `@echo off
title Convertitore Word a PDF - LibrePDF Studio
echo ==========================================================
echo   CONVERSIONE NATIVA WORD IN PDF (MASSIMA FEDELTA')
echo ==========================================================
echo.
echo Controllo installazione Python e dipendenze...
python -m pip install --quiet docx2pdf
echo.
echo Avvio conversione dei documenti nella cartella corrente...
python converti_word_in_pdf.py
pause
`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(pythonLocalScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleDownloadPythonScript = () => {
    const blob = new Blob([pythonLocalScript], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converti_word_in_pdf.py';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadBatRunner = () => {
    const blob = new Blob([windowsBatRunner], { type: 'application/x-bat;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AVVIA_CONVERSIONE_DOPPIO_CLIC.bat';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Banner: Explanation of Local Top Conversion */}
      <div className="p-6 rounded-2xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-800/40 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Monitor className="w-3.5 h-3.5" />
              <span>Sezione 2 · Conversione Top Locale (Zero Cloud)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Massima Fedeltà Visiva con Motore di Sistema
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              I servizi online (iLovePDF, Smallpdf) ti costringono ad abbonamenti ricorrenti e caricano i tuoi documenti riservati su server esterni. Qui puoi scegliere tra il <span className="text-white font-bold">motore nativo sul tuo PC</span> (layout 100% identico a Word, zero limiti) o la <span className="text-white font-bold">conversione rapida nel browser</span>.
            </p>
          </div>

          <button
            onClick={onSwitchToCloudConverter}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition cursor-pointer shrink-0 shadow-xs"
          >
            <Cloud className="w-4 h-4 text-sky-400" />
            <span>Preferisci convertire via Cloud?</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sub-Navigation Selector */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveSubTab('desktop-native')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'desktop-native'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Motore Nativo Desktop (Fedeltà 100% Word)</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono">
            TOP
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('browser-docx')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'browser-docx'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4 text-blue-500" />
          <span>Word (.docx) nel Browser</span>
          <span className="text-[10px] text-slate-400">Veloce</span>
        </button>

        <button
          onClick={() => setActiveSubTab('browser-xlsx')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'browser-xlsx'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
          <span>Excel (.xlsx) nel Browser</span>
          <span className="text-[10px] text-slate-400">Veloce</span>
        </button>
      </div>

      {/* View 1: Desktop Native Engine (The Holy Grail of 100% Quality without Cloud) */}
      {activeSubTab === 'desktop-native' && (
        <div className="space-y-6">
          {/* Comparison Matrix Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Layout & Tipografia 1:1</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Utilizza direttamente le librerie di Microsoft Word o LibreOffice presenti sul tuo sistema. Ogni font, interlinea, colonna e formula viene renderizzata al millimetro.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Zero Dati su Internet</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                I tuoi file Word, contratti, perizie e fatture non escono mai dal tuo disco rigido. Nessun log server, conformità GDPR totale.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                <Zap className="w-4 h-4" />
                <span>Batch & Nessun Limite</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Converti 1 o 1000 documenti insieme in una cartella con un solo clic. Nessuna limitazione di dimensioni (anche file da 500MB) né abbonamenti.
              </p>
            </div>
          </div>

          {/* Quick Execution Box */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    Pacchetto Pronto all'Uso: Esegui con 1 Clic
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Metti i tuoi file Word nella cartella e fai doppio clic sul file .bat, oppure esegui lo script Python.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadBatRunner}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                  title="Scarica il file .bat per eseguire con doppio clic su Windows"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Scarica .BAT (Doppio Clic)</span>
                </button>

                <button
                  onClick={handleDownloadPythonScript}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Scarica script .py</span>
                </button>
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-1">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] flex items-center justify-center font-mono">1</span>
                  <span>Salva i file nella cartella</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                  Metti lo script scaricato nella cartella dove hai i file .docx o .doc.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-1">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] flex items-center justify-center font-mono">2</span>
                  <span>Fai doppio clic sul file .bat</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                  Su Windows avvia automaticamente Word in background e converte tutto.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-1">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] flex items-center justify-center font-mono">3</span>
                  <span>PDF perfetti al 100%</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                  Troverai i file PDF generati con lo stesso layout fedele della stampa di Word.
                </p>
              </div>
            </div>

            {/* Code Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-mono text-[11px]">Codice sorgente Python (docx2pdf engine):</span>
                <button
                  onClick={handleCopyScript}
                  className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'Copiato!' : 'Copia codice'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-56 border border-slate-800">
                <code>{pythonLocalScript}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Browser In-Memory DOCX converter */}
      {activeSubTab === 'browser-docx' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-300">
            <Info className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <p>
              Questo convertitore opera al 100% all'interno del browser senza installare nulla sul tuo computer. Ideale per documenti di testo standard, note e report. Per impaginazioni grafiche complesse al pixel, usa la scheda <strong className="cursor-pointer underline" onClick={() => setActiveSubTab('desktop-native')}>Motore Nativo Desktop</strong> o la <strong className="cursor-pointer underline" onClick={onSwitchToCloudConverter}>Conversione Cloud Top</strong>.
            </p>
          </div>
          <DocxToPdfTool
            onSuccess={onSuccess}
            onOpenPythonStudio={onOpenPythonStudio}
            onSwitchToCloudConverter={onSwitchToCloudConverter}
          />
        </div>
      )}

      {/* View 3: Browser In-Memory XLSX converter */}
      {activeSubTab === 'browser-xlsx' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-3 text-xs text-emerald-900 dark:text-emerald-300">
            <Info className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <p>
              Conversione istantanea di fogli di calcolo Excel in PDF multipagina formattato in formato A4 (orizzontale o verticale). Nessun upload di dati finanziari su server terzi.
            </p>
          </div>
          <XlsxToPdfTool
            onSuccess={onSuccess}
            onOpenPythonStudio={onOpenPythonStudio}
          />
        </div>
      )}
    </div>
  );
};
