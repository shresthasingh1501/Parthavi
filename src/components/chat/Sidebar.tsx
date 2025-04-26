import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sparkles,
  MessageSquare,
  Settings,
  User,
  History,
  Volume2,
  Share2,
  MessageCircle,
  Shield,
  FileText
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  
  const menuItems = [
    { icon: Sparkles, label: 'Discover', path: '/discover' },
    { icon: MessageSquare, label: 'Threads', path: '/threads' },
    { icon: User, label: 'Profile', path: '/profile' }
  ];

  const secondaryItems = [
    { icon: History, label: 'Manage history', path: '/history' },
    { icon: Volume2, label: 'Voice settings', path: '/voice' },
    { icon: MessageCircle, label: 'Give feedback', path: '/feedback' },
    { icon: Share2, label: 'Share Parthavi', path: '/share' },
    { icon: Shield, label: 'Privacy policy', path: '/privacy' },
    { icon: FileText, label: 'Terms of service', path: '/terms' }
  ];

  return (
    <div className="w-64 bg-background border-r border-gray-200 h-screen flex flex-col">
      <div className="p-4">
        <h1 className="text-xl font-serif text-secondary">Parthavi</h1>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <div className="px-3 py-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-secondary hover:bg-gray-100 transition-colors ${
                location.pathname === item.path ? 'bg-gray-100' : ''
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="border-t border-gray-200 mt-4 pt-4 px-3">
          {secondaryItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-secondary hover:bg-gray-100 transition-colors"
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;