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

export const ClientManager: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [apiSearchNumber, setApiSearchNumber] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    setError('');
    setErrorMessage('');
    try {
      const response = await api.get<ApiResponseWrapper<Client[]>>('/users/client/list');
      setClients(response?.data || []);
    } catch (err: any) {
      console.error('API error fetching clients', err);
      setErrorMessage("Ce service est inaccessible ou en cours de maintenance. Veuillez contacter l'administrateur.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleApiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiSearchNumber.trim()) {
      fetchClients();
      return;
    }

    setLoading(true);
    setError('');
    setSelectedClient(null);

    try {
      const response = await api.get<ApiResponseWrapper<Client>>(`/users/client/number/${apiSearchNumber.trim()}`);
      if (response && response.data) {
        setClients([response.data]);
        setSuccessMsg(`Client trouvé pour le numéro ${apiSearchNumber}`);
      } else {
        setClients([]);
        setError(`Aucun client trouvé pour le numéro ${apiSearchNumber}`);
      }
    } catch (err: any) {
      console.error(err);
      setError(`Recherche API échouée : ${err.message || 'Numéro introuvable.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (id: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer définitivement ce compte client ?')) {
      return;
    }

    setIsDeletingId(id);
    setError('');
    setSuccessMsg('');

    try {
      await api.delete(`/users/client/${id}`);
      setSuccessMsg('Client supprimé avec succès.');
      if (selectedClient?.id === id) {
        setSelectedClient(null);
      }
      // Refresh list
      setClients(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      console.error('Delete error', err);
      setError(err.message || 'Impossible de supprimer le compte client. Le microservice est peut-être injoignable.');
    } finally {
      setIsDeletingId(null);
    }
  };

  // Filter clients locally by search input
  const filteredClients = clients.filter(c => {
    const term = searchQuery.toLowerCase();
    return (
      (c.firstName && c.firstName.toLowerCase().includes(term)) ||
      (c.lastName && c.lastName.toLowerCase().includes(term)) ||
      (c.number && c.number.includes(term)) ||
      (c.birthdate && c.birthdate.includes(term))
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
        <button className="btn btn-primary" onClick={fetchClients} style={{ marginTop: '10px' }}>
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
            Gestion des Clients
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Consultez les informations de profil des abonnés Max It et gérez leurs comptes.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchClients} disabled={loading}>
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

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Detail drawer / Panel */}
      {selectedClient && (
        <div className="details-drawer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontWeight: 600, fontSize: '1.2rem', color: 'var(--orange)' }}>
              Détails du Compte Client
            </h3>
            <button className="btn-icon-only" onClick={() => setSelectedClient(null)}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Numéro de Téléphone (MSISDN)</span>
              <span className="detail-value">{selectedClient.number}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Prénom</span>
              <span className="detail-value">{selectedClient.firstName}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Nom</span>
              <span className="detail-value">{selectedClient.lastName}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Date de naissance</span>
              <span className="detail-value">{selectedClient.birthdate || 'Non renseigné'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="filter-bar">
        <div style={{ display: 'flex', gap: '12px', flexGrow: 1, flexWrap: 'wrap' }}>
          {/* Local Filter */}
          <div className="search-input-wrapper" style={{ maxWidth: '280px' }}>
            <svg className="search-icon-svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Filtrer localement (nom, numéro)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* API Search form */}
          <form onSubmit={handleApiSearch} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Rechercher par numéro (API)..."
              style={{ width: '220px', padding: '8px 12px' }}
              value={apiSearchNumber}
              onChange={(e) => setApiSearchNumber(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }} disabled={loading}>
              Rechercher
            </button>
          </form>
        </div>
      </div>

      {/* Clients Table */}
      <div className="card-table-container">
        <div className="card-header">
          <span className="card-header-title">Liste des Abonnés ({filteredClients.length})</span>
        </div>
        <div className="table-responsive">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="3" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
              </svg>
            </div>
          ) : filteredClients.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Aucun client ne correspond aux critères de recherche.
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Numéro (MSISDN)</th>
                  <th>Prénom & Nom</th>
                  <th>Date de naissance</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <code style={{ fontSize: '0.8rem' }}>#{client.id}</code>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--orange)' }}>{client.number}</span>
                    </td>
                    <td>
                      {client.firstName} {client.lastName}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {client.birthdate || '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn-icon-only edit"
                          title="Voir les détails"
                          onClick={() => setSelectedClient(client)}
                        >
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          className="btn-icon-only danger"
                          title="Supprimer le client"
                          onClick={() => handleDeleteClient(client.id)}
                          disabled={isDeletingId === client.id}
                        >
                          {isDeletingId === client.id ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ animation: 'spin 1s linear infinite' }}>
                              <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                            </svg>
                          ) : (
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
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
