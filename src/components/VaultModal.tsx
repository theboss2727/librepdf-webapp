import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  HardDrive,
  Cloud,
  Download,
  Trash2,
  Upload,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Database,
} from 'lucide-react';
import {
  getAllVaultItems,
  deleteVaultItem,
  clearVault,
  exportVaultArchive,
  importVaultArchive,
  getCloudSyncSettings,
  saveCloudSyncSettings,
} from '../services/storageVault';
import type { ProcessedItem, CloudSyncSettings } from '../types/pdf';

interface VaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemUpdated: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const VaultModal: React.FC<VaultModalProps> = ({
  isOpen,
  onClose,
  onItemUpdated,
}) => {
  const [items, setItems] = useState<ProcessedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'documents' | 'cloud-settings'>('documents');
  const [settings, setSettings] = useState<CloudSyncSettings>(getCloudSyncSettings());
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await getAllVaultItems();
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadItems();
      setSettings(getCloudSyncSettings());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalVaultBytes = items.reduce((acc, it) => acc + (it.resultSize || 0), 0);

  const handleDelete = async (id: string) => {
    await deleteVaultItem(id);
    await loadItems();
    onItemUpdated();
  };

  const handleClearAll = async () => {
    if (confirm('Sei sicuro di voler svuotare tutti i documenti salvati nel vault locale?')) {
      await clearVault();
      await loadItems();
      onItemUpdated();
    }
  };

  const handleDownloadItem = (item: ProcessedItem) => {
    if (!item.dataBlob) return;
    const url = URL.createObjectURL(item.dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportBackup = async () => {
    const backupBlob = await exportVaultArchive();
    const url = URL.createObjectURL(backupBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LibrePDF_Vault_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg('Backup crittografato esportato con successo');
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const count = await importVaultArchive(file);
      await loadItems();
      onItemUpdated();
      setStatusMsg(`${count} documenti ripristinati con successo`);
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (err: any) {
      alert(`Errore nel ripristino del backup: ${err.message}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleSaveSettings = (newSettings: CloudSyncSettings) => {
    setSettings(newSettings);
    saveCloudSyncSettings(newSettings);
    setStatusMsg('Impostazioni sincronizzazione aggiornate');
    setTimeout(() => setStatusMsg(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-slate-800 border border-rose-200 dark:border-slate-700 flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Archivio Locale & Sincronizzazione Cloud
                </h3>
                <span className="font-mono text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  {settings.enabled ? 'WebDAV / Cloud Attivo' : 'IndexedDB Sandbox'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Spazio occupato: <strong className="font-mono text-slate-800 dark:text-slate-200">{formatBytes(totalVaultBytes)}</strong> · {items.length} file archiviati
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-100/70 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeTab === 'documents'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Documenti Salvati ({items.length})
            </button>
            <button
              onClick={() => setActiveTab('cloud-settings')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeTab === 'cloud-settings'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Configurazione Backup & Cloud
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBackup}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium transition cursor-pointer text-xs hover:border-zinc-300 dark:hover:border-zinc-600"
              title="Esporta archivio in formato JSON/Blob"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Esporta Backup</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium transition cursor-pointer text-xs hover:border-zinc-300 dark:hover:border-zinc-600"
              title="Ripristina da un file di backup precedente"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Ripristina</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        </div>

        {statusMsg && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {/* Privacy & Storage Explanatory Box */}
          <div className="p-3.5 rounded-xl bg-zinc-950 text-white text-xs space-y-1.5 shadow-xs border border-zinc-800">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Architettura di Riservatezza & Isolamento Multi-Utente:</span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              Questo archivio risiede esclusivamente nel database sandbox <strong>IndexedDB del tuo browser</strong>. 
              Anche se l'applicazione web viene consultata contemporaneamente da centinaia di colleghi, <strong>nessun altro utente può visualizzare, intercettare o accedere ai tuoi file</strong>. 
              I dati non vengono inoltrati ad alcun server: ogni utente opera in un dominio di memoria separato al 100%.
            </p>
          </div>

          {activeTab === 'documents' ? (
            <div>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                  <RefreshCw className="w-6 h-6 animate-spin mb-2" />
                  <p className="text-xs">Caricamento archivio locale...</p>
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-12 text-zinc-400">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 text-zinc-500" />
                  <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                    Nessun documento nel vault locale
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                    I file elaborati con successo su questo dispositivo verranno conservati qui in totale riservatezza per essere scaricati di nuovo.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                    <span>Cronologia elaborazioni su questo browser:</span>
                    <button
                      onClick={handleClearAll}
                      className="text-rose-500 hover:text-rose-600 font-medium cursor-pointer"
                    >
                      Svuota archivio
                    </button>
                  </div>

                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700/60">
                            <FileText className="w-4 h-4 text-rose-500" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                              {item.name}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">
                              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                {formatBytes(item.resultSize)}
                              </span>
                              <span>·</span>
                              <span>
                                {new Date(item.date).toLocaleDateString('it-IT', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              <span>·</span>
                              <span className="capitalize text-[10px] text-zinc-500">
                                {item.toolId}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleDownloadItem(item)}
                            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                            title="Scarica di nuovo"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Scarica</span>
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 transition cursor-pointer"
                            title="Elimina"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 text-xs text-zinc-700 dark:text-zinc-300 max-w-xl">
              {/* Cloud Sync Toggle */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Cloud className="w-4 h-4 text-blue-500" />
                      Sincronizzazione Cloud Opzionale
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Abilita il backup automatico dei documenti su storage remoto per accedere da altri dispositivi.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enabled}
                      onChange={(e) =>
                        handleSaveSettings({
                          ...settings,
                          enabled: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-zinc-100 dark:peer-checked:after:border-zinc-900"></div>
                  </label>
                </div>

                {settings.enabled && (
                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-3 animate-in fade-in">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Metodo di Sincronizzazione:
                      </label>
                      <select
                        value={settings.provider}
                        onChange={(e) =>
                          handleSaveSettings({
                            ...settings,
                            provider: e.target.value as any,
                          })
                        }
                        className="w-full text-xs p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                      >
                        <option value="local-vault">
                          Archivio Locale Sicuro + Backup Manuale (Consigliato per Privacy)
                        </option>
                        <option value="custom-webdav">
                          Server Cloud Privato WebDAV / Nextcloud
                        </option>
                        <option value="google-drive-sync">
                          Archiviazione Cloud Integrata
                        </option>
                      </select>
                    </div>

                    {settings.provider === 'custom-webdav' && (
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          Endpoint URL WebDAV:
                        </label>
                        <input
                          type="text"
                          placeholder="https://mio-cloud-nextcloud.com/remote.php/dav/files/..."
                          value={settings.remoteUrl || ''}
                          onChange={(e) =>
                            handleSaveSettings({
                              ...settings,
                              remoteUrl: e.target.value,
                            })
                          }
                          className="w-full text-xs p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Privacy Guarantee Note */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                      Garanzia di Riservatezza & Conformità GDPR
                    </h5>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                      LibrePDF Studio è concepito secondo il principio architetturale <strong>Local-First</strong>.
                      Tutti i documenti rimangono confinati nella sandbox IndexedDB del tuo client.
                      Quando la sincronizzazione cloud è disattivata, nessun byte transita mai su reti esterne.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
