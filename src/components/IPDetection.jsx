import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

export function useIPDetection() {
  const [ip, setIp] = useState(null);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchAndCheckIP = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        const currentIP = data.ip;
        
        setIp(currentIP);
        
        const registeredIPs = JSON.parse(localStorage.getItem('registered_ips') || '[]');
        const isNew = !registeredIPs.includes(currentIP);
        
        setIsFirstTime(isNew);
        
        if (isNew) {
          registeredIPs.push(currentIP);
          localStorage.setItem('registered_ips', JSON.stringify(registeredIPs));
        }
        
        setLoaded(true);
      } catch (error) {
        console.error('Erro ao capturar IP:', error);
        setLoaded(true);
      }
    };
    
    fetchAndCheckIP();
  }, []);

  return { ip, isFirstTime, loaded };
}

export function IPRedirectComponent({ children }) {
  const navigate = useNavigate();
  const { isFirstTime, loaded } = useIPDetection();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [ip, setIp] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await base44.auth.me();
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
      }
      setCheckingAuth(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const getIP = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setIp(data.ip);
      } catch (error) {
        console.error('Erro ao capturar IP:', error);
      }
    };
    getIP();
  }, []);

  useEffect(() => {
    // Só redireciona se: IP é novo E usuário não está autenticado
    if (loaded && !checkingAuth && isFirstTime && !isAuthenticated && ip) {
      // Se IP é novo, já marcar que visitou registro
      localStorage.setItem(`registro_visitado_${ip}`, 'true');
      
      // Só redirecionar se não está já na página de registro
      const isOnRegistroPage = window.location.href.includes('/registro');
      if (!isOnRegistroPage) {
        navigate(createPageUrl('Registro'));
      }
    }
  }, [loaded, checkingAuth, isFirstTime, isAuthenticated, ip, navigate]);

  if (!loaded || checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  return children;
}