import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

interface TrackingEvent {
  id?: string;
  eventType: string;
  msisdn: string;
  userId: string;
  userRole: string;
  payload: any;
  timestamp: string;
}

export const AuditLogs: React.FC = () => {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchMsisdn, setSearchMsisdn] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [error, setError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    setError('');
    setErrorMessage('');
    try {
      const data = await api.get<TrackingEvent[]>('/tracking/events');
      // Sort by timestamp desc
      const sorted = (data || []).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEvents(sorted);
    } catch (err: any) {
      console.error('API error fetching tracking events', err);
      setErrorMessage("Actuellement indisponible ou en cours de maintenance. Veuillez patienter.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleMsisdnSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchMsisdn.trim()) {
      fetchEvents();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api.get<TrackingEvent[]>(`/tracking/events/${searchMsisdn.trim()}`);
      const sorted = (data || []).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEvents(sorted);
    } catch (err: any) {
      console.error(err);
      setError(`Erreur lors de la recherche des journaux pour le numéro ${searchMsisdn} : ${err.message || 'Introuvable.'}`);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeClass = (eventType: string) => {
    if (!eventType) return 'badge badge-info';
    const act = eventType.toUpperCase();
    if (act.includes('FAIL') || act.includes('ERROR') || act.includes('DELETE')) {
      return 'badge badge-danger';
    }
    if (act.includes('SUCCESS') || act.includes('LOGIN')) {
      return 'badge badge-success';
    }
    if (act.includes('CREATE') || act.includes('UPDATE') || act.includes('ADD')) {
      return 'badge badge-warning';
    }
    return 'badge badge-info';
  };

  const formatPayload = (payload: any) => {
    if (!payload) return '-';
    if (typeof payload === 'string') return payload;
    return JSON.stringify(payload);
  };

  // Filter events locally
  const filteredEvents = events.filter(e => {
    const term = localSearch.toLowerCase();
    return (
      (e.eventType && e.eventType.toLowerCase().includes(term)) ||
      (e.msisdn && e.msisdn.toLowerCase().includes(term)) ||
      (e.payload && formatPayload(e.payload).toLowerCase().includes(term)) ||
      (e.userRole && e.userRole.toLowerCase().includes(term))
    );
  });

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
        <button className="btn btn-primary" onClick={fetchEvents} style={{ marginTop: '10px' }}>
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
            Journaux d'Evénements
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Suivez l'activité du système, les connexions des utilisateurs et les actions administratives.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchEvents} disabled={loading}>
          Rafraîchir
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

      {/* Filter and search bar */}
      <div className="filter-bar">
        <div style={{ display: 'flex', gap: '12px', flexGrow: 1, flexWrap: 'wrap' }}>
          <div className="search-input-wrapper" style={{ maxWidth: '280px' }}>
            <svg className="search-icon-svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Filtrer localement (action, détails)..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>

          <form onSubmit={handleMsisdnSearch} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Rechercher par numéro (API)..."
              style={{ width: '220px', padding: '8px 12px' }}
              value={searchMsisdn}
              onChange={(e) => setSearchMsisdn(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }} disabled={loading}>
              Rechercher
            </button>
          </form>
        </div>
      </div>

      {/* Events logs container */}
      <div className="card-table-container">
        <div className="card-header">
          <span className="card-header-title">Événements ({filteredEvents.length})</span>
        </div>
        <div className="table-responsive">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="3" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
              </svg>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Aucun log d'activité disponible.
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Horodatage</th>
                  <th>Action</th>
                  <th>Utilisateur</th>
                  <th>Rôle</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((evt, idx) => (
                  <tr key={evt.id || idx}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <span className={getActionBadgeClass(evt.eventType)}>{evt.eventType}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 650, color: evt.userRole === 'ADMINISTRATOR' ? 'var(--orange)' : 'var(--text-main)' }}>
                        {evt.msisdn}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: evt.userRole === 'ADMINISTRATOR' ? 'var(--orange)' : 'var(--text-muted)' }}>
                        {evt.userRole}
                      </span>
                    </td>
                    <td style={{ maxWidth: '400px', wordBreak: 'break-word' }}>
                      {formatPayload(evt.payload)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
