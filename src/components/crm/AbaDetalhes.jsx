import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, User, Briefcase, CreditCard, DollarSign, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AbaDetalhes({ lead, onUpdate }) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(lead);
  const queryClient = useQueryClient();

  const updateLeadMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.update(lead.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setEditMode(false);
      onUpdate();
    },
  });

  const handleSave = () => {
    updateLeadMutation.mutate(formData);
  };

  if (!editMode) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex justify-end">
          <Button onClick={() => setEditMode(true)} variant="outline">
            Editar
          </Button>
        </div>

        {/* Dados Pessoais e Comerciais */}
        <div className="grid grid-cols-2 gap-4">
          {/* Dados Pessoais */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b">
              <User className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-700">Dados Pessoais</h3>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-gray-500 text-xs">Nome Completo</Label>
                <p className="font-medium text-gray-900">{lead.nome}</p>
              </div>
              <div>
                <Label className="text-gray-500 text-xs">Telefone (WhatsApp)</Label>
                <p className="font-medium text-gray-900">{lead.telefone}</p>
              </div>
              <div>
                <Label className="text-gray-500 text-xs">Origem do Lead</Label>
                <p className="font-medium text-gray-900 capitalize">{lead.origem?.replace("_", " ")}</p>
              </div>
            </div>
          </div>

          {/* Dados Comerciais */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b">
              <Briefcase className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-700">Dados Comerciais</h3>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-gray-500 text-xs">Clínica</Label>
                <p className="font-medium text-blue-600">{lead.unidade_nome}</p>
              </div>
              <div>
                <Label className="text-gray-500 text-xs">Data da Primeira Sessão</Label>
                <p className="font-medium text-gray-900">
                  {lead.data_primeiro_contato ? format(new Date(lead.data_primeiro_contato), "dd/MM/yyyy - HH:mm", { locale: ptBR }) : "-"}
                </p>
              </div>
              <div>
                <Label className="text-gray-500 text-xs">Vendedor</Label>
                <p className="font-medium text-gray-900">{lead.vendedor_nome}</p>
              </div>
              <div>
                <Label className="text-gray-500 text-xs">Canal da Venda</Label>
                <p className="font-medium text-gray-900 capitalize">{lead.origem?.replace("_", " ")}</p>
              </div>
              <div>
                <Label className="text-gray-500 text-xs">Pacote Contratado</Label>
                <p className="font-medium text-gray-900">{lead.interesse || "-"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sinal e Restante */}
        {lead.convertido && (
          <div className="grid grid-cols-2 gap-4">
            {/* Sinal */}
            <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-purple-200">
                <CreditCard className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-purple-700">Sinal (Pagamento WhatsApp)</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-500 text-xs">Valor do Sinal</Label>
                  <p className="text-2xl font-bold text-purple-600">
                    R$ {lead.valor_sinal?.toFixed(2) || "0.00"}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Data de Pagamento</Label>
                  <p className="font-medium text-gray-900">
                    {lead.data_conversao ? format(new Date(lead.data_conversao), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Forma de Pagamento</Label>
                  <p className="font-medium text-gray-900">{lead.forma_pagamento_sinal || "pix"}</p>
                </div>
              </div>
            </div>

            {/* Restante */}
            <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-200">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-orange-200">
                <DollarSign className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold text-orange-700">Restante (Pagamento Clínica)</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-500 text-xs">Valor Total</Label>
                  <p className="text-xl font-bold text-gray-900">
                    R$ {lead.valor_total?.toFixed(2) || "0.00"}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Valor a Receber (Restante)</Label>
                  <p className="text-2xl font-bold text-orange-600">
                    R$ {((lead.valor_total || 0) - (lead.valor_sinal || 0)).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1 h-7">
                    🔔 Pendente
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Motivos de Fechamento */}
        {lead.convertido && lead.motivo_fechamento && (
          <div className="bg-gray-50 rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b">
              <FileText className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-700">Motivos de Fechamento - Clínica</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {lead.motivo_fechamento.split(',').map((motivo, idx) => (
                <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {motivo.trim()}
                </Badge>
              ))}
            </div>
            {lead.observacoes_conversao && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 italic">{lead.observacoes_conversao}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input
            value={formData.nome}
            onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Telefone</Label>
          <Input
            value={formData.telefone}
            onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input
            value={formData.email || ""}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Sexo</Label>
          <Select value={formData.sexo} onValueChange={(value) => setFormData(prev => ({ ...prev, sexo: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Masculino">Masculino</SelectItem>
              <SelectItem value="Feminino">Feminino</SelectItem>
              <SelectItem value="Outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="avulso">Avulso</SelectItem>
              <SelectItem value="plano_terapeutico">Plano Terapêutico</SelectItem>
              <SelectItem value="renovacao">Renovação</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Temperatura</Label>
          <Select value={formData.temperatura} onValueChange={(value) => setFormData(prev => ({ ...prev, temperatura: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quente">🔥 Quente</SelectItem>
              <SelectItem value="morno">☀️ Morno</SelectItem>
              <SelectItem value="frio">❄️ Frio</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-2">
          <Label>Interesse</Label>
          <Input
            value={formData.interesse || ""}
            onChange={(e) => setFormData(prev => ({ ...prev, interesse: e.target.value }))}
          />
        </div>
        <div className="col-span-2 space-y-2">
          <Label>Anotações Internas</Label>
          <Textarea
            value={formData.anotacoes_internas || ""}
            onChange={(e) => setFormData(prev => ({ ...prev, anotacoes_internas: e.target.value }))}
            rows={4}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => setEditMode(false)}>
          Cancelar
        </Button>
        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          Salvar
        </Button>
      </div>
    </div>
  );
}