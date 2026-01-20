import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Loader, Download, FileText, Zap } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formatarDataBR = (data) => {
  return format(new Date(data + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR });
};

const formatarMoeda = (valor) => {
  if (!valor && valor !== 0) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

export default function RelatoriosGeradosPage() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [periodoSelecionado, setPeriodoSelecionado] = useState("diario");
  const [gerando, setGerando] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const user = await base44.auth.me();
        setUsuarioAtual(user);
        if (user?.role !== "admin") {
          navigate(createPageUrl("Agenda"));
        }
      } catch (error) {
        navigate(createPageUrl("Agenda"));
      } finally {
        setCarregando(false);
      }
    };
    carregarUsuario();
  }, [navigate]);

  const { data: relatorios = [] } = useQuery({
    queryKey: ['relatorios-vendas'],
    queryFn: () => base44.entities.RelatorioVendas.list("-created_date"),
    initialData: [],
  });

  const gerarRelatorioMutation = useMutation({
    mutationFn: async (periodo) => {
      const hoje = new Date();
      let dataInicio, dataFim;

      switch (periodo) {
        case "diario":
          dataInicio = format(hoje, "yyyy-MM-dd");
          dataFim = format(hoje, "yyyy-MM-dd");
          break;
        case "semanal":
          dataInicio = format(startOfWeek(hoje, { weekStartsOn: 1 }), "yyyy-MM-dd");
          dataFim = format(endOfWeek(hoje, { weekStartsOn: 1 }), "yyyy-MM-dd");
          break;
        case "mensal":
          dataInicio = format(startOfMonth(hoje), "yyyy-MM-dd");
          dataFim = format(endOfMonth(hoje), "yyyy-MM-dd");
          break;
        default:
          dataInicio = format(hoje, "yyyy-MM-dd");
          dataFim = format(hoje, "yyyy-MM-dd");
      }

      const response = await base44.functions.invoke('gerarRelatorioVendas', {
        periodo,
        dataInicio,
        dataFim
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relatorios-vendas'] });
      alert("✅ Relatório gerado com sucesso!");
    },
    onError: (error) => {
      alert("❌ Erro ao gerar relatório: " + error.message);
    }
  });

  const handleGerarRelatorio = async () => {
    setGerando(true);
    try {
      await gerarRelatorioMutation.mutateAsync(periodoSelecionado);
    } finally {
      setGerando(false);
    }
  };

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
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to={createPageUrl("Administrador")}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Relatórios de Vendas com IA</h1>
              <p className="text-sm text-gray-500">Gere relatórios automáticos com insights de desempenho</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Gerador de Relatórios */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Gerar Novo Relatório
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Selecione o Período</label>
                <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diario">📅 Relatório Diário (Hoje)</SelectItem>
                    <SelectItem value="semanal">📊 Relatório Semanal (Esta Semana)</SelectItem>
                    <SelectItem value="mensal">📈 Relatório Mensal (Este Mês)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleGerarRelatorio}
                disabled={gerando}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {gerando ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Gerar Relatório
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Relatórios */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Relatórios Gerados</h2>
          {relatorios.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhum relatório gerado ainda. Clique em "Gerar Relatório" para começar!</p>
            </div>
          ) : (
            relatorios.map((relatorio) => (
              <Card key={relatorio.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg capitalize">
                        Relatório {relatorio.periodo} - {formatarDataBR(relatorio.data_inicio)}
                        {relatorio.data_inicio !== relatorio.data_fim && (
                          <span> a {formatarDataBR(relatorio.data_fim)}</span>
                        )}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        Gerado em {format(new Date(relatorio.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })} por {relatorio.gerado_por}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 font-medium">Total de Vendas</p>
                      <p className="text-2xl font-bold text-blue-600">{relatorio.total_vendas}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 font-medium">Valor Total</p>
                      <p className="text-2xl font-bold text-green-600">{formatarMoeda(relatorio.total_valor)}</p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 font-medium">Recebido</p>
                      <p className="text-2xl font-bold text-emerald-600">{formatarMoeda(relatorio.total_recebido)}</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 font-medium">Taxa Recebimento</p>
                      <p className="text-2xl font-bold text-purple-600">{relatorio.taxa_recebimento?.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                      {relatorio.conteudo_relatorio}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}