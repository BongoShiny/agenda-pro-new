import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, DollarSign, Save, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function LancarVendasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    cliente_nome: "",
    cliente_telefone: "",
    vendedor_id: "",
    vendedor_nome: "",
    unidade_id: "",
    unidade_nome: "",
    plano_fechado: "",
    valor_combinado: "",
    sinal: "",
    forma_pagamento: "pix",
    data_venda: format(new Date(), "yyyy-MM-dd"),
    observacoes: "",
  });

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores'],
    queryFn: () => base44.entities.Vendedor.list("nome"),
    initialData: [],
  });

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
  });

  const criarLeadMutation = useMutation({
    mutationFn: async (leadData) => {
      // Criar lead com status já em plano_terapeutico
      const novoLead = await base44.entities.Lead.create({
        ...leadData,
        status: "plano_terapeutico",
        convertido: true,
        data_conversao: leadData.data_venda,
        temperatura: "quente",
        origem: "vendedor_direto",
      });

      // Criar interação de conversão
      await base44.entities.InteracaoLead.create({
        lead_id: novoLead.id,
        lead_nome: leadData.nome,
        tipo: "conversao_fechamento",
        descricao: `Plano Fechado: ${leadData.motivo_fechamento} | Valor: R$ ${leadData.valor_negociado}`,
        resultado: "positivo",
        vendedor_nome: leadData.vendedor_nome,
        data_interacao: new Date().toISOString(),
      });

      return novoLead;
    },
    onSuccess: () => {
      alert("✅ Venda lançada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setFormData({
        cliente_nome: "",
        cliente_telefone: "",
        vendedor_id: "",
        vendedor_nome: "",
        unidade_id: "",
        unidade_nome: "",
        plano_fechado: "",
        valor_combinado: "",
        sinal: "",
        forma_pagamento: "pix",
        data_venda: format(new Date(), "yyyy-MM-dd"),
        observacoes: "",
      });
    },
    onError: (error) => {
      alert(`❌ Erro ao lançar venda: ${error.message}`);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.cliente_nome || !formData.cliente_telefone || !formData.vendedor_id || !formData.unidade_id || !formData.plano_fechado || !formData.valor_combinado) {
      alert("⚠️ Preencha todos os campos obrigatórios!");
      return;
    }

    criarLeadMutation.mutate({
      nome: formData.cliente_nome,
      telefone: formData.cliente_telefone,
      vendedor_id: formData.vendedor_id,
      vendedor_nome: formData.vendedor_nome,
      unidade_id: formData.unidade_id,
      unidade_nome: formData.unidade_nome,
      motivo_fechamento: formData.plano_fechado,
      valor_negociado: parseFloat(formData.valor_combinado),
      sinal_pago: parseFloat(formData.sinal || 0),
      forma_pagamento: formData.forma_pagamento,
      data_venda: formData.data_venda,
      interesse: formData.plano_fechado,
      observacoes: formData.observacoes,
    });
  };

  const isVendedor = user?.cargo === "vendedor";

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isVendedor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-6">Esta página é exclusiva para vendedores.</p>
          <Button onClick={() => navigate(createPageUrl("Agenda"))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Agenda
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate(createPageUrl("Agenda"))}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-green-600" />
                  Lançar Vendas
                </h1>
                <p className="text-gray-600 mt-1">Registre vendas diretas no CRM</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados do Cliente */}
            <div className="border-2 border-gray-200 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                👤 Dados do Cliente
              </h3>
              
              <div>
                <Label>Nome do Cliente *</Label>
                <Input
                  value={formData.cliente_nome}
                  onChange={(e) => setFormData({ ...formData, cliente_nome: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <Label>Telefone *</Label>
                <Input
                  value={formData.cliente_telefone}
                  onChange={(e) => setFormData({ ...formData, cliente_telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            {/* Dados da Venda */}
            <div className="border-2 border-gray-200 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                💼 Dados da Venda
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Vendedor *</Label>
                  <Select 
                    value={formData.vendedor_id} 
                    onValueChange={(value) => {
                      const vendedor = vendedores.find(v => v.id === value);
                      setFormData({ 
                        ...formData, 
                        vendedor_id: value,
                        vendedor_nome: vendedor?.nome || "" 
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vendedores.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Unidade *</Label>
                  <Select 
                    value={formData.unidade_id} 
                    onValueChange={(value) => {
                      const unidade = unidades.find(u => u.id === value);
                      setFormData({ 
                        ...formData, 
                        unidade_id: value,
                        unidade_nome: unidade?.nome || "" 
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Plano Fechado *</Label>
                <Select value={formData.plano_fechado} onValueChange={(value) => setFormData({ ...formData, plano_fechado: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o plano..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plano_24_sessoes">Plano 24 Sessões (Caribe)</SelectItem>
                    <SelectItem value="plano_12_sessoes">Plano 12 Sessões</SelectItem>
                    <SelectItem value="plano_6_sessoes">Plano 6 Sessões</SelectItem>
                    <SelectItem value="sessao_avulsa">Sessão Avulsa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor Combinado (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor_combinado}
                    onChange={(e) => setFormData({ ...formData, valor_combinado: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label>Sinal Pago (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.sinal}
                    onChange={(e) => setFormData({ ...formData, sinal: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Forma de Pagamento *</Label>
                  <Select value={formData.forma_pagamento} onValueChange={(value) => setFormData({ ...formData, forma_pagamento: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                      <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Data da Venda *</Label>
                  <Input
                    type="date"
                    value={formData.data_venda}
                    onChange={(e) => setFormData({ ...formData, data_venda: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Observações sobre a venda..."
                  rows={3}
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate(createPageUrl("Agenda"))}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-green-600 hover:bg-green-700"
                disabled={criarLeadMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {criarLeadMutation.isPending ? "Salvando..." : "Lançar Venda"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}