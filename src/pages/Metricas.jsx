import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, UserPlus, DollarSign } from "lucide-react";

export default function MetricasPage() {
  const navigate = useNavigate();
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const user = await base44.auth.me();
        setUsuarioAtual(user);
        
        const isAdmin = user?.cargo === "administrador" || user?.cargo === "superior" || user?.role === "admin";
        const isGerencia = user?.cargo === "gerencia_unidades";
        const isMetricas = user?.cargo === "metricas";
        
        if (!isAdmin && !isGerencia && !isMetricas) {
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
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Métricas</h1>
              <p className="text-sm text-gray-500">Análises e relatórios importantes</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to={createPageUrl("PacientesNovos")} className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer h-full">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <UserPlus className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Pacientes Novos</h3>
              <p className="text-sm text-gray-500">Acompanhe pacientes novos e últimas sessões do dia</p>
            </div>
          </Link>

          <Link to={createPageUrl("AnaliseCruzada")} className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer h-full">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Conversão Recepção</h3>
              <p className="text-sm text-gray-500">Terapeuta x Recepção - Taxa de conversão e gaps identificados</p>
            </div>
          </Link>

          <Link to={createPageUrl("AnaliseVendas")} className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-green-300 transition-all cursor-pointer h-full">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Análise de Vendas</h3>
              <p className="text-sm text-gray-500">Métricas de vendas, rankings e performance por período</p>
            </div>
          </Link>

          <Link to={createPageUrl("RelatoriosAvancados")} className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer h-full">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Índice de Comparecimento</h3>
              <p className="text-sm text-gray-500">Relatórios com filtros avançados, gráficos e exportação em Excel/PDF</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}