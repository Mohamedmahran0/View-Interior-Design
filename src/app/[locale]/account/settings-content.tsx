'use client';

import { useSupabase } from '@/providers/supabase-provider';
import { useState } from 'react';
import { Shield, Key, Trash2, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function SettingsContent() {
  const { supabase, user } = useSupabase();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    setChangingPassword(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setChangingPassword(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    const { error } = await supabase.rpc('delete_user_account');
    if (error) {
      setMessage({ type: 'error', text: error.message });
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <Key size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Change Password</h2>
            <p className="text-sm text-white/50">Update your account password.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500/50 text-white placeholder:text-white/30 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500/50 text-white placeholder:text-white/30 transition"
            />
          </div>
          <button
            onClick={handlePasswordChange}
            disabled={changingPassword || !newPassword || !confirmPassword}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-semibold transition disabled:opacity-50"
          >
            {changingPassword ? <Loader2 size={18} className="animate-spin" /> : <Key size={18} />}
            Update Password
          </button>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Shield size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Two-Factor Authentication</h2>
            <p className="text-sm text-white/50">Add an extra layer of security to your account.</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Enable 2FA</p>
            <p className="text-sm text-white/50">Protect your account with a second authentication factor.</p>
          </div>
          <button
            onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
            className={`relative w-12 h-7 rounded-full transition ${
              twoFactorEnabled ? 'bg-emerald-500' : 'bg-white/10'
            }`}
          >
            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition ${
              twoFactorEnabled ? 'left-5.5 right-0.5' : 'left-0.5'
            }`} style={{ left: twoFactorEnabled ? '22px' : '2px' }}></div>
          </button>
        </div>
      </div>

      <div className="bg-white/5 border border-red-500/20 backdrop-blur-xl rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
            <Trash2 size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-red-400">Delete Account</h2>
            <p className="text-sm text-white/50">Permanently delete your account and all data.</p>
          </div>
        </div>
        <p className="text-sm text-white/40 mb-4">
          This action cannot be undone. All your projects, settings, and data will be permanently erased.
        </p>
        <button
          onClick={() => setDeleteModal(true)}
          className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl font-semibold transition"
        >
          Delete Account
        </button>
      </div>

      {message && (
        <div className={`flex items-center gap-3 px-5 py-3 rounded-xl text-sm ${
          message.type === 'success' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto hover:opacity-70"><X size={14} /></button>
        </div>
      )}

      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-red-400">Delete Account</h3>
              <button onClick={() => setDeleteModal(false)} className="p-1 hover:bg-white/10 rounded-lg transition">
                <X size={18} />
              </button>
            </div>
            <p className="text-white/60 mb-2">This will permanently delete your account and all associated data.</p>
            <p className="text-sm text-white/40 mb-4">
              Type <span className="text-red-400 font-mono font-bold">DELETE</span> to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-red-500/50 text-white placeholder:text-white/30 transition mb-4"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setDeleteModal(false); setDeleteConfirm(''); }}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm !== 'DELETE'}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl font-semibold transition disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
