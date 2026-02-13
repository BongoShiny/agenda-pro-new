import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Users, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PacientesNovosPage() {
  const hoje = format(new Date(), "yyyy-MM-dd");
  const [agendamentosAtivos, setAgendamentosAtivos] = useState([]);

  const { data: usuarioAtual } = useQuery({
    queryKey: ['usuario-atual'],
    queryFn: () => base44.auth.me(),
  });

  const { data: agendamentosIniciais = [], refetch } = useQuery({
    queryKey: ['agendamentos-pacientes-novos', hoje],
    queryFn: async () => {
      const todos = await base44.entities.Agendamento.list("-hora_inicio");
      return todos.filter(ag => 
        ag.data === hoje && 
        (ag.status_paciente === "paciente_novo" || ag.status_paciente === "ultima_sessao") &&
        ag.status !== "bloqueio" &&
        ag.tipo !== "bloqueio"
      );
    },
    initialData: [],
  });

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
  });

  // Configurar subscricão em tempo real
  useEffect(() => {
    setAgendamentosAtivos(agendamentosIniciais);

    const unsubscribe = base44.entities.Agendamento.subscribe((event) => {
      if (event.type === 'update') {
        setAgendamentosAtivos(prev => {
          const index = prev.findIndex(a => a.id === event.id);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = event.data;
            return updated;
          }
          return prev;
        });
      } else if (event.type === 'create') {
        if (event.data.data === hoje && 
            (event.data.status_paciente === "paciente_novo" || event.data.status_paciente === "ultima_sessao")) {
          setAgendamentosAtivos(prev => [...prev, event.data]);
        }
      }
    });

    return () => unsubscribe();
  }, [agendamentosIniciais, hoje]);

  // Verificar acesso
  const isAdmin = usuarioAtual?.cargo === "administrador" || usuarioAtual?.cargo === "superior" || usuarioAtual?.role === "admin";
  const unidadesFiltradas = isAdmin ? unidades : unidades.filter(u => usuarioAtual?.unidades_acesso?.includes(u.id));

  // Agrupar por unidade e tipo
  const agendamentosPorUnidade = useMemo(() => {
    const grupos = {};
    
    unidadesFiltradas.forEach(unidade => {
      const agendamentosUnidade = agendamentosAtivos.filter(ag => ag.unidade_id === unidade.id);
      
      if (agendamentosUnidade.length > 0) {
        grupos[unidade.id] = {
          unidade: unidade,
          pacientesNovos: agendamentosUnidade
            .filter(ag => ag.status_paciente === "paciente_novo")
            .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)),
          ultimasSessoes: agendamentosUnidade
            .filter(ag => ag.status_paciente === "ultima_sessao")
            .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
        };
      }
    });

    return grupos;
  }, [agendamentosAtivos, unidadesFiltradas]);

  const renderAgendamento = (ag) => {
    const temConversao = ag.conversao_converteu !== null && ag.conversao_converteu !== undefined;
    const converteu = ag.conversao_converteu === true;

    return (
      <div 
        key={ag.id} 
        className={`p-4 rounded-lg border-2 ${
          temConversao 
            ? (converteu ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300')
            : 'bg-white border-gray-200'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="font-bold text-lg text-gray-900">{ag.hora_inicio}</span>
              {ag.status_paciente === "paciente_novo" && (
                <Badge className="bg-blue-500">Paciente Novo</Badge>
              )}
              {ag.status_paciente === "ultima_sessao" && (
                <Badge className="bg-purple-500">Última Sessão</Badge>
              )}
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-gray-900">{ag.cliente_nome}</p>
              <p className="text-sm text-gray-600">{ag.cliente_telefone}</p>
              <p className="text-sm text-gray-600">
                Terapeuta: <span className="font-medium">{ag.profissional_nome}</span>
              </p>
              {ag.vendedor_nome && (
                <p className="text-sm text-gray-600">
                  Vendedor: <span className="font-medium">{ag.vendedor_nome}</span>
                </p>
              )}
            </div>

            {/* Detalhes da Conversão */}
            {temConversao && (
              <div className="mt-3 p-3 rounded-lg bg-white border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  {converteu ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="font-bold text-green-700">
                        {ag.conversao_tipo === "renovou" ? "RENOVOU" : "FECHOU"}
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="font-bold text-red-700">NÃO CONVERTEU</span>
                    </>
                  )}
                </div>

                {converteu && (
                  <div className="space-y-1 text-sm">
                    {ag.conversao_plano && (
                      <p className="text-gray-700">
                        <span className="font-medium">Plano:</span> {ag.conversao_plano}
                      </p>
                    )}
                    {ag.conversao_recepcionista && (
                      <p className="text-gray-700">
                        <span className="font-medium">Recepcionista:</span> {ag.conversao_recepcionista}
                      </p>
                    )}
                    {ag.conversao_motivos && (
                      <p className="text-gray-700">
                        <span className="font-medium">Motivos:</span> {ag.conversao_motivos}
                      </p>
                    )}
                    {ag.conversao_valor_final && (
                      <p className="text-gray-700">
                        <span className="font-medium">Valor:</span> R$ {ag.conversao_valor_final.toFixed(2)}
                      </p>
                    )}
                  </div>
                )}

                {!converteu && (
                  <div className="space-y-1 text-sm">
                    {ag.conversao_motivo_nao_converteu && (
                      <p className="text-gray-700">
                        <span className="font-medium">Motivo:</span> {ag.conversao_motivo_nao_converteu}
                      </p>
                    )}
                    {ag.conversao_recepcionista_nao_converteu && (
                      <p className="text-gray-700">
                        <span className="font-medium">Recepcionista:</span> {ag.conversao_recepcionista_nao_converteu}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {!temConversao && (
              <div className="mt-3 p-2 rounded bg-yellow-50 border border-yellow-200">
                <p className="text-sm text-yellow-800 font-medium">
                  ⏳ Aguardando registro de conversão
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("Agenda")}>
                <Button variant="outline" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Pacientes Novos & Últimas Sessões</h1>
                  <p className="text-sm text-gray-500">
                    {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={() => refetch()} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {Object.keys(agendamentosPorUnidade).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg">Nenhum paciente novo ou última sessão hoje</p>
            </CardContent>
          </Card>
        ) : (
          Object.values(agendamentosPorUnidade).map(({ unidade, pacientesNovos, ultimasSessoes }) => (
            <div key={unidade.id} className="space-y-4">
              {/* Header da Unidade */}
              <div className="flex items-center gap-3 pb-2 border-b-2 border-gray-300">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: unidade.cor || '#3B82F6' }}
                />
                <h2 className="text-2xl font-bold text-gray-900">{unidade.nome}</h2>
                <Badge variant="outline" className="ml-2">
                  {pacientesNovos.length + ultimasSessoes.length} agendamentos
                </Badge>
              </div>

              {/* Pacientes Novos */}
              {pacientesNovos.length > 0 && (
                <Card className="shadow-lg border-blue-200">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
                    <CardTitle className="flex items-center gap-2 text-blue-900">
                      <Users className="w-5 h-5" />
                      Pacientes Novos ({pacientesNovos.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-3">
                    {pacientesNovos.map(renderAgendamento)}
                  </CardContent>
                </Card>
              )}

              {/* Últimas Sessões */}
              {ultimasSessoes.length > 0 && (
                <Card className="shadow-lg border-purple-200">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
                    <CardTitle className="flex items-center gap-2 text-purple-900">
                      <CheckCircle2 className="w-5 h-5" />
                      Últimas Sessões ({ultimasSessoes.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-3">
                    {ultimasSessoes.map(renderAgendamento)}
                  </CardContent>
                </Card>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}