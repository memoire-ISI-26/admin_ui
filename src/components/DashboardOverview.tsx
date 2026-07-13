import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { ApiResponseWrapper } from '../utils/api';

interface DashboardOverviewProps {
  onNavigate: (view: string) => void;
}

interface ActivityEvent {
  id?: string;
  eventType: string;
  msisdn: string;
  userId: string;
  userRole: string;
  payload: any;
  timestamp: string;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    clients: 0,
    internetPasses: 0,
    illimixPasses: 0,
    illiflexPasses: 0,
    securityEvents: 0
  });
  const [recentEvents, setRecentEvents] = useState<ActivityEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState('');


  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        const [clientsRes, internetRes, illimixRes, illiflexRes, eventsRes] = await Promise.all([
          api.get<ApiResponseWrapper<any[]>>('/users/client/list'),
          api.get<ApiResponseWrapper<any[]>>('/pricing/pass-internet'),
          api.get<ApiResponseWrapper<any[]>>('/pricing/pass-illimix'),
          api.get<ApiResponseWrapper<any[]>>('/pricing/pass-illiflex'),
          api.get<ActivityEvent[]>('/tracking/events')
        ]);
        
        const clientsList = clientsRes?.data || [];
        const internetList = internetRes?.data || [];
        const illimixList = illimixRes?.data || [];
        const illiflexList = illiflexRes?.data || [];
        const eventList = eventsRes || [];

        setStats({
          clients: clientsList.length,
          internetPasses: internetList.length,
          illimixPasses: illimixList.length,
          illiflexPasses: illiflexList.length,
          securityEvents: eventList.length
        });
        setRecentEvents(eventList.slice(0, 5));
      } catch (err: any) {
        console.error('Error fetching dashboard stats', err);
        setErrorMessage('Un ou plusieurs microservices du système (users, pricing ou tracking) sont hors-ligne ou en cours de maintenance. Veuillez contacter l\'administrateur système.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const totalPasses = stats.internetPasses + stats.illimixPasses + stats.illiflexPasses;

  if (errorMessage) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', maxWidth: '600px', margin: '40px auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', fontSize: '2rem' }}>
          ⚠️
        </div>
        <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Console en Maintenance</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
          {errorMessage}
        </p>
        <button className="btn btn-primary" onClick={() => window.location.reload()} style={{ marginTop: '10px' }}>
          Réessayer la connexion
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '1.8rem', color: 'var(--text-main)' }}>
          Tableau de Bord
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Bienvenue dans la console d'administration. Voici un résumé de l'état actuel de la plateforme Max It.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="3" style={{ animation: 'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
          </svg>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card" onClick={() => onNavigate('clients')} style={{ cursor: 'pointer' }}>
              <div className="stat-details">
                <span className="stat-title">Clients Inscrits</span>
                <span className="stat-value">{stats.clients}</span>
              </div>
              <div className="stat-icon-wrapper stat-icon-orange">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>

            <div className="stat-card" onClick={() => onNavigate('passes')} style={{ cursor: 'pointer' }}>
              <div className="stat-details">
                <span className="stat-title">Pass au Catalogue</span>
                <span className="stat-value">{totalPasses}</span>
              </div>
              <div className="stat-icon-wrapper stat-icon-green">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
            </div>

            <div className="stat-card" onClick={() => onNavigate('logs')} style={{ cursor: 'pointer' }}>
              <div className="stat-details">
                <span className="stat-title">Événements de Sécurité</span>
                <span className="stat-value">{stats.securityEvents}</span>
              </div>
              <div className="stat-icon-wrapper stat-icon-blue">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flexWrap: 'wrap' }} className="dashboard-sections">
            <div className="card-table-container" style={{ margin: 0 }}>
              <div className="card-header">
                <h3 className="card-header-title">Répartition du Catalogue</h3>
              </div>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Pass Internet</span>
                    <span style={{ fontWeight: 600 }}>{stats.internetPasses}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${totalPasses ? (stats.internetPasses / totalPasses) * 100 : 0}%`, height: '100%', backgroundColor: 'var(--orange)' }}></div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Pass Illimix (Tout-en-un)</span>
                    <span style={{ fontWeight: 600 }}>{stats.illimixPasses}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${totalPasses ? (stats.illimixPasses / totalPasses) * 100 : 0}%`, height: '100%', backgroundColor: 'var(--success)' }}></div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Pass Illiflex (Sur-mesure)</span>
                    <span style={{ fontWeight: 600 }}>{stats.illiflexPasses}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${totalPasses ? (stats.illiflexPasses / totalPasses) * 100 : 0}%`, height: '100%', backgroundColor: 'var(--info)' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-table-container" style={{ margin: 0 }}>
              <div className="card-header">
                <h3 className="card-header-title">Événements d'Audit Récents</h3>
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => onNavigate('logs')}>
                  Voir tout
                </button>
              </div>
              <div style={{ padding: '8px 0' }}>
                {recentEvents.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Aucun événement récent.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {recentEvents.map((evt, idx) => (
                      <div 
                        key={evt.id || idx} 
                        style={{ 
                          padding: '12px 24px', 
                          borderBottom: idx === recentEvents.length - 1 ? 'none' : '1px solid var(--border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.85rem'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '70%' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {evt.payload && typeof evt.payload === 'string' ? evt.payload : evt.eventType}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            Utilisateur: {evt.msisdn} ({evt.userRole})
                          </span>
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
