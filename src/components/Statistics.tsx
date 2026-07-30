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
  const [searchMsisdn, setSearchMsisdn] = useState('');
  const [activeMsisdn, setActiveMsisdn] = useState('');
  const [hdfsEvents, setHdfsEvents] = useState<TrackingEvent[]>([]);
  const [hdfsGlobalStats, setHdfsGlobalStats] = useState<{
    serviceCounts: Record<string, number>;
    revenue: { internet: number; illimix: number; illiflex: number; credit: number };
    hourlyDistribution?: { nuit: number; matin: number; aprem: number; soir: number };
  } | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveMsisdn(searchMsisdn.trim());
  };

  const handleResetSearch = () => {
    setSearchMsisdn('');
    setActiveMsisdn('');
  };

  const fetchStatsData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [clientsRes, eventsRes, hdfsStatsRes] = await Promise.all([
        api.get<ApiResponseWrapper<Client[]>>('/users/client/list'),
        api.get<TrackingEvent[]>('/tracking/events'),
        api.get<ApiResponseWrapper<any>>('/personnalisation/usages/stats/global').catch(err => {
          console.warn("Impossible de charger les stats globales HDFS", err);
          return null;
        })
      ]);
      setClients(clientsRes?.data || []);
      setEvents(eventsRes || []);
      if (hdfsStatsRes?.data) {
        setHdfsGlobalStats(hdfsStatsRes.data);
      }
    } catch (err: any) {
      console.error('Error loading stats data', err);
      setErrorMessage("En cours de maintenance. Veuillez patienter.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsData();
  }, []);

  useEffect(() => {
    if (!activeMsisdn) {
      setHdfsEvents([]);
      return;
    }
    
    api.get<ApiResponseWrapper<any>>(`/personnalisation/usages/${activeMsisdn}`)
      .then(res => {
        const dataList = res?.data as any[];
        if (dataList && dataList.length > 0) {
          const mapped: TrackingEvent[] = [];
          
          const serviceToEvent: Record<string, { event: string; amount: number }> = {
            'TELCO.SERVICES.PASS.DATA': { event: 'ACHAT_PASS_INTERNET', amount: 1000 },
            'TELCO.SERVICES.PASS.ILLIMIX': { event: 'ACHAT_PASS_ILLIMIX', amount: 1500 },
            'TELCO.SERVICES.PASS.ILLIFLEX': { event: 'ACHAT_PASS_ILLIFLEX', amount: 2000 },
            'TELCO.SERVICES.PASS.VOICE': { event: 'ACHAT_CREDIT', amount: 1000 },
            'TELCO.SERVICES.PASS.INTERNATIONAL': { event: 'ACHAT_INTERNATIONAL', amount: 5000 },
            'OMY.SERVICES.TRANSFERT': { event: 'TRANSFERT', amount: 3000 },
            'OMY.SERVICES.RETRAIT': { event: 'RETRAIT', amount: 3000 },
            'DEPOT': { event: 'DEPOT', amount: 5000 },
            'RAPIDO': { event: 'ACHAT_RAPIDO', amount: 2000 }
          };

          dataList.forEach(item => {
            const source = item._source;
            if (!source) return;
            const services = source.liste_de_services || [];
            const timestamp = source.last_date || source.date;
            
            services.forEach((srv: string) => {
              const mappedInfo = serviceToEvent[srv] || { event: srv, amount: 0 };
              mapped.push({
                eventType: mappedInfo.event,
                msisdn: activeMsisdn,
                userId: activeMsisdn,
                userRole: 'CLIENT',
                payload: { amount: mappedInfo.amount },
                timestamp: timestamp
              });
            });
          });
          
          setHdfsEvents(mapped);
        } else {
          setHdfsEvents([]);
        }
      })
      .catch(err => {
        console.warn("Pas d'usages HDFS pour ce MSISDN", err);
        setHdfsEvents([]);
      });
  }, [activeMsisdn]);

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

  // Helper to extract purchase amount (handling objects, stringified JSON, or raw numbers)
  const getAmountFromPayload = (payload: any): number => {
    if (!payload) return 0;
    let obj = payload;
    if (typeof payload === 'string') {
      try {
        obj = JSON.parse(payload);
      } catch (e) {
        const num = Number(payload);
        if (!isNaN(num)) return num;
        return 0;
      }
    }
    if (obj && typeof obj === 'object') {
      const val = obj.prix || obj.montant || obj.amount;
      if (val) return Number(val);
    }
    return 0;
  };

  // --- Filtering ---
  const currentMsisdn = activeMsisdn.trim();
  const mongoEvents = currentMsisdn 
    ? events.filter(e => e.msisdn === currentMsisdn)
    : events;

  const filteredEvents = currentMsisdn
    ? [...mongoEvents, ...hdfsEvents]
    : events;

  const searchedClient = currentMsisdn
    ? clients.find(c => c.number === currentMsisdn)
    : null;

  // --- Calculations ---

  // 1. Most used services
  const serviceCounts: Record<string, number> = {};
  let totalFilteredEvents = 0;
  filteredEvents.forEach(e => {
    if (!e.eventType) return;
    // Exclure LOGIN, LOGOUT et REGISTER pour ne pas fausser les stats d'utilisation fonctionnelle
    const typeUpper = e.eventType.toUpperCase();
    if (typeUpper === 'LOGIN' || typeUpper === 'LOGOUT' || typeUpper === 'REGISTER') return;
    serviceCounts[e.eventType] = (serviceCounts[e.eventType] || 0) + 1;
    totalFilteredEvents++;
  });

  // Si on affiche les stats globales (aucun abonné recherché), on intègre les statistiques HDFS
  if (!currentMsisdn && hdfsGlobalStats?.serviceCounts) {
    const hdfsServiceToEvent: Record<string, string> = {
      'TELCO.SERVICES.PASS.DATA': 'ACHAT_PASS_INTERNET',
      'TELCO.SERVICES.PASS.ILLIMIX': 'ACHAT_PASS_ILLIMIX',
      'TELCO.SERVICES.PASS.ILLIFLEX': 'ACHAT_PASS_ILLIFLEX',
      'TELCO.SERVICES.PASS.VOICE': 'ACHAT_CREDIT',
      'TELCO.SERVICES.PASS.INTERNATIONAL': 'ACHAT_INTERNATIONAL',
      'OMY.SERVICES.TRANSFERT': 'TRANSFERT',
      'OMY.SERVICES.RETRAIT': 'RETRAIT',
      'DEPOT': 'DEPOT',
      'RAPIDO': 'ACHAT_RAPIDO'
    };

    Object.entries(hdfsGlobalStats.serviceCounts).forEach(([hdfsSrv, count]) => {
      const eventKey = hdfsServiceToEvent[hdfsSrv] || hdfsSrv;
      serviceCounts[eventKey] = (serviceCounts[eventKey] || 0) + count;
      totalFilteredEvents += count;
    });
  }

  const serviceLabels: Record<string, string> = {
    TRANSFERT: "Transferts d'argent",
    DEPOT: "Dépôts de fonds",
    RETRAIT: "Retraits de fonds",
    ACHAT_PASS_INTERNET: 'Pass Internet',
    ACHAT_PASS_ILLIMIX: 'Pass Illimix',
    ACHAT_PASS_ILLIFLEX: 'Pass Illiflex',
    ACHAT_CREDIT: 'Achat de Crédit',
    ACHAT_RAPIDO: 'Paiements Rapido',
    PASSWORD_UPDATE: 'Mises à jour Profil',
    // New services from HDFS
    'TELCO.SERVICES.HOME_INTERNET': 'Internet Maison',
    'TELCO.SERVICES.LOYALTY': 'Fidélité Orange',
    'TELCO.SERVICES.SOS_CREDIT': 'SOS Crédit',
    'TELCO.SERVICES.P2P_BONUS': 'P2P Bonus',
    'TELCO.SERVICES.PASS.INTERNATIONAL': 'Pass Internationaux',
    'TELCO.SERVICES.PASS.MIXEL': 'Pass Mixel',
    'SONATELF_MAIN_PAGE': 'Sonatel',
    'TELCO.SERVICES.PASS.TRAVEL': 'Pass Voyage',
    'TELCO.SERVICES.P2P': 'P2P Transfert',
    'TELCO.SERVICES.PASS.WIDO': 'Pass Wido',
    'TELCO.SERVICES.LEISURE.DALAL': 'Dalal Tones',
    'TELCO.SERVICES.SOS_PASS': 'SOS Pass',
    'OMY.SERVICES.MASTERCARD': 'Mastercard',
    'OMY.SERVICES.FINANCIERS': 'Services Financiers',
    'OMY.SERVICES.PI': 'Paiement International',
    'OMY.SERVICES.INTER_COMPTE': 'Transfert Inter-Compte',
    'OMY.SERVICES.BILLERS': 'Factures',
    'OMY.SERVICES.BILLERS.TER': 'TER / Transport',
    'OBA.SERVICES.TIKTAK': 'TikTik / Orange Bank',
    'CANALPLUS': 'Canal+',
    'FLEXEAU': 'FlexEau',
    'SENELEC_MAIN_PAGE': 'Senelec'
  };

  const sortedServices = Object.entries(serviceCounts)
    .map(([key, value]) => ({
      key,
      label: serviceLabels[key] || key,
      count: value
    }))
    .sort((a, b) => b.count - a.count);

  const totalEvents = totalFilteredEvents || 1;

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

  // 3. Revenue calculations
  let revenue = {
    internet: 0,
    illimix: 0,
    illiflex: 0,
    credit: 0
  };

  filteredEvents.forEach(e => {
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

  // Si on affiche les stats globales (aucun abonné recherché), on intègre le chiffre d'affaires d'HDFS
  if (!currentMsisdn && hdfsGlobalStats?.revenue) {
    revenue.internet += hdfsGlobalStats.revenue.internet || 0;
    revenue.illimix += hdfsGlobalStats.revenue.illimix || 0;
    revenue.illiflex += hdfsGlobalStats.revenue.illiflex || 0;
    revenue.credit += hdfsGlobalStats.revenue.credit || 0;
  }

  const totalRevenue = revenue.internet + revenue.illimix + revenue.illiflex + revenue.credit;

  // 4. Hourly peak distribution
  const hourlyCounts = Array(24).fill(0);
  filteredEvents.forEach(e => {
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

  if (!currentMsisdn && hdfsGlobalStats?.hourlyDistribution) {
    timePeriodBuckets.nuit += hdfsGlobalStats.hourlyDistribution.nuit || 0;
    timePeriodBuckets.matin += hdfsGlobalStats.hourlyDistribution.matin || 0;
    timePeriodBuckets.aprem += hdfsGlobalStats.hourlyDistribution.aprem || 0;
    timePeriodBuckets.soir += hdfsGlobalStats.hourlyDistribution.soir || 0;
  }

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

      {/* Barre de recherche d'abonné */}
      <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px', backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', flexGrow: 1, maxWidth: '500px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Rechercher par numéro (ex: 775203112)..."
            style={{ flexGrow: 1, padding: '8px 12px' }}
            value={searchMsisdn}
            onChange={(e) => setSearchMsisdn(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }} disabled={loading}>
            Rechercher
          </button>
          {activeMsisdn && (
            <button type="button" className="btn btn-secondary" onClick={handleResetSearch} style={{ padding: '8px 16px' }}>
              Réinitialiser
            </button>
          )}
        </form>
        {activeMsisdn && (
          <div>
            <span className="badge badge-orange" style={{ padding: '8px 12px', fontSize: '0.85rem' }}>
              Statistiques pour l'abonné : <strong>{activeMsisdn}</strong>
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="3" style={{ animation: 'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
          </svg>
        </div>
      ) : activeMsisdn && filteredEvents.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', maxWidth: '600px', margin: '20px auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '2.5rem' }}>🔍</div>
          <h3 style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '1.25rem', margin: 0 }}>Aucun usage enregistré</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Aucun événement d'activité ou d'usage n'a été enregistré pour le numéro <strong>{activeMsisdn}</strong>.
          </p>
          {searchedClient && (
            <div style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius-md)', width: '100%', textAlign: 'left', marginTop: '10px' }}>
              <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--text-main)' }}>Profil de l'abonné :</strong>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nom : {searchedClient.firstName} {searchedClient.lastName}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Date de naissance : {searchedClient.birthdate || '-'}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Âge : {getAge(searchedClient.birthdate) || '-'} ans</div>
            </div>
          )}
          <button className="btn btn-secondary" onClick={handleResetSearch} style={{ marginTop: '10px' }}>
            Voir les statistiques globales
          </button>
        </div>
      ) : (
        <>
          {/* Stats Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div className="card-stat" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                {activeMsisdn ? "DÉPENSES DE L'ABONNÉ" : "CHIFFRE D'AFFAIRES"}
              </span>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--orange)', fontFamily: 'var(--font-title)' }}>
                {totalRevenue.toLocaleString()} FCFA
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {activeMsisdn ? "Total dépensé par cet utilisateur" : "Cumulé sur les achats de pass & crédit"}
              </span>
            </div>

            <div className="card-stat" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                {activeMsisdn ? "ÂGE DE L'ABONNÉ" : "ÂGE MOYEN ESTIMÉ"}
              </span>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-title)' }}>
                {activeMsisdn 
                  ? (searchedClient ? `${getAge(searchedClient.birthdate)} ans` : "N/A")
                  : `${Math.round(clients.reduce((sum, c) => sum + (getAge(c.birthdate) || 28), 0) / (clients.length || 1))} ans`}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {activeMsisdn ? (searchedClient ? `Né le ${searchedClient.birthdate}` : "Abonné non enregistré dans l'annuaire") : "Calculé à partir des dates de naissance"}
              </span>
            </div>

            <div className="card-stat" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                {activeMsisdn ? "PÉRIODE DE PRÉFÉRENCE" : "PIC DE CHARGE HORAIRE"}
              </span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-title)', marginTop: '8px', marginBottom: '8px' }}>
                {peakPeriodLabel}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {activeMsisdn ? "Moment de la journée le plus actif pour cet abonné" : "Période enregistrant le plus de requêtes"}
              </span>
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

            {/* 2. Répartition par âge OU Fiche Profil */}
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              {searchedClient ? (
                <>
                  <h3 style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '1.2rem', marginBottom: '20px', color: 'var(--text-main)' }}>
                    Fiche Profil Abonné
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '10px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--orange)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 'bold' }}>
                        {searchedClient.firstName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                          {searchedClient.firstName} {searchedClient.lastName}
                        </h4>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Numéro : {searchedClient.number}
                        </span>
                      </div>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Date de naissance</span>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{searchedClient.birthdate || '-'}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Âge</span>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{getAge(searchedClient.birthdate) || '-'} ans</strong>
                      </div>
                    </div>
                    <div style={{ backgroundColor: 'var(--border)', height: '1px', margin: '8px 0' }} />
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Statut d'Activité</span>
                      <span className="badge badge-success">Actif (Transactions : {filteredEvents.length})</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>

            {/* 3. Chiffre d'affaires */}
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '1.2rem', marginBottom: '20px', color: 'var(--text-main)' }}>
                Volume des ventes par offre
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
                    {peakPeriodLabel}
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
