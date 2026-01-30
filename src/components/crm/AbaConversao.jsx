import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function AbaConversao({ lead, onUpdate }) {
  const [registroConversao, setRegistroConversao] = useState({
    tipo: "tentativa", // tentativa, fechamento, perda
    resultado: "",
    motivo: "",
    valor: "",
    observacoes: "",
  });

  const queryClient = useQueryClient();

  const updateLeadMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.update(lead.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      onUpdate();
    },
  });

  const createInteracaoMutation = useMutation({
    mutationFn: (data) => base44.entities.InteracaoLead.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interacoes'] });
    },
  });

  const handleRegistrarTentativa = async () => {
    const interacao = {
      lead_id: lead.id,
      lead_nome: lead.nome,
      tipo: "tentativa_contato",
      descricao: registroConversao.observacoes || "Tentativa de contato realizada",
      resultado: "neutro",
      vendedor_nome: lead.vendedor_nome,
      data_interacao: new Date().toISOString(),
    };

    await createInteracaoMutation.mutateAsync(interacao);
    
    await updateLeadMutation.mutateAsync({
      tentativas_contato: (lead.tentativas_contato || 0) + 1,
    });

    setRegistroConversao({ tipo: "tentativa", resultado: "", motivo: "", valor: "", observacoes: "" });
    alert("✅ Tentativa de contato registrada!");
  };

  const handleRegistrarFechamento = async () => {
    const interacao = {
      lead_id: lead.id,
      lead_nome: lead.nome,
      tipo: "conversao_fechamento",
      descricao: `FECHAMENTO: ${registroConversao.motivo}`,
      resultado: "positivo",
      vendedor_nome: lead.vendedor_nome,
      data_interacao: new Date().toISOString(),
    };

    await createInteracaoMutation.mutateAsync(interacao);
    
    await updateLeadMutation.mutateAsync({
      status: "fechado",
      convertido: true,
      data_conversao: format(new Date(), "yyyy-MM-dd"),
      motivo_fechamento: registroConversao.motivo,
      valor_negociado: registroConversao.valor ? parseFloat(registroConversao.valor) : null,
    });

    setRegistroConversao({ tipo: "tentativa", resultado: "", motivo: "", valor: "", observacoes: "" });
    alert("🎉 Conversão registrada com sucesso!");
  };

  const handleRegistrarPerda = async () => {
    const interacao = {
      lead_id: lead.id,
      lead_nome: lead.nome,
      tipo: "conversao_perda",
      descricao: `PERDA: ${registroConversao.motivo}`,
      resultado: "negativo",
      vendedor_nome: lead.vendedor_nome,
      data_interacao: new Date().toISOString(),
    };

    await createInteracaoMutation.mutateAsync(interacao);
    
    await updateLeadMutation.mutateAsync({
      status: "perdido",
      motivo_perda: registroConversao.motivo,
    });

    setRegistroConversao({ tipo: "tentativa", resultado: "", motivo: "", valor: "", observacoes: "" });
    alert("Lead marcado como perdido");
  };

  return (
    <div className="space-y-6 p-4">
      {/* Status Atual */}
      {lead.convertido && (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h3 className="font-bold text-green-900 text-lg">Lead Convertido!</h3>
          </div>
          <p className="text-green-700">Data: {format(new Date(lead.data_conversao), "dd/MM/yyyy")}</p>
          {lead.motivo_fechamento && (
            <p className="text-green-700 mt-1">Motivo: {lead.motivo_fechamento}</p>
          )}
          {lead.valor_negociado && (
            <p className="text-green-700 mt-1">
              Valor: R$ {lead.valor_negociado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
      )}

      {lead.status === "perdido" && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-6 h-6 text-red-600" />
            <h3 className="font-bold text-red-900 text-lg">Lead Perdido</h3>
          </div>
          {lead.motivo_perda && (
            <p className="text-red-700">Motivo: {lead.motivo_perda}</p>
          )}
        </div>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-600 mb-1">Tentativas de Contato</p>
          <p className="text-2xl font-bold text-blue-900">{lead.tentativas_contato || 0}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <p className="text-sm text-purple-600 mb-1">Status</p>
          <p className="text-xl font-bold text-purple-900 capitalize">
            {lead.status.replace("_", " ")}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <p className="text-sm text-yellow-600 mb-1">Temperatura</p>
          <p className="text-xl font-bold text-yellow-900 capitalize">{lead.temperatura}</p>
        </div>
      </div>

      {/* Registro de Conversão */}
      {!lead.convertido && lead.status !== "perdido" && (
        <div className="border-2 border-gray-200 rounded-lg p-6 bg-gray-50">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Registrar Conversão
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Registro</Label>
              <Select value={registroConversao.tipo} onValueChange={(value) => setRegistroConversao(prev => ({ ...prev, tipo: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tentativa">📞 Tentativa de Contato</SelectItem>
                  <SelectItem value="fechamento">✅ Fechamento (Conversão)</SelectItem>
                  <SelectItem value="perda">❌ Perda do Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {registroConversao.tipo === "tentativa" && (
              <>
                <div className="space-y-2">
                  <Label>Observações da Tentativa</Label>
                  <Textarea
                    value={registroConversao.observacoes}
                    onChange={(e) => setRegistroConversao(prev => ({ ...prev, observacoes: e.target.value }))}
                    placeholder="Descreva o que aconteceu nesta tentativa..."
                    rows={3}
                  />
                </div>
                <Button onClick={handleRegistrarTentativa} className="w-full bg-blue-600 hover:bg-blue-700">
                  Registrar Tentativa
                </Button>
              </>
            )}

            {registroConversao.tipo === "fechamento" && (
              <>
                <div className="space-y-2">
                  <Label>Motivo do Fechamento *</Label>
                  <Textarea
                    value={registroConversao.motivo}
                    onChange={(e) => setRegistroConversao(prev => ({ ...prev, motivo: e.target.value }))}
                    placeholder="Por que o cliente fechou?"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Negociado</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={registroConversao.valor}
                    onChange={(e) => setRegistroConversao(prev => ({ ...prev, valor: e.target.value }))}
                    placeholder="R$ 0,00"
                  />
                </div>
                <Button 
                  onClick={handleRegistrarFechamento} 
                  disabled={!registroConversao.motivo}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Registrar Fechamento
                </Button>
              </>
            )}

            {registroConversao.tipo === "perda" && (
              <>
                <div className="space-y-2">
                  <Label>Motivo da Perda *</Label>
                  <Textarea
                    value={registroConversao.motivo}
                    onChange={(e) => setRegistroConversao(prev => ({ ...prev, motivo: e.target.value }))}
                    placeholder="Por que o lead não fechou?"
                    rows={3}
                  />
                </div>
                <Button 
                  onClick={handleRegistrarPerda} 
                  disabled={!registroConversao.motivo}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Registrar Perda
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}