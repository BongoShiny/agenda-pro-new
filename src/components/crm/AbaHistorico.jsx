import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Clock, 
  Phone, 
  Calendar as CalendarIcon, 
  FileText, 
  TrendingUp, 
  CheckCircle, 
  XCircle,
  MessageSquare,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const tipoIcons = {
  tentativa_contato: { icon: Phone, color: "text-blue-500", bg: "bg-blue-50" },
  contato_realizado: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-50" },
  reuniao_agendada: { icon: CalendarIcon, color: "text-purple-500", bg: "bg-purple-50" },
  reuniao_realizada: { icon: CheckCircle, color: "text-purple-500", bg: "bg-purple-50" },
  proposta_enviada: { icon: FileText, color: "text-indigo-500", bg: "bg-indigo-50" },
  negociacao: { icon: TrendingUp, color: "text-yellow-500", bg: "bg-yellow-50" },
  visita_clinica: { icon: CalendarIcon, color: "text-pink-500", bg: "bg-pink-50" },
  conversao_fechamento: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
  conversao_perda: { icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
  cancelamento: { icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
  anotacao: { icon: MessageSquare, color: "text-gray-500", bg: "bg-gray-50" },
};

export default function AbaHistorico({ lead }) {
  const [novaInteracao, setNovaInteracao] = useState({
    tipo: "contato_realizado",
    descricao: "",
    resultado: "positivo",
    proxima_acao: "",
  });
  const [showForm, setShowForm] = useState(false);

  const queryClient = useQueryClient();

  const { data: interacoes = [] } = useQuery({
    queryKey: ['interacoes', lead.id],
    queryFn: async () => {
      const result = await base44.entities.InteracaoLead.filter({ lead_id: lead.id }, "-created_date");
      return result;
    },
    initialData: [],
  });

  const createInteracaoMutation = useMutation({
    mutationFn: (data) => base44.entities.InteracaoLead.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interacoes', lead.id] });
      setShowForm(false);
      setNovaInteracao({
        tipo: "contato_realizado",
        descricao: "",
        resultado: "positivo",
        proxima_acao: "",
      });
    },
  });

  const handleAdicionarInteracao = async () => {
    const interacao = {
      lead_id: lead.id,
      lead_nome: lead.nome,
      tipo: novaInteracao.tipo,
      descricao: novaInteracao.descricao,
      resultado: novaInteracao.resultado,
      vendedor_nome: lead.vendedor_nome,
      data_interacao: new Date().toISOString(),
      proxima_acao: novaInteracao.proxima_acao,
    };

    await createInteracaoMutation.mutateAsync(interacao);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg">Linha do Tempo</h3>
        <Button onClick={() => setShowForm(!showForm)} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nova Interação
        </Button>
      </div>

      {/* Formulário Nova Interação */}
      {showForm && (
        <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
          <h4 className="font-semibold mb-3">Adicionar Interação</h4>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Tipo de Interação</Label>
              <Select value={novaInteracao.tipo} onValueChange={(value) => setNovaInteracao(prev => ({ ...prev, tipo: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contato_realizado">📞 Contato Realizado</SelectItem>
                  <SelectItem value="reuniao_agendada">📅 Reunião Agendada</SelectItem>
                  <SelectItem value="reuniao_realizada">✅ Reunião Realizada</SelectItem>
                  <SelectItem value="proposta_enviada">📄 Proposta Enviada</SelectItem>
                  <SelectItem value="negociacao">💰 Negociação</SelectItem>
                  <SelectItem value="visita_clinica">🏥 Visita à Clínica</SelectItem>
                  <SelectItem value="anotacao">📝 Anotação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                value={novaInteracao.descricao}
                onChange={(e) => setNovaInteracao(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="O que aconteceu nesta interação?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Resultado</Label>
              <Select value={novaInteracao.resultado} onValueChange={(value) => setNovaInteracao(prev => ({ ...prev, resultado: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positivo">✅ Positivo</SelectItem>
                  <SelectItem value="neutro">➖ Neutro</SelectItem>
                  <SelectItem value="negativo">❌ Negativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Próxima Ação</Label>
              <Input
                value={novaInteracao.proxima_acao}
                onChange={(e) => setNovaInteracao(prev => ({ ...prev, proxima_acao: e.target.value }))}
                placeholder="O que fazer em seguida?"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleAdicionarInteracao} 
                disabled={!novaInteracao.descricao}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Adicionar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-4">
        {interacoes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Nenhuma interação registrada ainda</p>
          </div>
        ) : (
          interacoes.map((interacao, index) => {
            const config = tipoIcons[interacao.tipo] || tipoIcons.anotacao;
            const Icon = config.icon;

            return (
              <div key={interacao.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`p-2 rounded-full ${config.bg}`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  {index < interacoes.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-200 my-1" />
                  )}
                </div>

                <div className="flex-1 pb-6">
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold capitalize">
                          {interacao.tipo.replace(/_/g, " ")}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {format(new Date(interacao.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      {interacao.resultado && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          interacao.resultado === "positivo" ? "bg-green-100 text-green-700" :
                          interacao.resultado === "negativo" ? "bg-red-100 text-red-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {interacao.resultado}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 mb-2">{interacao.descricao}</p>
                    {interacao.proxima_acao && (
                      <div className="bg-blue-50 rounded p-2 mt-2">
                        <p className="text-xs text-blue-600 font-semibold">Próxima ação:</p>
                        <p className="text-sm text-blue-900">{interacao.proxima_acao}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">Por: {interacao.vendedor_nome}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}