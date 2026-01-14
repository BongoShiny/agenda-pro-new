import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Settings, FileText, ShieldCheck, ArrowLeft, FileSpreadsheet, DollarSign, MessageCircle, BarChart3 } from "lucide-react";

export default function AdministradorPage() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const user = await base44.auth.me();
        setUsuarioAtual(user);
        
        // APENAS admin, gerência e financeiro têm acesso - BLOQUEIA vendedor, terapeuta, funcionário, recepção
        const cargoLower = (user?.cargo || "").toLowerCase().trim();
        const temAcesso = user?.role === "admin" || 
                         cargoLower === "administrador" || 
                         cargoLower === "gerencia_unidades" ||
                         cargoLower === "financeiro";
        
        if (!temAcesso) {
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

  // CRÍTICO: Verificar gerência PRIMEIRO para evitar conflitos
    const isGerencia = usuarioAtual?.cargo === "gerencia_unidades";
    const isFinanceiro = usuarioAtual?.cargo === "financeiro";
    const isRecepcao = usuarioAtual?.cargo === "recepcao";
    // Admin APENAS se não for gerência, financeiro ou recepção
    const isAdmin = !isGerencia && !isFinanceiro && !isRecepcao && 
                    (usuarioAtual?.cargo === "administrador" || usuarioAtual?.role === "admin");

    if (!isAdmin && !isGerencia && !isFinanceiro && !isRecepcao) {
      return null;
    }

    // Se for recepção, mostrar apenas Relatórios/Planilha
    if (isRecepcao) {
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
                  <h1 className="text-2xl font-bold text-gray-900">Área Administrativa</h1>
                  <p className="text-sm text-gray-500">Acesso aos relatórios</p>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link to={createPageUrl("RelatoriosClientes")} className="block">
                <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-emerald-300 transition-all cursor-pointer h-full">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                    <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Relatórios / Planilha</h3>
                  <p className="text-sm text-gray-500">Visualizar e exportar todos os clientes e agendamentos em formato de planilha</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      );
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
              <h1 className="text-2xl font-bold text-gray-900">Área Administrativa</h1>
              <p className="text-sm text-gray-500">{isFinanceiro ? "Acesso ao histórico" : "Acesso restrito a administradores"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* GERÊNCIA DE UNIDADES - APENAS 5 CARDS */}
              {isGerencia && (
                <>
                  <Link to={createPageUrl("ConfiguracaoTerapeutas")} className="block">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-green-300 transition-all cursor-pointer h-full">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                        <Settings className="w-6 h-6 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Configurar Terapeutas</h3>
                      <p className="text-sm text-gray-500">Gerenciar terapeutas, horários e configurações de atendimento</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("HistoricoAgendamentos")} className="block">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer h-full">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                        <FileText className="w-6 h-6 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Histórico</h3>
                      <p className="text-sm text-gray-500">Visualizar histórico de agendamentos e ações do sistema</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("RelatoriosClientes")} className="block">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-emerald-300 transition-all cursor-pointer h-full">
                      <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                        <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Relatórios / Planilha</h3>
                      <p className="text-sm text-gray-500">Visualizar e exportar todos os clientes e agendamentos em formato de planilha</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("GerenciarContratos")} className="block">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-orange-300 transition-all cursor-pointer h-full">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                        <FileText className="w-6 h-6 text-orange-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Contratos Termo 30%</h3>
                      <p className="text-sm text-gray-500">Gerenciar contratos termo 30% multa assinados pelos clientes</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("GerenciarProntuarios")} className="block">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-amber-300 transition-all cursor-pointer h-full">
                      <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                        <FileText className="w-6 h-6 text-amber-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Prontuários</h3>
                      <p className="text-sm text-gray-500">Gerenciar e exportar fichas de prontuário dos clientes</p>
                    </div>
                  </Link>
                </>
              )}

              {/* ADMINISTRADORES - TODOS OS CARDS */}
              {isAdmin && (
                <>
                  <Link to={createPageUrl("ConfiguracaoTerapeutas")} className="block">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-green-300 transition-all cursor-pointer h-full">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                        <Settings className="w-6 h-6 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Configurar Terapeutas</h3>
                      <p className="text-sm text-gray-500">Gerenciar terapeutas, horários e configurações de atendimento</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("HistoricoAgendamentos")} className="block">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer h-full">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                        <FileText className="w-6 h-6 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Histórico</h3>
                      <p className="text-sm text-gray-500">Visualizar histórico de agendamentos e ações do sistema</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("RelatoriosClientes")} className="block">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-emerald-300 transition-all cursor-pointer h-full">
                      <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                        <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Relatórios / Planilha</h3>
                      <p className="text-sm text-gray-500">Visualizar e exportar todos os clientes e agendamentos em formato de planilha</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("GerenciarContratos")} className="block">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-orange-300 transition-all cursor-pointer h-full">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                        <FileText className="w-6 h-6 text-orange-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Contratos Termo 30%</h3>
                      <p className="text-sm text-gray-500">Gerenciar contratos termo 30% multa assinados pelos clientes</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("GerenciarProntuarios")} className="block">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-amber-300 transition-all cursor-pointer h-full">
                      <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                        <FileText className="w-6 h-6 text-amber-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Prontuários</h3>
                      <p className="text-sm text-gray-500">Gerenciar e exportar fichas de prontuário dos clientes</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("Home")} className="block">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer h-full">
                      <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                        <BarChart3 className="w-6 h-6 text-indigo-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Análises</h3>
                      <p className="text-sm text-gray-500">Dashboard com visão geral, métricas e análises do sistema</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("RelatoriosAvancados")} className="block">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer h-full">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                        <BarChart3 className="w-6 h-6 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Relatórios Avançados</h3>
                      <p className="text-sm text-gray-500">Relatórios com filtros avançados, gráficos e exportação em Excel/PDF</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("GerenciarUsuarios")} className="block">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer h-full">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Usuários</h3>
                      <p className="text-sm text-gray-500">Gerenciar usuários, cargos e permissões de acesso às unidades</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("RelatoriosFinanceiros")} className="block">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-emerald-300 transition-all cursor-pointer h-full">
                      <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                        <DollarSign className="w-6 h-6 text-emerald-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Relatórios Financeiros</h3>
                      <p className="text-sm text-gray-500">Faturamento, pagamentos e valores a receber por período</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("ConfiguracaoWhatsApp")} className="block">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-green-300 transition-all cursor-pointer h-full">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                        <MessageCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">WhatsApp Automático</h3>
                      <p className="text-sm text-gray-500">Lembretes automáticos e confirmações via WhatsApp</p>
                    </div>
                  </Link>
                </>
              )}

              {/* FINANCEIRO - Histórico, Contratos e Relatórios Financeiros */}
              {isFinanceiro && !isGerencia && !isAdmin && (
                <>
                  <Link to={createPageUrl("HistoricoAgendamentos")} className="block">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer h-full">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                        <FileText className="w-6 h-6 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Histórico</h3>
                      <p className="text-sm text-gray-500">Visualizar histórico de agendamentos e ações do sistema</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("GerenciarContratos")} className="block">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-orange-300 transition-all cursor-pointer h-full">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                        <FileText className="w-6 h-6 text-orange-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Contratos Termo 30%</h3>
                      <p className="text-sm text-gray-500">Gerenciar contratos termo 30% multa assinados pelos clientes</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("GerenciarProntuarios")} className="block">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-amber-300 transition-all cursor-pointer h-full">
                      <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                        <FileText className="w-6 h-6 text-amber-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Prontuários</h3>
                      <p className="text-sm text-gray-500">Gerenciar e exportar fichas de prontuário dos clientes</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("RelatoriosFinanceiros")} className="block">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-emerald-300 transition-all cursor-pointer h-full">
                      <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                        <DollarSign className="w-6 h-6 text-emerald-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Relatórios Financeiros</h3>
                      <p className="text-sm text-gray-500">Faturamento, pagamentos e valores a receber por período</p>
                    </div>
                  </Link>
                </>
              )}
              </div>

        {isGerencia && (
          <div className="mt-8 bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-purple-900">👤 Gerência de Unidade</h4>
                <ul className="text-sm text-purple-800 mt-2 space-y-1">
                  <li>✓ Acesso APENAS à unidade atribuída</li>
                  <li>✓ Pode gerenciar terapeutas da sua unidade</li>
                  <li>✓ Pode ver histórico e relatórios da sua unidade</li>
                  <li>✓ Pode editar agenda da sua unidade</li>
                  <li>✓ Autonomia total dentro do escopo permitido</li>
                  <li>✓ Responsável pela organização operacional diária</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {!isGerencia && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Área Restrita</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  {isFinanceiro 
                    ? "Você tem acesso apenas ao Histórico de agendamentos e ações do sistema."
                    : "Apenas administradores têm acesso a esta área. As alterações feitas aqui afetam todo o sistema."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}