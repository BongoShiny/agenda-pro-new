import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";

export default function HistoricoServicosCliente({ clienteId, clienteNome }) {
  const { data: agendamentos = [], isLoading } = useQuery({
    queryKey: ['historico-cliente', clienteId],
    queryFn: () => base44.entities.Agendamento.filter({ cliente_id: clienteId }, "-data"),
    enabled: !!clienteId,
    initialData: [],
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case "concluido":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "confirmado":
        return <Clock className="w-5 h-5 text-blue-600" />;
      case "agendado":
        return <Clock className="w-5 h-5 text-orange-600" />;
      case "cancelado":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "ausencia":
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      concluido: "Concluído",
      confirmado: "Confirmado",
      agendado: "Agendado",
      cancelado: "Cancelado",
      ausencia: "Ausência"
    };
    return labels[status] || status;
  };

  const formatarData = (dataString) => {
    try {
      const date = new Date(dataString + 'T12:00:00');
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch (error) {
      return dataString;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando histórico...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const agendamentosOrdenados = [...agendamentos].sort(
    (a, b) => new Date(b.data) - new Date(a.data)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>📋 Histórico de Serviços - {clienteNome}</CardTitle>
      </CardHeader>
      <CardContent>
        {agendamentosOrdenados.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhum agendamento encontrado para este cliente.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Data</th>
                  <th className="text-left py-3 px-4 font-semibold">Horário</th>
                  <th className="text-left py-3 px-4 font-semibold">Serviço</th>
                  <th className="text-left py-3 px-4 font-semibold">Profissional</th>
                  <th className="text-left py-3 px-4 font-semibold">Unidade</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {agendamentosOrdenados.map((ag) => (
                  <tr key={ag.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">{formatarData(ag.data)}</td>
                    <td className="py-3 px-4 text-gray-600">{ag.hora_inicio}</td>
                    <td className="py-3 px-4 font-medium">{ag.servico_nome || "-"}</td>
                    <td className="py-3 px-4">{ag.profissional_nome}</td>
                    <td className="py-3 px-4 text-gray-600">{ag.unidade_nome}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(ag.status)}
                        <span className="text-gray-700">{getStatusLabel(ag.status)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}