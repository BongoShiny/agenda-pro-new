import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Target, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Label } from "@/components/ui/label";

const criarDataPura = (dataString) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

export default function AnaliseCruzadaPage() {
  const [dataInicioAnalise, setDataInicioAnalise] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dataFimAnalise, setDataFimAnalise] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [unidadeAnalise, setUnidadeAnalise] = useState("todas");
  const [gapExpandido, setGapExpandido] = useState(null);

  const { data: usuarioAtual } = useQuery({
    queryKey: ['usuario-atual'],
    queryFn: () => base44.auth.me(),
  });

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-analise'],
    queryFn: () => base44.entities.Agendamento.list("-data"),
    initialData: [],
  });

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades-analise'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
  });

  const { data: profissionais = [] } = useQuery({
    queryKey: ['profissionais-analise'],
    queryFn: () => base44.entities.Profissional.list("nome"),
    initialData: [],
  });

  // Verificar acesso
  const isAdmin = usuarioAtual?.cargo === "administrador" || usuarioAtual?.cargo === "superior" || usuarioAtual?.role === "admin";
  const unidadesFiltradas = isAdmin ? unidades : unidades.filter(u => usuarioAtual?.unidades_acesso?.includes(u.id));

  if (!isAdmin && usuarioAtual?.cargo !== "gerencia_unidades" && usuarioAtual?.cargo !== "metricas") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-bold mb-2">⚠️ Acesso Negado</div>
          <p className="text-gray-600">Apenas superiores podem acessar esta página.</p>
        </div>
      </div>
    );
  }

  // Filtrar agendamentos com data_conversao
  const agendamentosAnalise = agendamentos.filter(ag => {
    if (!ag.data_conversao) return false;
    if (ag.status === "bloqueio" || ag.tipo === "bloqueio" || ag.cliente_nome === "FECHADO") return false;

    const dataConv = ag.data_conversao.substring(0, 10);
    if (dataConv < dataInicioAnalise || dataConv > dataFimAnalise) return false;

    if (unidadeAnalise !== "todas" && ag.unidade_id !== unidadeAnalise) return false;

    return true;
  });

  const totalAnalises = agendamentosAnalise.length;
  const totalConversoes = agendamentosAnalise.filter(ag => ag.conversao_converteu === true).length;
  const taxaMediaGeral = totalAnalises > 0 ? ((totalConversoes / totalAnalises) * 100).toFixed(1) : 0;

  // Construir matriz: Recepção x Terapeuta
  const matrizDados = {};
  const terapeutasSet = new Set();
  const recepcionistasSet = new Set();

  // Função para normalizar nomes e remover duplicados
  const normalizarNome = (nome) => {
    if (!nome) return "Sem informação";
    
    const nomeOriginal = nome.trim();
    const nomeNormalizado = nomeOriginal.toLowerCase();
    
    // Mapeamento de duplicados conhecidos
    const mapeamentos = {
      'fabiane': 'Fabiane',
      'flavia': 'Flávia',
      'flávia': 'Flávia',
      'roger': 'ROGER LONDRINA', // Mapeia ROGER genérico para ROGER LONDRINA
    };
    
    // Se o nome está no mapeamento, retorna o valor mapeado
    if (mapeamentos[nomeNormalizado]) {
      return mapeamentos[nomeNormalizado];
    }
    
    // Caso contrário, mantém o nome original (preserva "ROGER LONDRINA" e "ROGER PAULISTA" como distintos)
    return nomeOriginal;
  };

  agendamentosAnalise.forEach(ag => {
    // Buscar nome oficial do terapeuta pela entidade Profissional
    let terapeuta = "Sem Terapeuta";
    
    // Tentar buscar pelo ID primeiro
    if (ag.conversao_profissional_id) {
      const profissional = profissionais.find(p => p.id === ag.conversao_profissional_id);
      terapeuta = profissional ? profissional.nome : (ag.conversao_profissional_nome || ag.profissional_nome || "Sem Terapeuta");
    } else if (ag.profissional_id) {
      const profissional = profissionais.find(p => p.id === ag.profissional_id);
      terapeuta = profissional ? profissional.nome : (ag.conversao_profissional_nome || ag.profissional_nome || "Sem Terapeuta");
    } else {
      // Tentar buscar pelo nome (normalizado) se não tiver ID
      const nomeParaBuscar = ag.conversao_profissional_nome || ag.profissional_nome;
      if (nomeParaBuscar) {
        const profissional = profissionais.find(p => 
          p.nome.toLowerCase().trim() === nomeParaBuscar.toLowerCase().trim()
        );
        terapeuta = profissional ? profissional.nome : nomeParaBuscar;
      }
    }
    terapeuta = normalizarNome(terapeuta);
    
    let recepcao = normalizarNome(ag.conversao_recepcionista || ag.conversao_recepcionista_nao_converteu || "Sem Recepção");
    
    // Flávia é SEMPRE recepcionista, nunca terapeuta
    // Se ela aparecer como terapeuta, ignorar este registro
    if (terapeuta.toLowerCase().includes('flavia') || terapeuta.toLowerCase().includes('flávia')) {
      return; // Pula este registro
    }
    
    terapeutasSet.add(terapeuta);
    recepcionistasSet.add(recepcao);

    const chave = `${recepcao}|${terapeuta}`;
    if (!matrizDados[chave]) {
      matrizDados[chave] = {
        total: 0,
        convertidos: 0
      };
    }
    matrizDados[chave].total++;
    if (ag.conversao_converteu === true) {
      matrizDados[chave].convertidos++;
    }
  });

  const terapeutas = Array.from(terapeutasSet).sort();
  const recepcionistas = Array.from(recepcionistasSet).sort();

  // Calcular totais por recepcionista
  const totaisPorRecepcao = {};
  recepcionistas.forEach(rec => {
    let total = 0;
    let convertidos = 0;
    terapeutas.forEach(ter => {
      const dados = matrizDados[`${rec}|${ter}`];
      if (dados) {
        total += dados.total;
        convertidos += dados.convertidos;
      }
    });
    totaisPorRecepcao[rec] = {
      total,
      convertidos,
      taxa: total > 0 ? (convertidos / total) * 100 : 0
    };
  });

  // Calcular totais por terapeuta
  const totaisPorTerapeuta = {};
  terapeutas.forEach(ter => {
    let total = 0;
    let convertidos = 0;
    recepcionistas.forEach(rec => {
      const dados = matrizDados[`${rec}|${ter}`];
      if (dados) {
        total += dados.total;
        convertidos += dados.convertidos;
      }
    });
    totaisPorTerapeuta[ter] = {
      total,
      convertidos,
      taxa: total > 0 ? (convertidos / total) * 100 : 0
    };
  });

  // Identificar todos os gaps (todas as taxas)
  const gapsRecepcao = recepcionistas
    .map(rec => ({
      tipo: "Recepção",
      nome: rec,
      ...totaisPorRecepcao[rec]
    }))
    .filter(g => g.total > 0);

  const gapsTerapeuta = terapeutas
    .map(ter => ({
      tipo: "Terapeuta",
      nome: ter,
      ...totaisPorTerapeuta[ter]
    }))
    .filter(g => g.total > 0);

  const todosGaps = [...gapsRecepcao, ...gapsTerapeuta].sort((a, b) => a.taxa - b.taxa);

  // Rankings
  const rankingRecepcao = recepcionistas
    .map(rec => ({
      nome: rec,
      ...totaisPorRecepcao[rec]
    }))
    .filter(r => r.total > 0)
    .sort((a, b) => b.taxa - a.taxa);

  const rankingTerapeuta = terapeutas
    .map(ter => ({
      nome: ter,
      ...totaisPorTerapeuta[ter]
    }))
    .filter(t => t.total > 0)
    .sort((a, b) => b.taxa - a.taxa);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to={createPageUrl("Administrador")}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Análise Cruzada</h1>
              <p className="text-sm text-gray-500">Terapeuta x Recepção - Taxa de Conversão</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Clínica</Label>
                <Select value={unidadeAnalise} onValueChange={setUnidadeAnalise}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Clínicas</SelectItem>
                    {unidadesFiltradas.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Input
                  type="date"
                  value={dataInicioAnalise}
                  onChange={(e) => setDataInicioAnalise(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Input
                  type="date"
                  value={dataFimAnalise}
                  onChange={(e) => setDataFimAnalise(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setDataInicioAnalise(format(startOfMonth(new Date()), "yyyy-MM-dd"));
                    setDataFimAnalise(format(endOfMonth(new Date()), "yyyy-MM-dd"));
                    setUnidadeAnalise("todas");
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardContent className="pt-4 pb-4">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-xs text-blue-600 mb-1">TAXA MÉDIA</p>
                <p className="text-2xl font-bold text-blue-900">{taxaMediaGeral}%</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 bg-green-50">
            <CardContent className="pt-4 pb-4">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-xs text-green-600 mb-1">TOTAL ANÁLISES</p>
                <p className="text-2xl font-bold text-green-900">{totalAnalises}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200 bg-purple-50">
            <CardContent className="pt-4 pb-4">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-xs text-purple-600 mb-1">CONVERSÕES</p>
                <p className="text-2xl font-bold text-purple-900">{totalConversoes}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-200 bg-orange-50">
            <CardContent className="pt-4 pb-4">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-2">
                  <TrendingDown className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-xs text-orange-600 mb-1">GAPS</p>
                <p className="text-2xl font-bold text-orange-900">{todosGaps.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gaps Identificados */}
        {todosGaps.length > 0 && (
          <Card className="border-blue-200">
            <CardHeader className="bg-blue-50">
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <BarChart3 className="w-5 h-5" />
                Análise de Performance - Todos os Colaboradores
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {todosGaps.map((gap, idx) => {
                  const isExpandido = gapExpandido === `${gap.tipo}-${gap.nome}`;
                  
                  // Definir cores e texto baseado na taxa
                  let corBorda, corFundo, corBadge, textoBadge;
                  if (gap.taxa <= 34.9) {
                    corBorda = 'border-red-300';
                    corFundo = 'bg-red-50';
                    corBadge = 'bg-red-600 text-white';
                    textoBadge = 'CRÍTICO';
                  } else if (gap.taxa >= 35 && gap.taxa <= 49.9) {
                    corBorda = 'border-orange-300';
                    corFundo = 'bg-orange-50';
                    corBadge = 'bg-orange-600 text-white';
                    textoBadge = 'ATENÇÃO';
                  } else if (gap.taxa >= 50 && gap.taxa <= 99.9) {
                    corBorda = 'border-green-300';
                    corFundo = 'bg-green-50';
                    corBadge = 'bg-green-600 text-white';
                    textoBadge = 'ÓTIMO';
                  } else if (gap.taxa === 100) {
                    corBorda = 'border-green-400';
                    corFundo = 'bg-green-100';
                    corBadge = 'bg-green-700 text-white';
                    textoBadge = 'EXCELENTE';
                  }
                  
                  return (
                    <div
                      key={idx}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${corBorda} ${corFundo}`}
                      onClick={() => setGapExpandido(isExpandido ? null : `${gap.tipo}-${gap.nome}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded text-xs font-bold ${corBadge}`}>
                            {textoBadge}
                          </span>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {gap.tipo}: {gap.nome}
                            </p>
                            <p className="text-sm text-gray-600">
                              Taxa de conversão: {gap.taxa.toFixed(1)}% | Volume: {gap.total} atendimentos
                            </p>
                          </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpandido ? 'rotate-180' : ''}`} />
                      </div>
                      
                      {isExpandido && (
                        <div className="mt-4 pt-4 border-t border-gray-300">
                          <p className="text-sm text-gray-700">
                            <strong>Conversões:</strong> {gap.convertidos} de {gap.total} tentativas
                          </p>
                          {gap.taxa < 50 && (
                            <p className="text-sm text-gray-600 mt-2">
                              Recomendação: Avaliar processos e oferecer treinamento para melhorar a taxa de conversão.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Matriz Cruzada */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Matriz Cruzada - Recepção x Terapeuta</CardTitle>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500"></div>
                <span>Crítico (0-34,9%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-orange-500"></div>
                <span>Atenção (35-49,9%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span>Ótimo (50-99,9%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-600"></div>
                <span>Excelente (100%)</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full border-collapse text-xs md:text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-gray-100 px-2 py-2 md:px-4 md:py-3 text-left font-semibold sticky left-0 z-10 text-xs">
                      Recepção \ Terapeuta
                    </th>
                    {terapeutas.map(ter => (
                      <th key={ter} className="border border-gray-300 bg-gray-100 px-2 py-2 md:px-4 md:py-3 text-center font-semibold min-w-[80px] md:min-w-[100px] text-xs">
                        <div className="max-w-[80px] md:max-w-none truncate">{ter}</div>
                      </th>
                    ))}
                    <th className="border border-gray-300 bg-green-100 px-2 py-2 md:px-4 md:py-3 text-center font-bold min-w-[80px] md:min-w-[100px] text-xs">
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recepcionistas.map(rec => (
                    <tr key={rec}>
                      <td className="border border-gray-300 bg-gray-50 px-2 py-2 md:px-4 md:py-3 font-semibold sticky left-0 z-10 text-xs">
                        <div className="max-w-[80px] md:max-w-none truncate">{rec}</div>
                      </td>
                      {terapeutas.map(ter => {
                        const dados = matrizDados[`${rec}|${ter}`];
                        if (!dados || dados.total === 0) {
                          return (
                            <td key={ter} className="border border-gray-300 px-2 py-2 md:px-4 md:py-3 text-center text-gray-400">
                              -
                            </td>
                          );
                        }

                        const taxa = (dados.convertidos / dados.total) * 100;
                        let corFundo;
                        if (taxa <= 34.9) {
                          corFundo = 'bg-red-500';
                        } else if (taxa >= 35 && taxa <= 49.9) {
                          corFundo = 'bg-orange-500';
                        } else if (taxa >= 50 && taxa <= 99.9) {
                          corFundo = 'bg-green-500';
                        } else if (taxa === 100) {
                          corFundo = 'bg-green-600';
                        }

                        return (
                          <td key={ter} className="border border-gray-300 px-2 py-2 md:px-4 md:py-3">
                            <div className="flex flex-col items-center gap-0.5">
                              <div className={`${corFundo} text-white font-bold px-2 py-0.5 md:px-3 md:py-1 rounded text-sm md:text-base`}>
                                {taxa.toFixed(0)}%
                              </div>
                              <div className="text-[10px] md:text-xs text-gray-600">
                                {dados.convertidos}/{dados.total}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                      <td className="border border-gray-300 bg-green-50 px-2 py-2 md:px-4 md:py-3">
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="text-green-900 font-bold text-sm md:text-base">
                            {totaisPorRecepcao[rec].taxa.toFixed(0)}%
                          </div>
                          <div className="text-[10px] md:text-xs text-gray-600">
                            {totaisPorRecepcao[rec].convertidos}/{totaisPorRecepcao[rec].total}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ranking Recepção */}
          <Card>
            <CardHeader className="bg-purple-50">
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <TrendingUp className="w-5 h-5" />
                Ranking Recepção
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {rankingRecepcao.map((rec, idx) => {
                  let corBorda, corFundo, corTexto;
                  if (rec.taxa <= 34.9) {
                    corBorda = 'border-red-300';
                    corFundo = 'bg-red-50';
                    corTexto = 'text-red-900';
                  } else if (rec.taxa >= 35 && rec.taxa <= 49.9) {
                    corBorda = 'border-orange-300';
                    corFundo = 'bg-orange-50';
                    corTexto = 'text-orange-900';
                  } else if (rec.taxa >= 50 && rec.taxa <= 99.9) {
                    corBorda = 'border-green-300';
                    corFundo = 'bg-green-50';
                    corTexto = 'text-green-900';
                  } else if (rec.taxa === 100) {
                    corBorda = 'border-green-400';
                    corFundo = 'bg-green-100';
                    corTexto = 'text-green-900';
                  }
                  
                  return (
                    <div key={idx} className={`flex items-center justify-between p-3 border rounded-lg ${corBorda} ${corFundo}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-900">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{rec.nome}</p>
                          <p className="text-xs text-gray-500">
                            {rec.total} atendimentos | {rec.convertidos} conversões
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${corTexto}`}>{rec.taxa.toFixed(0)}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Ranking Terapeuta */}
          <Card>
            <CardHeader className="bg-amber-50">
              <CardTitle className="flex items-center gap-2 text-amber-900">
                <TrendingUp className="w-5 h-5" />
                Ranking Terapeuta
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {rankingTerapeuta.map((ter, idx) => {
                  let corBorda, corFundo, corTexto;
                  if (ter.taxa <= 34.9) {
                    corBorda = 'border-red-300';
                    corFundo = 'bg-red-50';
                    corTexto = 'text-red-900';
                  } else if (ter.taxa >= 35 && ter.taxa <= 49.9) {
                    corBorda = 'border-orange-300';
                    corFundo = 'bg-orange-50';
                    corTexto = 'text-orange-900';
                  } else if (ter.taxa >= 50 && ter.taxa <= 99.9) {
                    corBorda = 'border-green-300';
                    corFundo = 'bg-green-50';
                    corTexto = 'text-green-900';
                  } else if (ter.taxa === 100) {
                    corBorda = 'border-green-400';
                    corFundo = 'bg-green-100';
                    corTexto = 'text-green-900';
                  }
                  
                  return (
                    <div key={idx} className={`flex items-center justify-between p-3 border rounded-lg ${corBorda} ${corFundo}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-900">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{ter.nome}</p>
                          <p className="text-xs text-gray-500">
                            {ter.total} atendimentos | {ter.convertidos} conversões
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${corTexto}`}>{ter.taxa.toFixed(0)}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}