import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function NovoClienteCRM() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: "",
    data_nascimento: "",
    cpf: "",
    origem_lead: "",
    clinica: "",
    data_primeira_sessao: "",
    vendedor: "",
    canal_venda: "",
    pacote_nome: "",
    valor_pacote: "",
    forma_pagamento: "",
    sessoes_total: "",
    sessoes_realizadas: 0,
    tag: ""
  });

  const criarClienteMutation = useMutation({
    mutationFn: (dados) => base44.entities.ClienteCRM.create(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientesCRM"] });
      navigate(createPageUrl("CRM"));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const dadosAEnviar = {
      ...formData,
      valor_pacote: parseFloat(formData.valor_pacote) || 0,
      sessoes_total: parseInt(formData.sessoes_total) || 0,
      status_pacote: "Em Andamento"
    };
    criarClienteMutation.mutate(dadosAEnviar);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Link to={createPageUrl("CRM")}>
          <Button variant="ghost" size="icon" className="mb-6">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Novo Cliente CRM</h1>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6 bg-white p-8 rounded-lg">
          <Input
            label="Nome Completo"
            value={formData.nome}
            onChange={(e) => setFormData({...formData, nome: e.target.value})}
            placeholder="Nome do cliente"
            required
          />

          <Input
            label="Telefone (WhatsApp)"
            value={formData.telefone}
            onChange={(e) => setFormData({...formData, telefone: e.target.value})}
            placeholder="(00) 00000-0000"
            required
          />

          <Input
            label="E-mail"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            placeholder="email@exemplo.com"
          />

          <Input
            label="Data de Nascimento"
            type="date"
            value={formData.data_nascimento}
            onChange={(e) => setFormData({...formData, data_nascimento: e.target.value})}
          />

          <Input
            label="CPF"
            value={formData.cpf}
            onChange={(e) => setFormData({...formData, cpf: e.target.value})}
            placeholder="000.000.000-00"
          />

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Origem do Lead</label>
            <Select value={formData.origem_lead} onValueChange={(value) => setFormData({...formData, origem_lead: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Instagram">Instagram</SelectItem>
                <SelectItem value="Google">Google</SelectItem>
                <SelectItem value="Indicação">Indicação</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Presencial">Presencial</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Clínica *</label>
            <Select value={formData.clinica} onValueChange={(value) => setFormData({...formData, clinica: value})} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Londrina">Londrina</SelectItem>
                <SelectItem value="Moema">Moema</SelectItem>
                <SelectItem value="Av. Paulista">Av. Paulista</SelectItem>
                <SelectItem value="Pinheiros">Pinheiros</SelectItem>
                <SelectItem value="Alphaville">Alphaville</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Input
            label="Data da Primeira Sessão"
            type="date"
            value={formData.data_primeira_sessao}
            onChange={(e) => setFormData({...formData, data_primeira_sessao: e.target.value})}
          />

          <Input
            label="Vendedor"
            value={formData.vendedor}
            onChange={(e) => setFormData({...formData, vendedor: e.target.value})}
            placeholder="Nome do vendedor"
          />

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Canal da Venda</label>
            <Select value={formData.canal_venda} onValueChange={(value) => setFormData({...formData, canal_venda: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Presencial">Presencial</SelectItem>
                <SelectItem value="Telefone">Telefone</SelectItem>
                <SelectItem value="Email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Input
            label="Pacote Contratado *"
            value={formData.pacote_nome}
            onChange={(e) => setFormData({...formData, pacote_nome: e.target.value})}
            placeholder="Ex: Plano 24 Sessões"
            required
          />

          <Input
            label="Valor do Pacote"
            type="number"
            step="0.01"
            value={formData.valor_pacote}
            onChange={(e) => setFormData({...formData, valor_pacote: e.target.value})}
            placeholder="0.00"
          />

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Forma de Pagamento</label>
            <Select value={formData.forma_pagamento} onValueChange={(value) => setFormData({...formData, forma_pagamento: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                <SelectItem value="Débito">Débito</SelectItem>
                <SelectItem value="Crédito">Crédito</SelectItem>
                <SelectItem value="Pix">Pix</SelectItem>
                <SelectItem value="Boleto">Boleto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Input
            label="Total de Sessões"
            type="number"
            value={formData.sessoes_total}
            onChange={(e) => setFormData({...formData, sessoes_total: e.target.value})}
            placeholder="24"
          />

          <Input
            label="Sessões Realizadas"
            type="number"
            value={formData.sessoes_realizadas}
            onChange={(e) => setFormData({...formData, sessoes_realizadas: e.target.value})}
            placeholder="0"
          />

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Tag</label>
            <Select value={formData.tag} onValueChange={(value) => setFormData({...formData, tag: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhuma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Nenhuma</SelectItem>
                <SelectItem value="VIP">VIP</SelectItem>
                <SelectItem value="Recorrente">Recorrente</SelectItem>
                <SelectItem value="Risco de Cancelamento">Risco de Cancelamento</SelectItem>
                <SelectItem value="Novo">Novo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 flex gap-4">
            <Button variant="outline" onClick={() => navigate(createPageUrl("CRM"))}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={criarClienteMutation.isPending}>
              {criarClienteMutation.isPending ? "Salvando..." : "Salvar Cliente"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}