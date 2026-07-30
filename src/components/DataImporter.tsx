import React, { useState } from 'react';
import { api } from '../utils/api';

interface ImportRecord {
  msisdn: string;
  univers?: string;
  liste_de_services?: string[];
  mode?: string;
  last_date?: string;
  date?: string;
}

export const DataImporter: React.FC = () => {
  const [fileName, setFileName] = useState<string>('');
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [defaultPassword, setDefaultPassword] = useState<string>('1234');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [results, setResults] = useState<{ success: number; existed: number; failed: number }>({ success: 0, existed: 0, failed: 0 });
  const [logs, setLogs] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState<boolean>(false);

  const addLog = (message: string) => {
    setLogs((prev) => [message, ...prev].slice(0, 100)); // Limit to last 100 logs
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseContent(content, file.name);
    };
    reader.readAsText(file);
  };

  const parseContent = (content: string, name: string) => {
    try {
      const parsedRecords: ImportRecord[] = [];
      const extension = name.split('.').pop()?.toLowerCase();

      if (extension === 'csv') {
        // Parse CSV
        const lines = content.split('\n');
        if (lines.length > 0) {
          const headers = lines[0].split(/[;,]/).map(h => h.trim().toLowerCase());
          const msisdnIndex = headers.indexOf('msisdn');
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const cols = line.split(/[;,]/);
            const msisdnVal = msisdnIndex !== -1 ? cols[msisdnIndex]?.trim() : cols[0]?.trim();
            if (msisdnVal) {
              parsedRecords.push({ msisdn: msisdnVal });
            }
          }
        }
      } else {
        // Parse JSON or JSON Lines (JSONL)
        try {
          // Attempt standard JSON array
          const data = JSON.parse(content);
          if (Array.isArray(data)) {
            data.forEach((item: any) => {
              if (item.msisdn) {
                parsedRecords.push({
                  msisdn: String(item.msisdn),
                  univers: item.univers,
                  liste_de_services: item.liste_de_services,
                  mode: item.mode,
                  last_date: item.last_date,
                  date: item.date
                });
              }
            });
          } else if (data.msisdn) {
            parsedRecords.push({ msisdn: String(data.msisdn) });
          }
        } catch {
          // Attempt JSON Lines (Spark JSON output, one JSON object per line)
          const lines = content.split('\n');
          lines.forEach((line) => {
            const trimmed = line.trim();
            if (trimmed) {
              try {
                const item = JSON.parse(trimmed);
                if (item.msisdn) {
                  parsedRecords.push({
                    msisdn: String(item.msisdn),
                    univers: item.univers,
                    liste_de_services: item.liste_de_services,
                    mode: item.mode,
                    last_date: item.last_date,
                    date: item.date
                  });
                }
              } catch {
                // Ignore invalid lines
              }
            }
          });
        }
      }

      // Filter duplicates in the uploaded file
      const uniqueRecordsMap = new Map<string, ImportRecord>();
      parsedRecords.forEach(r => uniqueRecordsMap.set(r.msisdn, r));
      const uniqueRecords = Array.from(uniqueRecordsMap.values());

      setRecords(uniqueRecords);
      addLog(`Fichier analysé avec succès : ${uniqueRecords.length} numéros MSISDN uniques trouvés.`);
    } catch (err: any) {
      addLog(`Erreur de lecture du fichier : ${err.message}`);
    }
  };

  const startImport = async () => {
    if (records.length === 0) return;
    setIsImporting(true);
    setProgress({ current: 0, total: records.length });
    setResults({ success: 0, existed: 0, failed: 0 });
    setLogs([]);

    addLog(`Démarrage de l'importation de ${records.length} abonnés...`);

    let successCount = 0;
    let existedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      setProgress({ current: i + 1, total: records.length });

      try {
        const day = Math.floor(Math.random() * 28) + 1;
        const month = Math.floor(Math.random() * 12) + 1;
        const year = Math.floor(Math.random() * (2010 - 1960 + 1)) + 1960;
        const dayStr = day < 10 ? `0${day}` : `${day}`;
        const monthStr = month < 10 ? `0${month}` : `${month}`;
        const randomBirthdate = `${dayStr}/${monthStr}/${year}`;

        const payload = {
          firstName: 'Abonné',
          lastName: record.msisdn.substring(0, Math.min(record.msisdn.length, 6)).toUpperCase(),
          number: record.msisdn,
          password: defaultPassword,
          birthdate: randomBirthdate
        };

        // Call users register endpoint
        await api.post('/users/client/register', payload);
        successCount++;
        addLog(`[SUCCÈS] ${record.msisdn} enregistré.`);
      } catch (err: any) {
        const errorMsg = err.message || '';
        if (errorMsg.includes('déjà utilisé') || errorMsg.includes('déja utilisé') || errorMsg.includes('409') || errorMsg.includes('Conflict')) {
          existedCount++;
          addLog(`[INFO] ${record.msisdn} existe déjà.`);
        } else {
          failedCount++;
          addLog(`[ERREUR] ${record.msisdn} : ${errorMsg}`);
        }
      }

      setResults({ success: successCount, existed: existedCount, failed: failedCount });
      // Minor delay to prevent network throttling
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    setIsImporting(false);
    addLog(`Importation terminée. Succès: ${successCount}, Déjà existants: ${existedCount}, Échecs: ${failedCount}`);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '1.8rem', color: 'var(--text-main)', margin: '0 0 8px 0' }}>
          Importation & Consommation de Données
        </h2>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Importez des fichiers Spark JSON, JSON Lines (HDFS) ou CSV pour inscrire automatiquement les abonnés et consommer leurs profils.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Side: Upload & Action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? 'var(--orange)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '40px 20px',
              textAlign: 'center',
              backgroundColor: dragOver ? 'rgba(255, 121, 0, 0.05)' : 'var(--bg-card)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input 
              type="file" 
              id="file-upload" 
              accept=".json,.jsonl,.csv" 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
            />
            <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>📥</div>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-main)' }}>
              Glissez-déposez votre fichier ici
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
              Supporte les fichiers .json, .csv, et fichiers Spark/HDFS (un objet JSON par ligne)
            </p>
            <button className="btn btn-secondary" style={{ pointerEvents: 'none' }}>
              Parcourir les fichiers
            </button>
            {fileName && (
              <div style={{ marginTop: '16px', fontWeight: 600, color: 'var(--orange)', fontSize: '0.9rem' }}>
                Fichier sélectionné : {fileName}
              </div>
            )}
          </div>

          <div style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-main)', marginTop: 0 }}>
              Paramètres d'importation
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                MOT DE PASSE PAR DÉFAUT DES COMPTES CRÉÉS
              </label>
              <input
                type="text"
                className="form-control"
                style={{ width: '100%', padding: '8px 12px' }}
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                disabled={isImporting}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                Les utilisateurs pourront se connecter sur l'application mobile avec ce mot de passe.
              </span>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '10px' }}
              disabled={isImporting || records.length === 0}
              onClick={startImport}
            >
              {isImporting ? 'Importation en cours...' : `Lancer l'importation (${records.length} abonnés)`}
            </button>
          </div>

          {/* Import Progress Card */}
          {(isImporting || results.success > 0 || results.failed > 0 || results.existed > 0) && (
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-main)', marginTop: 0 }}>
                Rapport de progression
              </h3>

              {isImporting && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Progression</span>
                    <strong>{progress.current} / {progress.total}</strong>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        backgroundColor: 'var(--orange)', 
                        width: `${(progress.current / progress.total) * 100}%`,
                        transition: 'width 0.1s ease'
                      }} 
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', textAlign: 'center' }}>
                <div style={{ padding: '12px', backgroundColor: 'rgba(40, 167, 69, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(40, 167, 69, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>{results.success}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Créés</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: 'rgba(255, 193, 7, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 193, 7, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffc107' }}>{results.existed}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Déjà existants</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: 'rgba(220, 53, 69, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(220, 53, 69, 0.2)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc3545' }}>{results.failed}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Échecs</div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Console Logs & Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', flexGrow: 1, display: 'flex', flexDirection: 'column', height: '535px' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-main)', marginTop: 0 }}>
              Console de Logs d'Importation
            </h3>
            
            <div 
              style={{ 
                flexGrow: 1, 
                backgroundColor: 'rgba(0,0,0,0.2)', 
                borderRadius: 'var(--radius-sm)', 
                padding: '16px', 
                fontFamily: 'monospace', 
                fontSize: '0.8rem', 
                overflowY: 'auto',
                border: '1px solid var(--border)',
                color: '#00ff00',
                maxHeight: '440px'
              }}
            >
              {logs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '100px' }}>
                  Aucun log disponible. Sélectionnez un fichier pour démarrer.
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} style={{ marginBottom: '6px', whiteSpace: 'pre-wrap' }}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
