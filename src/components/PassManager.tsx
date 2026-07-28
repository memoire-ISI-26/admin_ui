import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { ApiResponseWrapper } from '../utils/api';

type PassType = 'internet' | 'illimix' | 'illiflex' | 'international';

interface Palier {
  id?: number;
  nomPalier: string;
  volumeDonneeMo: number;
  minutesAppels: number;
}

interface PassBase {
  id: number;
  nom: string;
  prix: number;
  periode: string;
}

interface PassInternet extends PassBase {
  volumeDonneeMo: number;
}

interface PassIllimix extends PassBase {
  minutesAppels: number;
  volumeDonneeMo: number;
  nbMessages: number;
}

interface PassIlliflex extends PassBase {
  nbMessagesFixe: number;
  paliers: Palier[];
}

interface PassInternational extends PassBase {
  minutesAppels: number;
}

export const PassManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PassType>('internet');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Lists
  const [internetPasses, setInternetPasses] = useState<PassInternet[]>([]);
  const [illimixPasses, setIllimixPasses] = useState<PassIllimix[]>([]);
  const [illiflexPasses, setIlliflexPasses] = useState<PassIlliflex[]>([]);
  const [internationalPasses, setInternationalPasses] = useState<PassInternational[]>([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form Fields
  const [formNom, setFormNom] = useState('');
  const [formPrix, setFormPrix] = useState(0);
  const [formPeriode, setFormPeriode] = useState('JOUR');
  // Internet/Illimix fields
  const [formVolumeData, setFormVolumeData] = useState(0);
  // Illimix fields
  const [formMinutesAppels, setFormMinutesAppels] = useState(0);
  const [formNbMessages, setFormNbMessages] = useState(0);
  // Illiflex fields
  const [formNbMessagesFixe, setFormNbMessagesFixe] = useState(0);
  const [formPaliers, setFormPaliers] = useState<Palier[]>([]);

  const fetchAllData = async () => {
    setLoading(true);
    setError('');
    setErrorMessage('');
    try {
      if (activeTab === 'internet') {
        const res = await api.get<ApiResponseWrapper<PassInternet[]>>('/pricing/pass-internet');
        setInternetPasses(res?.data || []);
      } else if (activeTab === 'illimix') {
        const res = await api.get<ApiResponseWrapper<PassIllimix[]>>('/pricing/pass-illimix');
        setIllimixPasses(res?.data || []);
      } else if (activeTab === 'illiflex') {
        const res = await api.get<ApiResponseWrapper<PassIlliflex[]>>('/pricing/pass-illiflex');
        setIlliflexPasses(res?.data || []);
      } else if (activeTab === 'international') {
        const res = await api.get<ApiResponseWrapper<PassInternational[]>>('/pricing/pass-international');
        setInternationalPasses(res?.data || []);
      }
    } catch (err: any) {
      console.error(`Error fetching ${activeTab} passes`, err);
      setErrorMessage("Ce service est inaccessible ou en cours de maintenance. Veuillez contacter l'administrateur.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [activeTab]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormNom('');
    setFormPrix(0);
    setFormPeriode('JOUR');
    setFormVolumeData(0);
    setFormMinutesAppels(0);
    setFormNbMessages(0);
    setFormNbMessagesFixe(0);
    setFormPaliers([]);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (pass: any) => {
    setEditingId(pass.id);
    setFormNom(pass.nom);
    setFormPrix(pass.prix);
    setFormPeriode(pass.periode);
    setFormVolumeData(pass.volumeDonneeMo || 0);
    setFormMinutesAppels(pass.minutesAppels || 0);
    setFormNbMessages(pass.nbMessages || 0);
    setFormNbMessagesFixe(pass.nbMessagesFixe || 0);
    setFormPaliers(pass.paliers ? [...pass.paliers] : []);
    setError('');
    setShowModal(true);
  };

  const addPalierToForm = () => {
    setFormPaliers([...formPaliers, { nomPalier: `Palier ${formPaliers.length + 1}`, volumeDonneeMo: 1000, minutesAppels: 60 }]);
  };

  const removePalierFromForm = (idx: number) => {
    setFormPaliers(formPaliers.filter((_, i) => i !== idx));
  };

  const updatePalierField = (idx: number, field: keyof Palier, value: any) => {
    const updated = formPaliers.map((p, i) => {
      if (i === idx) {
        return { ...p, [field]: value };
      }
      return p;
    });
    setFormPaliers(updated);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce Pass du catalogue ?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      await api.delete(`/pricing/pass-${activeTab}/${id}`);
      setSuccessMsg('Pass supprimé avec succès.');
      fetchAllData();
    } catch (err: any) {
      console.error('API error deleting pass', err);
      setError(err.message || 'Impossible de supprimer ce pass. Le microservice est peut-être injoignable.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!formNom.trim() || formPrix <= 0) {
      setError('Veuillez renseigner un nom valide et un prix supérieur à 0.');
      return;
    }

    setLoading(true);

    // Prepare Request Body
    let body: any = {
      nom: formNom,
      prix: formPrix,
      periode: formPeriode
    };

    if (activeTab === 'internet') {
      body.volumeData = formVolumeData; // Note: DTO expects volumeData or volumeDonneeMo
      body.volumeDonneeMo = formVolumeData; // Set both to be safe
    } else if (activeTab === 'illimix') {
      body.volumeDonneeMo = formVolumeData;
      body.minutesAppels = formMinutesAppels;
      body.nbMessages = formNbMessages;
    } else if (activeTab === 'illiflex') {
      body.nbMessagesFixe = formNbMessagesFixe;
      body.paliers = formPaliers;
    } else if (activeTab === 'international') {
      body.minutesAppels = formMinutesAppels;
    }

    try {
      if (editingId) {
        await api.put(`/pricing/pass-${activeTab}/${editingId}`, body);
        setSuccessMsg('Pass modifié avec succès.');
      } else {
        await api.post(`/pricing/pass-${activeTab}`, body);
        setSuccessMsg('Pass créé avec succès.');
      }
      setShowModal(false);
      fetchAllData();
    } catch (err: any) {
      console.error('API submission failed', err);
      setError(err.message || "Impossible d'enregistrer le pass. Le microservice est peut-être injoignable.");
    } finally {
      setLoading(false);
    }
  };

  if (errorMessage) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', maxWidth: '600px', margin: '40px auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', fontSize: '2rem' }}>
          ⚠️
        </div>
        <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Service en Maintenance</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
          {errorMessage}
        </p>
        <button className="btn btn-primary" onClick={fetchAllData} style={{ marginTop: '10px' }}>
          Réessayer la connexion
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '1.8rem', color: 'var(--text-main)' }}>
            Catalogue de Offres
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Gérez la tarification des pass télécoms (Internet, Illimix, Illiflex) proposés aux abonnés.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Créer un Offre / Pass
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'internet' ? 'active' : ''}`}
          onClick={() => setActiveTab('internet')}
        >
          Pass Internet
        </button>
        <button
          className={`tab-btn ${activeTab === 'illimix' ? 'active' : ''}`}
          onClick={() => setActiveTab('illimix')}
        >
          Pass Illimix
        </button>
        <button
          className={`tab-btn ${activeTab === 'illiflex' ? 'active' : ''}`}
          onClick={() => setActiveTab('illiflex')}
        >
          Pass Illiflex
        </button>
        <button
          className={`tab-btn ${activeTab === 'international' ? 'active' : ''}`}
          onClick={() => setActiveTab('international')}
        >
          Pass International
        </button>
      </div>

      {/* Table Section */}
      <div className="card-table-container">
        <div className="card-header">
          <span className="card-header-title">
            Pass {activeTab.toUpperCase()} ({
              activeTab === 'internet' ? internetPasses.length :
              activeTab === 'illimix' ? illimixPasses.length :
              activeTab === 'illiflex' ? illiflexPasses.length :
              internationalPasses.length
            })
          </span>
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={fetchAllData}>
            Actualiser
          </button>
        </div>
        <div className="table-responsive">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="3" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
              </svg>
            </div>
          ) : (
            <table className="custom-table">
              {activeTab === 'internet' && (
                <>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nom</th>
                      <th>Prix</th>
                      <th>Volume Données</th>
                      <th>Période</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {internetPasses.map((p) => (
                      <tr key={p.id}>
                        <td><code>#{p.id}</code></td>
                        <td><span style={{ fontWeight: 600 }}>{p.nom}</span></td>
                        <td><span style={{ color: 'var(--orange)', fontWeight: 600 }}>{p.prix} FCFA</span></td>
                        <td>{p.volumeDonneeMo >= 1000 ? `${p.volumeDonneeMo / 1000} Go` : `${p.volumeDonneeMo} Mo`}</td>
                        <td><span className="badge badge-orange">{p.periode}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="btn-icon-only edit" onClick={() => openEditModal(p)}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                            <button className="btn-icon-only danger" onClick={() => handleDelete(p.id)}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'illimix' && (
                <>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nom</th>
                      <th>Prix</th>
                      <th>Data</th>
                      <th>Minutes Appels</th>
                      <th>SMS</th>
                      <th>Période</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {illimixPasses.map((p) => (
                      <tr key={p.id}>
                        <td><code>#{p.id}</code></td>
                        <td><span style={{ fontWeight: 600 }}>{p.nom}</span></td>
                        <td><span style={{ color: 'var(--orange)', fontWeight: 600 }}>{p.prix} FCFA</span></td>
                        <td>{p.volumeDonneeMo >= 1000 ? `${p.volumeDonneeMo / 1000} Go` : `${p.volumeDonneeMo} Mo`}</td>
                        <td>{p.minutesAppels} min</td>
                        <td>{p.nbMessages} SMS</td>
                        <td><span className="badge badge-success">{p.periode}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="btn-icon-only edit" onClick={() => openEditModal(p)}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                            <button className="btn-icon-only danger" onClick={() => handleDelete(p.id)}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'illiflex' && (
                <>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nom</th>
                      <th>Prix de Base</th>
                      <th>Messages Fixes</th>
                      <th>Période</th>
                      <th>Paliers Inclus</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {illiflexPasses.map((p) => (
                      <tr key={p.id}>
                        <td><code>#{p.id}</code></td>
                        <td><span style={{ fontWeight: 600 }}>{p.nom}</span></td>
                        <td><span style={{ color: 'var(--orange)', fontWeight: 600 }}>{p.prix} FCFA</span></td>
                        <td>{p.nbMessagesFixe} SMS</td>
                        <td><span className="badge badge-info">{p.periode}</span></td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {p.paliers && p.paliers.map((pal, index) => (
                              <div key={index} style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                • <strong style={{ color: 'var(--text-main)' }}>{pal.nomPalier}</strong> : {pal.volumeDonneeMo >= 1000 ? `${pal.volumeDonneeMo / 1000} Go` : `${pal.volumeDonneeMo} Mo`} + {pal.minutesAppels} min
                              </div>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button className="btn-icon-only edit" onClick={() => openEditModal(p)}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                            <button className="btn-icon-only danger" onClick={() => handleDelete(p.id)}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'international' && (
                <>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nom</th>
                      <th>Prix</th>
                      <th>Minutes Appels</th>
                      <th>Période</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {internationalPasses.map((p) => (
                      <tr key={p.id}>
                        <td><code>#{p.id}</code></td>
                        <td><span style={{ fontWeight: 600 }}>{p.nom}</span></td>
                        <td><span style={{ color: 'var(--orange)', fontWeight: 600 }}>{p.prix} FCFA</span></td>
                        <td>{p.minutesAppels} min</td>
                        <td><span className="badge badge-orange">{p.periode}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="btn-icon-only edit" onClick={() => openEditModal(p)}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                            <button className="btn-icon-only danger" onClick={() => handleDelete(p.id)}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          )}
        </div>
      </div>

      {/* Dynamic Creation / Editing Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingId ? 'Modifier l\'offre' : 'Ajouter une nouvelle offre'} ({activeTab.toUpperCase()})
              </h3>
              <button className="btn-icon-only" onClick={() => setShowModal(false)}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && (
                  <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
                    <span>{error}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Nom du Pass</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ex: Pass Semaine 5Go"
                    value={formNom}
                    onChange={(e) => setFormNom(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Prix (FCFA)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formPrix}
                      onChange={(e) => setFormPrix(Number(e.target.value))}
                      required
                      min="50"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Période de Validité</label>
                    <select
                      className="form-control"
                      value={formPeriode}
                      onChange={(e) => setFormPeriode(e.target.value)}
                    >
                      <option value="JOUR">JOUR</option>
                      <option value="NUIT">NUIT</option>
                      <option value="SEMAINE">SEMAINE</option>
                      <option value="MOIS">MOIS</option>
                    </select>
                  </div>
                </div>

                {/* Conditional Fields based on Active Tab */}
                {activeTab === 'internet' && (
                  <div className="form-group">
                    <label className="form-label">Volume de données (Mo)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formVolumeData}
                      onChange={(e) => setFormVolumeData(Number(e.target.value))}
                      required
                      min="10"
                    />
                  </div>
                )}

                {activeTab === 'international' && (
                  <div className="form-group">
                    <label className="form-label">Minutes d'appels International</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formMinutesAppels}
                      onChange={(e) => setFormMinutesAppels(Number(e.target.value))}
                      required
                      min="1"
                    />
                  </div>
                )}

                {activeTab === 'illimix' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Volume de données (Mo)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formVolumeData}
                        onChange={(e) => setFormVolumeData(Number(e.target.value))}
                        required
                        min="0"
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group">
                        <label className="form-label">Volume d'appels (Minutes)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formMinutesAppels}
                          onChange={(e) => setFormMinutesAppels(Number(e.target.value))}
                          required
                          min="0"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Nombre de SMS</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formNbMessages}
                          onChange={(e) => setFormNbMessages(Number(e.target.value))}
                          required
                          min="0"
                        />
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'illiflex' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Nombre de SMS inclus</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formNbMessagesFixe}
                        onChange={(e) => setFormNbMessagesFixe(Number(e.target.value))}
                        required
                        min="0"
                      />
                    </div>

                    {/* Sub-form list of Paliers */}
                    <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>Paliers personnalisables</span>
                        <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={addPalierToForm}>
                          + Ajouter un palier
                        </button>
                      </div>

                      {formPaliers.length === 0 ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px', border: '1px dashed var(--border)', borderRadius: '4px' }}>
                          Aucun palier défini. L'utilisateur ne pourra pas configurer d'options modulables.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {formPaliers.map((pal, pIdx) => (
                            <div key={pIdx} style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '12px', position: 'relative' }}>
                              <button 
                                type="button" 
                                style={{ position: 'absolute', top: '8px', right: '8px', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem' }}
                                onClick={() => removePalierFromForm(pIdx)}
                              >
                                Retirer
                              </button>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginBottom: '8px' }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Nom du Palier</label>
                                  <input 
                                    type="text" 
                                    className="form-control" 
                                    style={{ padding: '6px 10px', fontSize: '0.85rem' }} 
                                    value={pal.nomPalier}
                                    onChange={(e) => updatePalierField(pIdx, 'nomPalier', e.target.value)}
                                    required
                                  />
                                </div>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Data (Mo)</label>
                                  <input 
                                    type="number" 
                                    className="form-control" 
                                    style={{ padding: '6px 10px', fontSize: '0.85rem' }} 
                                    value={pal.volumeDonneeMo}
                                    onChange={(e) => updatePalierField(pIdx, 'volumeDonneeMo', Number(e.target.value))}
                                    required
                                    min="0"
                                  />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Appel (Minutes)</label>
                                  <input 
                                    type="number" 
                                    className="form-control" 
                                    style={{ padding: '6px 10px', fontSize: '0.85rem' }} 
                                    value={pal.minutesAppels}
                                    onChange={(e) => updatePalierField(pIdx, 'minutesAppels', Number(e.target.value))}
                                    required
                                    min="0"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={loading}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Traitement...' : editingId ? 'Enregistrer les modifications' : 'Créer l\'offre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
