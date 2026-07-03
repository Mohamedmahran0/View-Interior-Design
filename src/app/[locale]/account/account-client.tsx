'use client';

import { useState } from 'react';
import { Link } from '@/i18n/routing';
import { User, CreditCard, Shield, BarChart3 } from 'lucide-react';
import ProfileContent from './profile-content';
import BillingContent from './billing-content';
import SettingsContent from './settings-content';
import UsageContent from './usage-content';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: Shield },
  { id: 'usage', label: 'Usage', icon: BarChart3 },
];

export default function AccountClient() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Account</h1>
        <p className="text-white/50 mt-1">Manage your profile, billing, and preferences.</p>
      </div>

      <div className="flex items-center gap-1 border-b border-white/10 mb-8 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-white/50 hover:text-white/80'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'profile' && <ProfileContent />}
      {activeTab === 'billing' && <BillingContent />}
      {activeTab === 'settings' && <SettingsContent />}
      {activeTab === 'usage' && <UsageContent />}
    </div>
  );
}
