import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const PasswordUpdateForm = () => {
  const { updatePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword !== confirmation) {
      setError('New password and confirmation must match.');
      return;
    }

    try {
      setIsSubmitting(true);
      await updatePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      setMessage('Password updated successfully.');
    } catch (err) {
      setError('Unable to update password. Double-check your current password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <article className="password-update">
      <h3>Update your password</h3>
      <p>Change the password associated with your account after signing in.</p>
      <form onSubmit={handleSubmit} className="password-update-form">
        <label>
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </label>
        <label>
          New password
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            required
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-success">{message}</p>}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </article>
  );
};
