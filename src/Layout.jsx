import React, { useEffect, useState } from "react";
import { ThemeProvider } from "@/components/ThemeContext";
import BottomTabNavigation from "@/components/BottomTabNavigation";

export default function Layout({ children, currentPageName }) {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const { base44 } = await import("@/api/base44Client");
        const user = await base44.auth.me();
        setUsuarioAtual(user);
      } catch (error) {
        console.log("Usuário não autenticado");
      }
    };
    carregarUsuario();
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

  return (
    <ThemeProvider>
      <div 
        className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 min-h-screen transition-colors"
        style={{ overscrollBehaviorY: 'none' }}
      >
        {/* Padding para safe-area no topo */}
        <div style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          {children}
        </div>
        
        {/* Bottom navigation com safe-area */}
        {usuarioAtual && <BottomTabNavigation currentPageName={currentPageName} usuarioAtual={usuarioAtual} />}
        
        <style>{`
          button, a, [role="button"], nav {
            -webkit-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
          }
          input, textarea, select, [contenteditable="true"] {
            -webkit-user-select: text;
            user-select: text;
          }
        `}</style>
      </div>
    </ThemeProvider>
  );
}