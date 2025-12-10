import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { registerDomain } from '../services/domainHooks';
import { useAuth } from '../contexts/AuthContext';

const registrarOptions = ['internal', 'namecheap', 'cloudflare'];

export const DomainRegistrationForm = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [domainName, setDomainName] = useState('');
  const [registrarProvider, setRegistrarProvider] = useState('internal');
  const [error, setError] = useState(null);

  const mutation = useMutation({
    mutationFn: (payload) => registerDomain(payload),
    onSuccess: (domain) => {
      setDomainName('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['domains', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['domain-analytics', domain.id] });
    },
    onError: (mutationError) => {
      if (mutationError instanceof Error) {
        setError(mutationError.message);
      } else {
        setError('Unable to register domain right now.');
      }
    }
  });

  if (!user) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    mutation.mutate({ domainName, registrarProvider });
  };

  if (user.role !== 'admin') {
    return (
      <article className="info-card">
        <p className="eyebrow">Domain onboarding</p>
        <h3>Domain registration</h3>
        <p>You need administrator privileges to connect new domains.</p>
      </article>
    );
  }

  return (
    <article className="domain-registration">
      <p className="eyebrow">Domain onboarding</p>
      <h3>Register & verify</h3>
      <p className="form-lead">
        Trigger the Python registrar agent to claim DNS, write nginx, request certbot, and wire AWStats telemetry in one move.
      </p>
      <form onSubmit={handleSubmit} className="domain-registration-form">
        <label>
          Domain name
          <input
            type="text"
            value={domainName}
            onChange={(event) => setDomainName(event.target.value)}
            placeholder="example.com"
            required
          />
        </label>
        <label>
          Registrar provider
          <select value={registrarProvider} onChange={(event) => setRegistrarProvider(event.target.value)}>
            {registrarOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Registering…' : 'Register domain'}
        </button>
      </form>
      <p className="form-hint">Includes consent-check endpoint and automatic TLS renewals.</p>
    </article>
  );
};
