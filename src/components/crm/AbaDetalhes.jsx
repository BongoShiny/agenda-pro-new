import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";

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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-500">Nome</Label>
            <p className="font-semibold">{lead.nome}</p>
          </div>
          <div>
            <Label className="text-gray-500">Telefone</Label>
            <p className="font-semibold">{lead.telefone}</p>
          </div>
          <div>
            <Label className="text-gray-500">E-mail</Label>
            <p className="font-semibold">{lead.email || "-"}</p>
          </div>
          <div>
            <Label className="text-gray-500">Sexo</Label>
            <p className="font-semibold">{lead.sexo}</p>
          </div>
          <div>
            <Label className="text-gray-500">Origem</Label>
            <p className="font-semibold capitalize">{lead.origem?.replace("_", " ")}</p>
          </div>
          <div>
            <Label className="text-gray-500">Temperatura</Label>
            <p className="font-semibold capitalize">{lead.temperatura}</p>
          </div>
          <div className="col-span-2">
            <Label className="text-gray-500">Interesse</Label>
            <p className="font-semibold">{lead.interesse || "-"}</p>
          </div>
          <div className="col-span-2">
            <Label className="text-gray-500">Anotações Internas</Label>
            <div className="bg-gray-50 rounded p-3 mt-1">
              <p className="whitespace-pre-wrap">{lead.anotacoes_internas || "Sem anotações"}</p>
            </div>
          </div>
        </div>
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
              <SelectItem value="novo">Novo</SelectItem>
              <SelectItem value="em_contato">Em Contato</SelectItem>
              <SelectItem value="negociacao">Negociação</SelectItem>
              <SelectItem value="fechado">Fechado</SelectItem>
              <SelectItem value="perdido">Perdido</SelectItem>
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