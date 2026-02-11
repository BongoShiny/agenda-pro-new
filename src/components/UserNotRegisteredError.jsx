import React from 'react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { LogOut } from 'lucide-react';

const UserNotRegisteredError = () => {
  const handleMudarLogin = async () => {
    await base44.auth.logout('/');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <style>{`
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .blink-animation {
          animation: blink 0.7s infinite;
        }
      `}</style>
      
      <div className="text-center blink-animation">
        <h1 className="text-5xl font-bold text-red-600 mb-4">VOCÊ NÃO TEM PERMISSÃO</h1>
        <p className="text-xl text-gray-700 mb-8">Acesso bloqueado pelo administrador</p>
        
        <Button
          onClick={handleMudarLogin}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6"
        >
          <LogOut className="w-5 h-5" />
          Mudar de Login
        </Button>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;