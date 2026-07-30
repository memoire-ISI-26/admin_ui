import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { ApiResponseWrapper } from '../utils/api';

interface DefaultServicesDto {
  universe: string;
  serviceId1: string;
  serviceId2: string;
  advServiceId1: string;
  advServiceId2: string;
  advServiceId3: string;
  advServiceId4: string;
  advServiceId5: string;
}

export const DefaultServicesManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Simple Mode defaults (2 services)
  const [telcoService1, setTelcoService1] = useState('TELCO.SERVICES.PASS.VOICE');
  const [telcoService2, setTelcoService2] = useState('TELCO.SERVICES.PASS.DATA');

  const [omyService1, setOmyService1] = useState('OMY.SERVICES.TRANSFERT');
  const [omyService2, setOmyService2] = useState('OMY.SERVICES.VOICEBUNDLE');

  // Advanced Mode defaults (5 services)
  const [telcoAdvService1, setTelcoAdvService1] = useState('TELCO.SERVICES.PASS.VOICE');
  const [telcoAdvService2, setTelcoAdvService2] = useState('TELCO.SERVICES.PASS.DATA');
  const [telcoAdvService3, setTelcoAdvService3] = useState('TELCO.SERVICES.PASS.ILLIMIX');
  const [telcoAdvService4, setTelcoAdvService4] = useState('TELCO.SERVICES.PASS.ILLIFLEX');
  const [telcoAdvService5, setTelcoAdvService5] = useState('TELCO.SERVICES.PASS.VOICE');

  const [omyAdvService1, setOmyAdvService1] = useState('OMY.SERVICES.TRANSFERT');
  const [omyAdvService2, setOmyAdvService2] = useState('OMY.SERVICES.VOICEBUNDLE');
  const [omyAdvService3, setOmyAdvService3] = useState('DEPOT');
  const [omyAdvService4, setOmyAdvService4] = useState('OMY.SERVICES.RETRAIT');
  const [omyAdvService5, setOmyAdvService5] = useState('RAPIDO');

  // Lists of available services for selection
  const telcoOptions = [
    { value: 'TELCO.SERVICES.PASS.VOICE', label: 'Achat Crédit' },
    { value: 'TELCO.SERVICES.PASS.ILLIMIX', label: 'Achat Illimix' },
    { value: 'TELCO.SERVICES.PASS.DATA', label: 'Achat Internet' },
    { value: 'TELCO.SERVICES.PASS.ILLIFLEX', label: 'Achat Illiflex' },
    { value: 'TELCO.SERVICES.PASS.INTERNATIONAL', label: 'Pass Internationaux' },
    { value: 'TELCO.SERVICES.HOME_INTERNET', label: 'Internet Maison' },
    { value: 'TELCO.SERVICES.LOYALTY', label: 'Fidélité' },
    { value: 'TELCO.SERVICES.SOS_CREDIT', label: 'SOS Crédit' },
    { value: 'TELCO.SERVICES.P2P_BONUS', label: 'P2P Bonus' },
    { value: 'TELCO.SERVICES.PASS.MIXEL', label: 'Pass Mixel' },
    { value: 'SONATELF_MAIN_PAGE', label: 'Sonatel' },
    { value: 'TELCO.SERVICES.PASS.TRAVEL', label: 'Pass Voyage' },
    { value: 'TELCO.SERVICES.P2P', label: 'P2P Transfert' },
    { value: 'TELCO.SERVICES.PASS.WIDO', label: 'Pass Wido' },
    { value: 'TELCO.SERVICES.LEISURE.DALAL', label: 'Dalal Tones' },
    { value: 'TELCO.SERVICES.SOS_PASS', label: 'SOS Pass' },
  ];

  const omyOptions = [
    { value: 'OMY.SERVICES.TRANSFERT', label: 'Transfert d\'argent' },
    { value: 'OMY.SERVICES.VOICEBUNDLE', label: 'Crédit/Pass' },
    { value: 'DEPOT', label: 'Dépôt d\'argent' },
    { value: 'OMY.SERVICES.RETRAIT', label: 'Retrait d\'argent' },
    { value: 'RAPIDO', label: 'Recharge Rapido' },
    { value: 'OMY.SERVICES.MASTERCARD', label: 'Mastercard' },
    { value: 'OMY.SERVICES.FINANCIERS', label: 'Services Financiers' },
    { value: 'OMY.SERVICES.PI', label: 'Paiement International' },
    { value: 'OMY.SERVICES.INTER_COMPTE', label: 'Transfert Inter-Compte' },
    { value: 'OMY.SERVICES.BILLERS', label: 'Factures' },
    { value: 'OMY.SERVICES.BILLERS.TER', label: 'TER / Transport' },
    { value: 'OBA.SERVICES.TIKTAK', label: 'TikTik / Orange Bank' },
    { value: 'CANALPLUS', label: 'Canal+' },
    { value: 'FLEXEAU', label: 'FlexEau' },
    { value: 'SENELEC_MAIN_PAGE', label: 'Senelec' },
  ];

  useEffect(() => {
    fetchDefaultServices();
  }, []);

  const fetchDefaultServices = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.get<ApiResponseWrapper<DefaultServicesDto[]>>('/personnalisation/default-services');
      if (res && res.data) {
        res.data.forEach(config => {
          if (config.universe === 'TELCO') {
            setTelcoService1(config.serviceId1);
            setTelcoService2(config.serviceId2);
            setTelcoAdvService1(config.advServiceId1 || 'TELCO.SERVICES.PASS.VOICE');
            setTelcoAdvService2(config.advServiceId2 || 'TELCO.SERVICES.PASS.DATA');
            setTelcoAdvService3(config.advServiceId3 || 'TELCO.SERVICES.PASS.ILLIMIX');
            setTelcoAdvService4(config.advServiceId4 || 'TELCO.SERVICES.PASS.ILLIFLEX');
            setTelcoAdvService5(config.advServiceId5 || 'TELCO.SERVICES.PASS.VOICE');
          } else if (config.universe === 'OMY') {
            setOmyService1(config.serviceId1);
            setOmyService2(config.serviceId2);
            setOmyAdvService1(config.advServiceId1 || 'OMY.SERVICES.TRANSFERT');
            setOmyAdvService2(config.advServiceId2 || 'OMY.SERVICES.VOICEBUNDLE');
            setOmyAdvService3(config.advServiceId3 || 'DEPOT');
            setOmyAdvService4(config.advServiceId4 || 'OMY.SERVICES.RETRAIT');
            setOmyAdvService5(config.advServiceId5 || 'RAPIDO');
          }
        });
      }
    } catch (e: any) {
      console.error(e);
      setMessage({ text: 'Erreur lors de la récupération des services : ' + e.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations (Simple Mode)
    if (telcoService1 === telcoService2) {
      setMessage({ text: 'Mode Simple (TELCO) : le Service 1 et le Service 2 doivent être différents.', type: 'error' });
      return;
    }
    if (omyService1 === omyService2) {
      setMessage({ text: 'Mode Simple (OMY) : le Service 1 et le Service 2 doivent être différents.', type: 'error' });
      return;
    }

    // Validations (Advanced Mode OMY - unique selection since we have exactly 5 keys)
    const omyAdvSet = new Set([omyAdvService1, omyAdvService2, omyAdvService3, omyAdvService4, omyAdvService5]);
    if (omyAdvSet.size < 5) {
      setMessage({ text: 'Mode Avancé (OMY) : les 5 services par défaut doivent être uniques pour éviter des doublons.', type: 'error' });
      return;
    }

    setSaving(true);
    setMessage(null);

    const payload: DefaultServicesDto[] = [
      {
        universe: 'TELCO',
        serviceId1: telcoService1,
        serviceId2: telcoService2,
        advServiceId1: telcoAdvService1,
        advServiceId2: telcoAdvService2,
        advServiceId3: telcoAdvService3,
        advServiceId4: telcoAdvService4,
        advServiceId5: telcoAdvService5
      },
      {
        universe: 'OMY',
        serviceId1: omyService1,
        serviceId2: omyService2,
        advServiceId1: omyAdvService1,
        advServiceId2: omyAdvService2,
        advServiceId3: omyAdvService3,
        advServiceId4: omyAdvService4,
        advServiceId5: omyAdvService5
      }
    ];

    try {
      await api.post<any>('/personnalisation/default-services', payload);
      setMessage({ text: 'Configuration des services par défaut enregistrée avec succès !', type: 'success' });
    } catch (e: any) {
      console.error(e);
      setMessage({ text: 'Erreur lors de l\'enregistrement : ' + e.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card loading-container" style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <div className="spinner"></div>
        <p style={{ marginLeft: '1rem', color: 'var(--text-muted)' }}>Chargement de la configuration...</p>
      </div>
    );
  }

  return (
    <div className="default-services-container">
      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          Configuration des Services par Défaut
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Définissez les services qui s'afficheront par défaut dans l'interface mobile (Simple et Avancé). Les places restantes à la fin seront remplies par les services les plus utilisés de l'utilisateur (personnalisation).
        </p>

        {message && (
          <div
            className={`alert ${message.type}`}
            style={{
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              backgroundColor: message.type === 'success' ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)',
              border: `1px solid ${message.type === 'success' ? '#2ecc71' : '#e74c3c'}`,
              color: message.type === 'success' ? '#2ecc71' : '#e74c3c'
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', marginBottom: '2rem' }}>

            {/* TELCO UNIVERSE PANEL */}
            <div
              style={{
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '1.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.01)'
              }}
            >
              <h3 style={{ color: 'var(--orange-primary)', marginBottom: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '0.5rem' }}>📱</span> Univers Télécom (TELCO)
              </h3>

              {/* Simple Mode (TELCO) */}
              <h4 style={{ color: 'white', marginBottom: '1rem', fontSize: '0.95rem', borderBottom: '1px solid #222', paddingBottom: '0.3rem' }}>
                Mode Simple (2 services)
              </h4>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '0.8rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Service 1</label>
                  <select value={telcoService1} onChange={(e) => setTelcoService1(e.target.value)} style={selectStyle}>
                    {telcoOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Service 2</label>
                  <select value={telcoService2} onChange={(e) => setTelcoService2(e.target.value)} style={selectStyle}>
                    {telcoOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Advanced Mode (TELCO) */}
              <h4 style={{ color: 'white', marginBottom: '1rem', fontSize: '0.95rem', borderBottom: '1px solid #222', paddingBottom: '0.3rem' }}>
                Mode Avancé (5 services)
              </h4>
              <div>
                {[
                  { state: telcoAdvService1, set: setTelcoAdvService1, label: 'Service 1' },
                  { state: telcoAdvService2, set: setTelcoAdvService2, label: 'Service 2' },
                  { state: telcoAdvService3, set: setTelcoAdvService3, label: 'Service 3' },
                  { state: telcoAdvService4, set: setTelcoAdvService4, label: 'Service 4' },
                  { state: telcoAdvService5, set: setTelcoAdvService5, label: 'Service 5' },
                ].map((item, idx) => (
                  <div key={idx} style={{ marginBottom: '0.8rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.label}</label>
                    <select value={item.state} onChange={(e) => item.set(e.target.value)} style={selectStyle}>
                      {telcoOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* OMY UNIVERSE PANEL */}
            <div
              style={{
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '1.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.01)'
              }}
            >
              <h3 style={{ color: 'var(--orange-primary)', marginBottom: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '0.5rem' }}>💰</span> Univers Orange Money (OMY)
              </h3>

              {/* Simple Mode (OMY) */}
              <h4 style={{ color: 'white', marginBottom: '1rem', fontSize: '0.95rem', borderBottom: '1px solid #222', paddingBottom: '0.3rem' }}>
                Mode Simple (2 services)
              </h4>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '0.8rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Service 1</label>
                  <select value={omyService1} onChange={(e) => setOmyService1(e.target.value)} style={selectStyle}>
                    {omyOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Service 2</label>
                  <select value={omyService2} onChange={(e) => setOmyService2(e.target.value)} style={selectStyle}>
                    {omyOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Advanced Mode (OMY) */}
              <h4 style={{ color: 'white', marginBottom: '1rem', fontSize: '0.95rem', borderBottom: '1px solid #222', paddingBottom: '0.3rem' }}>
                Mode Avancé (5 services)
              </h4>
              <div>
                {[
                  { state: omyAdvService1, set: setOmyAdvService1, label: 'Service 1' },
                  { state: omyAdvService2, set: setOmyAdvService2, label: 'Service 2' },
                  { state: omyAdvService3, set: setOmyAdvService3, label: 'Service 3' },
                  { state: omyAdvService4, set: setOmyAdvService4, label: 'Service 4' },
                  { state: omyAdvService5, set: setOmyAdvService5, label: 'Service 5' },
                ].map((item, idx) => (
                  <div key={idx} style={{ marginBottom: '0.8rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.label}</label>
                    <select value={item.state} onChange={(e) => item.set(e.target.value)} style={selectStyle}>
                      {omyOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchDefaultServices}
              disabled={saving}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: '1px solid #333',
                backgroundColor: 'transparent',
                color: '#aaa',
                cursor: 'pointer'
              }}
            >
              Réinitialiser
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{
                padding: '0.75rem 2rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--orange-primary, #FF7900)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                opacity: saving ? 0.6 : 1
              }}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer la configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: '8px',
  backgroundColor: '#1E1E1E',
  border: '1px solid #333',
  color: 'white',
  fontSize: '0.85rem'
};
