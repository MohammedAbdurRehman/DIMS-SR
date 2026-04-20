'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, Phone, Building2, Calendar, CheckCircle, AlertCircle, Trash2, Fingerprint } from 'lucide-react';
import { getValidAccessToken, getApiUrl } from '../lib/utils';
import FingerprintCapture from './fingerprint-capture';

interface RegisteredSim {
  id: string;
  simNumber: string;
  operator: string;
  registrationDate: string;
  status: 'active' | 'pending' | 'inactive';
  transactionId: string;
  fabricTxId: string | null;
}

interface ViewRegisteredSimsProps {
  cnic: string;
  onBack: () => void;
}

export default function ViewRegisteredSims({ cnic, onBack }: ViewRegisteredSimsProps) {
  const [registeredSims, setRegisteredSims] = useState<RegisteredSim[]>([]);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [showFingerprintCapture, setShowFingerprintCapture] = useState(false);
  const [fingerprintVerified, setFingerprintVerified] = useState(false);
  const [fingerprintImages, setFingerprintImages] = useState<string[]>([]);
  const [simToDeactivate, setSimToDeactivate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRegisteredSims();
  }, []);

  const fetchRegisteredSims = async () => {
    try {
      const token = await getValidAccessToken();
      if (!token) {
        setError('Session expired. Please login again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${getApiUrl()}/api/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        // Transform SIMs data
        const sims = data.sims.map((sim: any) => ({
          id: sim.id,
          simNumber: sim.mobileNumber,
          operator: sim.networkProvider,
          registrationDate: sim.registrationDate || sim.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
          status: sim.status === 'active' ? 'active' : sim.status === 'processing' ? 'pending' : 'inactive',
          transactionId: sim.transactionId,
          fabricTxId: sim.fabricTxId || null,
        }));
        setRegisteredSims(sims);
      } else {
        setError(data.error || 'Failed to fetch SIMs');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateSim = async (simId: string) => {
    setDeactivatingId(simId);
    try {
      const token = await getValidAccessToken();
      if (!token) {
        setError('Session expired. Please login again.');
        setDeactivatingId(null);
        return;
      }

      const response = await fetch(`${getApiUrl()}/api/sim/deactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          simId: simId,
          fingerprintImages: fingerprintImages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'SIM deactivation failed');
        setDeactivatingId(null);
        return;
      }

      // Update local state
      setRegisteredSims(prev => prev.map(sim =>
        sim.id === simId ? { ...sim, status: 'inactive' } : sim
      ));

      setShowConfirm(null);
      setFingerprintVerified(false);
      setFingerprintImages([]);
      setSimToDeactivate(null);
      alert('SIM deactivated successfully with biometric verification!');
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setDeactivatingId(null);
    }
  };

  const handleFingerprintVerification = (verified: boolean, images: string[]) => {
    setShowFingerprintCapture(false);
    if (verified) {
      setFingerprintVerified(true);
      setFingerprintImages(images);
      if (simToDeactivate) {
        handleDeactivateSim(simToDeactivate);
      }
    } else {
      setError('Fingerprint verification failed. Please try again.');
      setSimToDeactivate(null);
    }
  };

  const initiateDeactivation = (simId: string) => {
    setSimToDeactivate(simId);
    setShowFingerprintCapture(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'pending':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'inactive':
        return 'bg-gray-50 border-gray-200 text-gray-900';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'pending':
        return <AlertCircle className="text-yellow-600" size={20} />;
      default:
        return <AlertCircle className="text-gray-600" size={20} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'pending':
        return 'Pending Verification';
      case 'inactive':
        return 'Inactive';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Fingerprint capture modal */}
      {showFingerprintCapture && (
        <FingerprintCapture
          cnic={cnic}
          onVerificationComplete={handleFingerprintVerification}
          onCancel={() => {
            setShowFingerprintCapture(false);
            setSimToDeactivate(null);
          }}
        />
      )}

      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm sm:text-base"
      >
        <ChevronLeft size={20} />
        Back
      </button>

      <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-lg border border-border mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Registered SIMs
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          CNIC: <span className="font-semibold text-foreground">{cnic}</span>
        </p>
      </div>

      {registeredSims.length === 0 ? (
        <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-lg border border-border text-center">
          <Phone size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2">
            No SIMs Registered Yet
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            You haven't registered any SIMs yet. Visit the dashboard to register your first SIM.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {registeredSims.map((sim) => (
            <div
              key={sim.id}
              className="bg-card rounded-2xl p-6 sm:p-8 shadow-lg border border-border hover:shadow-xl transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div className="flex-1">
                  {/* SIM Number */}
                  <div className="flex items-center gap-3 mb-3">
                    <Phone size={24} className="text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">SIM Number</p>
                      <p className="text-lg sm:text-xl font-bold text-foreground font-mono">
                        {sim.simNumber}
                      </p>
                    </div>
                  </div>

                  {/* Operator */}
                  <div className="flex items-center gap-3 mb-3">
                    <Building2 size={24} className="text-secondary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Operator</p>
                      <p className="text-base sm:text-lg font-semibold text-foreground">
                        {sim.operator}
                      </p>
                    </div>
                  </div>

                  {/* Registration Date */}
                  <div className="flex items-center gap-3">
                    <Calendar size={24} className="text-accent" />
                    <div>
                      <p className="text-xs text-muted-foreground">Registration Date</p>
                      <p className="text-base sm:text-lg font-semibold text-foreground">
                        {new Date(sim.registrationDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status and Deactivate Button */}
                <div className="flex flex-col gap-2 sm:items-end">
                  <div className={`px-4 py-3 rounded-lg border flex items-center gap-2 ${getStatusColor(sim.status)}`}>
                    {getStatusIcon(sim.status)}
                    <span className="font-semibold text-sm">{getStatusLabel(sim.status)}</span>
                  </div>
                  
                  {sim.status === 'active' && (
                    <>
                      {showConfirm === sim.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowConfirm(null)}
                            className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => initiateDeactivation(sim.id)}
                            disabled={deactivatingId === sim.id}
                            className="px-3 py-2 text-sm bg-destructive text-primary-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            <Fingerprint size={16} />
                            {deactivatingId === sim.id ? 'Processing...' : 'Verify & Deactivate'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowConfirm(sim.id)}
                          className="px-3 py-2 text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/20 transition-colors flex items-center gap-2"
                        >
                          <Trash2 size={16} />
                          Deactivate
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Fabric TX ID */}
              <div className="bg-muted rounded-lg p-3 mt-4">
                <p className="text-xs text-muted-foreground mb-1">Fabric TX ID</p>
                <p className="text-sm font-mono text-foreground break-all">
                  {sim.fabricTxId || sim.transactionId || 'N/A'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {registeredSims.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <div className="bg-card rounded-xl p-6 text-center shadow-lg border border-border">
            <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">
              {registeredSims.length}
            </div>
            <p className="text-muted-foreground text-sm">Total Registered</p>
          </div>
          <div className="bg-card rounded-xl p-6 text-center shadow-lg border border-border">
            <div className="text-3xl sm:text-4xl font-bold text-green-600 mb-2">
              {registeredSims.filter(s => s.status === 'active').length}
            </div>
            <p className="text-muted-foreground text-sm">Active SIMs</p>
          </div>
          <div className="bg-card rounded-xl p-6 text-center shadow-lg border border-border">
            <div className="text-3xl sm:text-4xl font-bold text-yellow-600 mb-2">
              {registeredSims.filter(s => s.status === 'pending').length}
            </div>
            <p className="text-muted-foreground text-sm">Pending</p>
          </div>
        </div>
      )}
    </div>
  );
}
