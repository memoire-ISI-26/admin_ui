import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { ApiResponseWrapper } from '../utils/api';

interface Client {
  id: number;
  number: string;
  firstName: string;
  lastName: string;
  birthdate: string;
}

interface TrackingEvent {
  id?: string;
  eventType: string;
  msisdn: string;
  userId: string;
  userRole: string;
  payload: any;
  timestamp: string;
}

export const Statistics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [events, setEvents] = useState<TrackingEvent[]>([]);

  const fetchStatsData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [clientsRes, eventsRes] = await Promise.all([
        api.get<ApiResponseWrapper<Client[]>>('/users/client/list'),
        api.get<TrackingEvent[]>('/tracking/events')
      ]);
      setClients(clientsRes?.data || []);
      setEvents(eventsRes || []);
    } catch (err: any) {
      console.error('Error loading stats data', err);
      setErrorMessage("Impossible d'interroger les microservices (user-service ou tracking-service) pour compiler les statistiques.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsData();
  }, []);

  // Helper to parse age
  const getAge = (birthdateStr: string): number | null => {
    if (!birthdateStr) return null;
    try {
      const parts = birthdateStr.split('/');
      let dateObj: Date;
      if (parts.length === 3) {
        dateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        dateObj = new Date(birthdateStr);
      }
      if (isNaN(dateObj.getTime())) return null;
      const ageDifMs = Date.now() - dateObj.getTime();
      const ageDate = new Date(ageDifMs);
      return Math.abs(ageDate.getUTCFullYear() - 1970);
    } catch (e) {
      return null;
    }
  };

  // Helper to extract purchase amount
  const getAmountFromPayload = (payload: any): number => {
    if (!payload) return 0;
    if (typeof payload === 'object') {
      const val = payload.prix || payload.montant || payload.amount;
      if (val) return Number(val);
    }
    return 0;
  };

  // --- Calculations ---

  // 1. Most used services
  const serviceCounts: Record<string, number> = {};
  events.forEach(e => {
    if (!e.eventType) return;
    serviceCounts[e.eventType] = (serviceCounts[e.eventType] || 0) + 1;
  });

  const serviceLabels: Record<string, string> = {
    LOGIN: 'Connexions',
    TRANSFER: "Transferts d'argent",
    DEPOSIT: "Dépôts de fonds",
    WITHDRAW: "Retraits de fonds",
    ACHAT_PASS_INTERNET: 'Pass Internet',
    ACHAT_PASS_ILLIMIX: 'Pass Illimix',
    ACHAT_PASS_ILLIFLEX: 'Pass Illiflex',
    ACHAT_CREDIT: 'Achat de Crédit',
    ACHAT_RAPIDO: 'Paiements Rapido',
    PASSWORD_UPDATE: 'Mises à jour Profil'
  };

  const sortedServices = Object.entries(serviceCounts)
    .map(([key, value]) => ({
      key,
      label: serviceLabels[key] || key,
      count: value
    }))
    .sort((a, b) => b.count - a.count);

  const totalEvents = events.length || 1;

  // 2. Age distribution
  let ageBuckets = {
    mineur: 0, // < 18
    jeune: 0,  // 18-25
    adulteJ: 0, // 26-35
    adulte: 0,  // 36-50
    senior: 0   // 50+
  };

  clients.forEach(c => {
    const age = getAge(c.birthdate);
    if (age === null) return;
    if (age < 18) ageBuckets.mineur++;
    else if (age <= 25) ageBuckets.jeune++;
    else if (age <= 35) ageBuckets.adulteJ++;
    else if (age <= 50) ageBuckets.adulte++;
    else ageBuckets.senior++;
  });

  const totalClientsWithAge = Object.values(ageBuckets).reduce((a, b) => a + b, 0) || 1;

  const ageData = [
    { label: '< 18 ans', count: ageBuckets.mineur, pct: (ageBuckets.mineur / totalClientsWithAge) * 100 },
    { label: '18-25 ans', count: ageBuckets.jeune, pct: (ageBuckets.jeune / totalClientsWithAge) * 100 },
    { label: '26-35 ans', count: ageBuckets.adulteJ, pct: (ageBuckets.adulteJ / totalClientsWithAge) * 100 },
    { label: '36-50 ans', count: ageBuckets.adulte, pct: (ageBuckets.adulte / totalClientsWithAge) * 100 },
    { label: '50+ ans', count: ageBuckets.senior, pct: (ageBuckets.senior / totalClientsWithAge) * 100 }
  ];

  // 3. Revenue calculations (except Rapido)
  let revenue = {
    internet: 0,
    illimix: 0,
    illiflex: 0,
    credit: 0
  };

  events.forEach(e => {
    if (e.eventType === 'ACHAT_PASS_INTERNET') {
      revenue.internet += getAmountFromPayload(e.payload);
    } else if (e.eventType === 'ACHAT_PASS_ILLIMIX') {
      revenue.illimix += getAmountFromPayload(e.payload);
    } else if (e.eventType === 'ACHAT_PASS_ILLIFLEX') {
      revenue.illiflex += getAmountFromPayload(e.payload);
    } else if (e.eventType === 'ACHAT_CREDIT') {
      revenue.credit += getAmountFromPayload(e.payload);
    }
  });

  const totalRevenue = revenue.internet + revenue.illimix + revenue.illiflex + revenue.credit;

  // 4. Hourly peak distribution
  const hourlyCounts = Array(24).fill(0);
  events.forEach(e => {
    if (!e.timestamp) return;
    try {
      const date = new Date(e.timestamp);
      const hour = date.getHours();
      if (hour >= 0 && hour < 24) {
        hourlyCounts[hour]++;
      }
    } catch {}
  });

  const timePeriodBuckets = {
    nuit: 0, // 00h - 06h
    matin: 0, // 06h - 12h
    aprem: 0, // 12h - 18h
    soir: 0 // 18h - 00h
  };

  hourlyCounts.forEach((count, hour) => {
    if (hour < 6) timePeriodBuckets.nuit += count;
    else if (hour < 12) timePeriodBuckets.matin += count;
    else if (hour < 18) timePeriodBuckets.aprem += count;
    else timePeriodBuckets.soir += count;
  });

  const maxPeriodEntry = Object.entries(timePeriodBuckets).reduce(
    (max, current) => (current[1] > max[1] ? current : max),
    ['soir', 0]
  );

  const periodLabels: Record<string, string> = {
    nuit: 'Nuit (00h - 06h)',
    matin: 'Matin (06h - 12h)',
    aprem: 'Après-midi (12h - 18h)',
    soir: 'Soirée (18h - 00h)'
  };

  const peakPeriodLabel = periodLabels[maxPeriodEntry[0]];

  if (errorMessage) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', maxWidth: '600px', margin: '40px auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', fontSize: '2rem' }}>
          ⚠️
        </div>
        <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Statistiques en Maintenance</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
          {errorMessage}
        </p>
        <button className="btn btn-primary" onClick={fetchStatsData} style={{ marginTop: '10px' }}>
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
            Analyses & Statistiques
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Consultez les indicateurs clés de performance et l'activité des utilisateurs sur la plateforme Max It.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchStatsData} disabled={loading}>
          Rafraîchir les Données
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="3" style={{ animation: 'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
          </svg>
        </div>
      ) : (
        <>
          {/* Stats Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div className="card-stat" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>CHIFFRE D'AFFAIRES HORS RAPIDO</span>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--orange)', fontFamily: 'var(--font-title)' }}>
                {totalRevenue.toLocaleString()} FCFA
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Cumulé sur les achats de pass & crédit</span>
            </div>

            <div className="card-stat" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>ÂGE MOYEN ESTIMÉ</span>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-title)' }}>
                {Math.round(clients.reduce((sum, c) => sum + (getAge(c.birthdate) || 28), 0) / (clients.length || 1))} ans
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Calculé à partir des dates de naissance</span>
            </div>

            <div className="card-stat" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>PIC DE CHARGE HORAIRE</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-title)', marginTop: '8px', marginBottom: '8px' }}>
                {peakPeriodLabel}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Période enregistrant le plus de requêtes</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', flexWrap: 'wrap' }}>
            
            {/* 1. Services les plus utilisés */}
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '1.2rem', marginBottom: '20px', color: 'var(--text-main)' }}>
                Services les plus utilisés
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {sortedServices.slice(0, 5).map((service, index) => {
                  const pct = (service.count / totalEvents) * 100;
                  return (
                    <div key={service.key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{service.label}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{service.count} ({Math.round(pct)}%)</span>
                      </div>
                      <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            height: '100%', 
                            backgroundColor: index === 0 ? 'var(--orange)' : 'var(--text-muted)',
                            width: `${pct}%`,
                            borderRadius: '4px',
                            transition: 'width 0.6s ease'
                          }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Répartition par âge */}
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '1.2rem', marginBottom: '20px', color: 'var(--text-main)' }}>
                Répartition par tranche d'âge
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '200px', padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
                {ageData.map((d) => (
                  <div key={d.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {d.count}
                    </span>
                    <div 
                      style={{ 
                        width: '32px', 
                        height: `${Math.max(d.pct * 1.5, 4)}px`, 
                        backgroundColor: 'var(--orange)', 
                        background: 'linear-gradient(180deg, var(--orange) 0%, rgba(255, 121, 0, 0.4) 100%)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.6s ease'
                      }} 
                    />
                    <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', color: 'var(--text-main)', transform: 'rotate(-15deg)', marginTop: '5px' }}>
                      {d.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Chiffre d'affaires (hors Rapido) */}
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '1.2rem', marginBottom: '20px', color: 'var(--text-main)' }}>
                Volume des ventes par offre (hors Rapido)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pass Internet</span>
                  <strong style={{ color: 'var(--text-main)' }}>{revenue.internet.toLocaleString()} FCFA</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pass Illimix</span>
                  <strong style={{ color: 'var(--text-main)' }}>{revenue.illimix.toLocaleString()} FCFA</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pass Illiflex</span>
                  <strong style={{ color: 'var(--text-main)' }}>{revenue.illiflex.toLocaleString()} FCFA</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Crédit Téléphonique</span>
                  <strong style={{ color: 'var(--text-main)' }}>{revenue.credit.toLocaleString()} FCFA</strong>
                </div>
              </div>
            </div>

            {/* 4. Pic horaire d'activité */}
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '1.2rem', marginBottom: '20px', color: 'var(--text-main)' }}>
                Activité globale par période de la journée
              </h3>
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="220" height="220" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="70" fill="none" stroke="var(--border)" strokeWidth="16" />
                  
                  {/* Styled segment representing evening peak activity */}
                  <circle cx="100" cy="100" r="70" fill="none" stroke="var(--orange)" strokeWidth="18" 
                          strokeDasharray="440" 
                          strokeDashoffset="120"
                          strokeLinecap="round"
                          transform="rotate(-90 100 100)"
                  />
                  
                  <text x="100" y="95" textAnchor="middle" fill="var(--text-main)" fontSize="18" fontWeight="bold" fontFamily="var(--font-title)">
                    {Math.round((maxPeriodEntry[1] / (totalEvents || 1)) * 100)}%
                  </text>
                  <text x="100" y="115" textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontWeight="600">
                    Tranche Soirée
                  </text>
                </svg>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '10px' }}>
                <div>🌅 Matin : <strong>{timePeriodBuckets.matin} req</strong></div>
                <div>☀️ Midi : <strong>{timePeriodBuckets.aprem} req</strong></div>
                <div>🌙 Soir : <strong>{timePeriodBuckets.soir} req</strong></div>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};
