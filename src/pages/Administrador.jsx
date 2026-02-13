import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Settings, FileText, ShieldCheck, ArrowLeft, FileSpreadsheet, DollarSign, MessageCircle, BarChart3, Calendar, UserCheck, AlertCircle, UserPlus, Download } from "lucide-react";

export default function AdministradorPage() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const user = await base44.auth.me();
        setUsuarioAtual(user);
        
        // Se não for admin, gerência, financeiro, pós-venda ou métricas, redireciona para agenda
        const isAdmin = user?.cargo === "administrador" || user?.cargo === "superior" || user?.role === "admin" || user?.cargo === "gerencia_unidades" || user?.cargo === "financeiro" || user?.cargo === "pos_venda" || user?.cargo === "metricas";
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
  const isPosVenda = usuarioAtual?.cargo === "pos_venda";
  const isMetricas = usuarioAtual?.cargo === "metricas";

  if (!isAdmin && !isGerencia && !isFinanceiro && !isPosVenda && !isMetricas) {
    return null;
  }

  const exportarUsuarios = async () => {
    try {
      const usuarios = await base44.entities.User.list();
      
      const headers = ["id", "created_date", "updated_date", "created_by_id", "is_sample", "email", "full_name", "cargo", "role", "unidades_acesso", "ativo", "invite_token", "invite_expires_at", "password_hash", "password_salt"];
      
      const linhas = usuarios.map(u => [
        u.id || "",
        u.created_date || "",
        u.updated_date || "",
        u.created_by || "",
        "", // is_sample (não existe no Base44)
        u.email || "",
        u.full_name || "",
        u.cargo || "",
        u.role || "",
        u.unidades_acesso ? JSON.stringify(u.unidades_acesso) : "",
        u.ativo !== undefined ? String(u.ativo) : "",
        "", // invite_token (não acessível)
        "", // invite_expires_at (não acessível)
        "", // password_hash (não acessível por segurança)
        ""  // password_salt (não acessível por segurança)
      ]);

      const csv = [headers, ...linhas].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `usuarios_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      alert(`✅ ${usuarios.length} usuários exportados com sucesso!`);
    } catch (error) {
      console.error("Erro ao exportar usuários:", error);
      alert("❌ Erro ao exportar: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to={createPageUrl("Agenda")}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Área dos Superiores</h1>
              <p className="text-sm text-gray-500">
                {isFinanceiro ? "Acesso ao histórico" : 
                 isMetricas ? "Acesso a análises e relatórios avançados" : 
                 "Acesso restrito a superiores"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button onClick={exportarUsuarios} variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100">
                <Download className="w-4 h-4 mr-2" />
                Exportar Usuários
              </Button>
            )}
            {(isAdmin || isGerencia || isMetricas) && (
              <Link to={createPageUrl("Metricas")}>
                <Button variant="outline" className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Métricas
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(isAdmin || isGerencia || isMetricas) && (
            <Link to={createPageUrl("Home")} className="block">
              <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer h-full">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Análises</h3>
                <p className="text-sm text-gray-500">Dashboard com visão geral, métricas e análises do sistema</p>
              </div>
            </Link>
          )}

          {(isAdmin || isGerencia) && (
            <Link to={createPageUrl("PacientesNovos")} className="block">
              <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer h-full">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <UserPlus className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Pacientes Novos</h3>
                <p className="text-sm text-gray-500">Acompanhe pacientes novos e últimas sessões do dia</p>
              </div>
            </Link>
          )}

          {(isAdmin || isGerencia || isMetricas) && (
          <Link to={createPageUrl("AnaliseCruzada")} className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer h-full">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Conversão Recepção</h3>
              <p className="text-sm text-gray-500">Terapeuta x Recepção - Taxa de conversão e gaps identificados</p>
            </div>
          </Link>
          )}

          {(isAdmin || isGerencia || isMetricas) && (
          <Link to={createPageUrl("AnaliseVendas")} className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-green-300 transition-all cursor-pointer h-full">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Análise de Vendas</h3>
              <p className="text-sm text-gray-500">Métricas de vendas, rankings e performance por período</p>
            </div>
          </Link>
          )}

          {(isAdmin || isGerencia || isMetricas) && (
            <Link to={createPageUrl("RelatoriosAvancados")} className="block">
              <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer h-full">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Índice de Comparecimento</h3>
                <p className="text-sm text-gray-500">Relatórios com filtros avançados, gráficos e exportação em Excel/PDF</p>
              </div>
            </Link>
          )}

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

          {(isAdmin || isGerencia) && (
          <Link to={createPageUrl("ConfiguracaoSabado")} className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-cyan-300 transition-all cursor-pointer h-full">
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Configurar Sábados</h3>
              <p className="text-sm text-gray-500">Limite de atendimentos por hora aos sábados</p>
            </div>
          </Link>
          )}

          {(isAdmin || isGerencia) && (
          <Link to={createPageUrl("ConfigurarRecepcionistas")} className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-pink-300 transition-all cursor-pointer h-full">
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                <UserCheck className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Configurar Recepcionistas</h3>
              <p className="text-sm text-gray-500">Gerenciar recepcionistas e suas unidades de atuação</p>
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

          {(isAdmin || isGerencia || isPosVenda) && (
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

          {!isPosVenda && (
          <Link to={createPageUrl("RelatoriosFinanceiros")} className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-emerald-300 transition-all cursor-pointer h-full">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Relatórios Financeiros</h3>
              <p className="text-sm text-gray-500">Faturamento, pagamentos e valores a receber por período</p>
            </div>
          </Link>
          )}

          {(isAdmin || isGerencia || isFinanceiro) && (
          <Link to={createPageUrl("GerenciarContratos")} className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-orange-300 transition-all cursor-pointer h-full">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Contratos Termo 30%</h3>
              <p className="text-sm text-gray-500">Gerenciar contratos termo 30% multa assinados pelos clientes</p>
            </div>
          </Link>
          )}

          {(isAdmin || isGerencia || (isFinanceiro && usuarioAtual?.cargo !== "recepcao")) && (
          <Link to={createPageUrl("GerenciarProntuarios")} className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-amber-300 transition-all cursor-pointer h-full">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Prontuários</h3>
              <p className="text-sm text-gray-500">Gerenciar e exportar fichas de prontuário dos clientes</p>
            </div>
          </Link>
          )}

          {isAdmin && (
          <Link to={createPageUrl("WhatsAppCompleto")} className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-green-300 transition-all cursor-pointer h-full">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">WhatsApp Completo</h3>
              <p className="text-sm text-gray-500">Configuração, webhook e testes de WhatsApp</p>
            </div>
          </Link>
          )}

          {isAdmin && (
          <Link to={createPageUrl("GerenciarServicos")} className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer h-full">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">💆</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Gerenciar Serviços</h3>
              <p className="text-sm text-gray-500">Criar e editar serviços Vibe Terapias</p>
            </div>
          </Link>
          )}

          {(isAdmin || isGerencia) && (
          <Link to={createPageUrl("GerenciarClientesVendas")} className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-teal-300 transition-all cursor-pointer h-full">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Gerenciar Clientes do Lançar Vendas</h3>
              <p className="text-sm text-gray-500">Gerenciar e visualizar clientes cadastrados no lançamento de vendas</p>
            </div>
          </Link>
          )}

          {(isAdmin || isGerencia) && (
          <Link to={createPageUrl("HistoricoClientes")} className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer h-full">
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ver Histórico dos Clientes</h3>
              <p className="text-sm text-gray-500">Visualize o histórico completo de atendimentos de cada cliente</p>
            </div>
          </Link>
          )}

          {(isAdmin || isGerencia) && (
          <Link to={createPageUrl("RelatorioErrosImportacao")} className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-red-300 transition-all cursor-pointer h-full">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Erros de Importação</h3>
              <p className="text-sm text-gray-500">Relatório detalhado de erros ao importar leads</p>
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
                  : isPosVenda
                  ? "Você tem acesso aos Relatórios/Planilha com as unidades permitidas."
                  : isMetricas
                  ? "Você tem acesso apenas a Análises e Relatórios Avançados."
                  : "Apenas superiores têm acesso a esta área. As alterações feitas aqui afetam todo o sistema."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}