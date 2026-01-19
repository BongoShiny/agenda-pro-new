import React, { useEffect } from "react";

export default function Layout({ children, currentPageName }) {
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
  }, []);

  return (
    <>
      {children}
    </>
  );
}