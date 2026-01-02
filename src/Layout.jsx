import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import ChatBot from "./components/ChatBot";

export default function Layout({ children, currentPageName }) {
  const [usuarioAtual, setUsuarioAtual] = useState(null);

  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const user = await base44.auth.me();
        setUsuarioAtual(user);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };
    carregarUsuario();
  }, []);

  return (
    <div className="min-h-screen">
      {children}
      {usuarioAtual && <ChatBot usuarioAtual={usuarioAtual} />}
    </div>
  );
}