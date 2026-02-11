import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export default function Layout({ children, currentPageName }) {
  const [usuarioAutorizado, setUsuarioAutorizado] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const verificarAcesso = async () => {
      try {
        const user = await base44.auth.me();

        // Bloquear completamente se cargo é "sem_acesso"
        if (user?.cargo === "sem_acesso") {
          setUsuarioAutorizado(false);
          setCarregando(false);
          return;
        }

        setUsuarioAutorizado(true);
        setCarregando(false);
      } catch (error) {
        console.error("Erro ao verificar acesso:", error);
        setCarregando(false);
      }
    };

    verificarAcesso();
  }, []);

  useEffect(() => {
    // Adicionar meta tag para desabilitar Google Translate
    const metaTag = document.querySelector('meta[name="google"]');
    if (!metaTag) {
      const meta = document.createElement('meta');
      meta.name = 'google';
      meta.content = 'notranslate';
      document.head.appendChild(meta);
    }

    // Adicionar classe notranslate no body
    document.body.classList.add('notranslate');

    // Definir idioma como inglês
    document.documentElement.lang = 'en';

    // Configurar PWA para iOS
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
      document.head.appendChild(meta);
    }

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (!themeColor) {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = '#3B82F6';
      document.head.appendChild(meta);
    }

    const appleCapable = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
    if (!appleCapable) {
      const meta = document.createElement('meta');
      meta.name = 'apple-mobile-web-app-capable';
      meta.content = 'yes';
      document.head.appendChild(meta);
    }

    const appleStatus = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!appleStatus) {
      const meta = document.createElement('meta');
      meta.name = 'apple-mobile-web-app-status-bar-style';
      meta.content = 'default';
      document.head.appendChild(meta);
    }

    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!appleTitle) {
      const meta = document.createElement('meta');
      meta.name = 'apple-mobile-web-app-title';
      meta.content = 'Agenda';
      document.head.appendChild(meta);
    }

    // Ícone para iOS
    const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (!appleTouchIcon) {
      const link = document.createElement('link');
      link.rel = 'apple-touch-icon';
      link.href = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%233B82F6"/%3E%3Ctext x="50" y="50" font-size="50" text-anchor="middle" dy=".3em" fill="white" font-family="Arial"%3EA%3C/text%3E%3C/svg%3E';
      document.head.appendChild(link);
    }
  }, []);

  if (carregando) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
  }

  if (usuarioAutorizado === false) {
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

        <button
          onClick={async () => {
            await base44.auth.logout('/');
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg"
        >
          Mudar de Login
        </button>
      </div>
    </div>
  );
  }

  return (
  <>
    {children}
  </>
  );
  }