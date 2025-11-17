import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Calendar, User, Clock, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const criarDataPura = (dataString) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

const statusColors = {
  confirmado: "bg-emerald-100 text-emerald-800",
  agendado: "bg-amber-100 text-amber-800",
  ausencia: "bg-fuchsia-100 text-fuchsia-800",
  cancelado: "bg-red-100 text-red-800",
  concluido: "bg-blue-100 text-blue-800",
  bloqueio: "bg-red-100 text-red-800"
};

const statusLabels = {
  confirmado: "Confirmado",
  agendado: "Agendado",
  ausencia: "Ausência",
  cancelado: "Cancelado",
  concluido: "Concluído",
  bloqueio: "Bloqueado"
};

export default function HistoricoAgendamentosPage() {
  const [busca, setBusca] = useState("");

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-historico'],
    queryFn: () => base44.entities.Agendamento.list("-created_date"),
    initialData: [],
  });

  const agendamentosFiltrados = agendamentos.filter(ag => {
    const buscaLower = busca.toLowerCase();
    return (
      ag.cliente_nome?.toLowerCase().includes(buscaLower) ||
      ag.profissional_nome?.toLowerCase().includes(buscaLower) ||
      ag.criador_email?.toLowerCase().includes(buscaLower) ||
      ag.unidade_nome?.toLowerCase().includes(buscaLower)
    );
  });

  const formatarDataHora = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Agenda")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Histórico de Agendamentos</h1>
              <p className="text-gray-500 mt-1">Visualize todos os agendamentos criados e seus criadores</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {agendamentosFiltrados.length} registros
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Logs de Agendamentos</CardTitle>
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por cliente, profissional, criador..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Criação</TableHead>
                    <TableHead>Criado Por</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data Agendamento</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agendamentosFiltrados.map(ag => (
                    <TableRow key={ag.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {formatarDataHora(ag.created_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="font-medium text-sm">
                            {ag.criador_email || "Não disponível"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{ag.cliente_nome}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {format(criarDataPura(ag.data), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {ag.hora_inicio} - {ag.hora_fim}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{ag.profissional_nome}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{ag.unidade_nome}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[ag.status]}>
                          {statusLabels[ag.status] || ag.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {agendamentosFiltrados.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="font-medium">Nenhum registro encontrado</p>
                <p className="text-sm mt-2">
                  {busca ? "Tente ajustar sua busca" : "Ainda não há agendamentos no sistema"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}