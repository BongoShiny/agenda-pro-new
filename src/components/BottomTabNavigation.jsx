import React from 'react';
import { Calendar, BarChart3, Clock, Settings, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function BottomTabNavigation({ currentPageName, usuarioAtual }) {
  const isAdmin = usuarioAtual?.role === 'admin' || usuarioAtual?.cargo === 'administrador' || usuarioAtual?.cargo === 'superior';
  const isFinanceiro = usuarioAtual?.cargo === 'financeiro';
  const isPosVenda = usuarioAtual?.cargo === 'pos_venda';

  const tabs = [
    { name: 'Agenda', path: 'Agenda', icon: Calendar, show: true },
    { name: 'Histórico', path: 'HistoricoClientes', icon: Clock, show: true },
    { name: 'Dashboard', path: 'Home', icon: BarChart3, show: isAdmin || isFinanceiro || isPosVenda },
    { name: 'Admin', path: 'Administrador', icon: Settings, show: isAdmin },
  ].filter(tab => tab.show);

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40 flex justify-around items-center shadow-lg"
      style={{ 
        paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
        minHeight: '60px'
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentPageName === tab.path;
        
        return (
          <Link
            key={tab.path}
            to={createPageUrl(tab.path)}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-2 transition-all select-none active:scale-95 ${
              isActive
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
            style={{ 
              minHeight: '56px',
              touchAction: 'manipulation',
              borderTop: isActive ? '3px solid currentColor' : '3px solid transparent'
            }}
          >
            <Icon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium truncate max-w-full">{tab.name}</span>
          </Link>
        );
      })}
    </div>
  );
}