import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Settings, FileText, ShieldCheck, ArrowLeft, FileSpreadsheet, DollarSign, MessageCircle } from "lucide-react";

export default function AdministradorPage() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const user = await base44.auth.me();
        setUsuarioAtual(user);
        
        // Se não for admin, gerência ou financeiro, redireciona para agenda
        const isAdmin = user?.cargo === "administrador" || user?.cargo === "superior" || user?.role === "admin" || user?.cargo === "gerencia_unidades" || user?.cargo === "financeiro";
        if (!isAdmin) {
          navigate(createPageUrl("Agenda"));
        }
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
        navigate(createPageUrl("Agenda"));
      } finally {
        setCarregando(false);
      }
    };
    carregarUsuario();
  }, [navigate]);

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  const isAdmin = usuarioAtual?.cargo === "administrador" || usuarioAtual?.cargo === "superior" || usuarioAtual?.role === "admin";
  const isGerencia = usuarioAtual?.cargo === "gerencia_unidades";
  const isFinanceiro = usuarioAtual?.cargo === "financeiro";

  if (!isAdmin && !isGerencia && !isFinanceiro) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to={createPageUrl("Agenda")}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Área dos Superiores</h1>
              <p className="text-sm text-gray-500">{isFinanceiro ? "Acesso ao histórico" : "Acesso restrito a superiores"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(isAdmin || isGerencia) && (
            <Link to={createPageUrl("GerenciarUsuarios")} className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer h-full">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Usuários</h3>
              <p className="text-sm text-gray-500">Gerenciar usuários, cargos e permissões de acesso às unidades</p>
            </div>
          </Link>
          )}

          {(isAdmin || isGerencia) && (
          <Link to={createPageUrl("ConfiguracaoTerapeutas")} className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-green-300 transition-all cursor-pointer h-full">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Settings className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Configurar Terapeutas</h3>
              <p className="text-sm text-gray-500">Gerenciar terapeutas, horários e configurações de atendimento</p>
            </div>
          </Link>
          )}

          <Link to={createPageUrl("HistoricoAgendamentos")} className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer h-full">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Histórico</h3>
              <p className="text-sm text-gray-500">Visualizar histórico de agendamentos e ações do sistema</p>
            </div>
          </Link>

          {(isAdmin || isGerencia) && (
          <Link to={createPageUrl("RelatoriosClientes")} className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-emerald-300 transition-all cursor-pointer h-full">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Relatórios / Planilha</h3>
              <p className="text-sm text-gray-500">Visualizar e exportar todos os clientes e agendamentos em formato de planilha</p>
            </div>
          </Link>
          )}

          <Link to={createPageUrl("RelatoriosFinanceiros")} className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-emerald-300 transition-all cursor-pointer h-full">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Relatórios Financeiros</h3>
              <p className="text-sm text-gray-500">Faturamento, pagamentos e valores a receber por período</p>
            </div>
          </Link>

          {isAdmin && (
          <Link to={createPageUrl("ConfiguracaoWhatsApp")} className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-green-300 transition-all cursor-pointer h-full">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">WhatsApp Automático</h3>
              <p className="text-sm text-gray-500">Lembretes automáticos e confirmações via WhatsApp</p>
            </div>
          </Link>
          )}
          </div>

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Área Restrita</h4>
              <p className="text-sm text-yellow-700 mt-1">
                {isFinanceiro 
                  ? "Você tem acesso apenas ao Histórico de agendamentos e ações do sistema."
                  : "Apenas superiores têm acesso a esta área. As alterações feitas aqui afetam todo o sistema."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}