import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, DollarSign, Save, X, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

export default function LancarVendasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [uploadingComprovante, setUploadingComprovante] = useState(false);
  const [formData, setFormData] = useState({
    cliente_nome: "",
    cliente_telefone: "",
    terapias: [],
    data_sessao: format(new Date(), "yyyy-MM-dd"),
    horario_inicio: "",
    horario_fim: "",
    restante_pagamento: "nao",
    pago_por: "",
    valor_pago: "",
    data_pagamento: format(new Date(), "yyyy-MM-dd"),
    valor_combinado: "",
    falta_quanto: "",
    forma_pagamento: "pix",
    parcelas: "",
    recepcionista_id: "",
    vendedor_id: "",
    profissional_id: "",
    motivo: "",
    queixa: "",
    comprovante_url: "",
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

  const { data: profissionais = [] } = useQuery({
    queryKey: ['profissionais'],
    queryFn: () => base44.entities.Profissional.list("nome"),
    initialData: [],
  });

  const { data: recepcionistas = [] } = useQuery({
    queryKey: ['recepcionistas'],
    queryFn: () => base44.entities.Recepcionista.list("nome"),
    initialData: [],
  });

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: () => base44.entities.Servico.list("nome"),
    initialData: [],
  });

  const criarAgendamentoMutation = useMutation({
    mutationFn: async (dadosAgendamento) => {
      return await base44.entities.Agendamento.create(dadosAgendamento);
    },
    onSuccess: () => {
      alert("✅ Venda lançada com sucesso nos relatórios financeiros!");
      queryClient.invalidateQueries({ queryKey: ['agendamentos-financeiro'] });
      navigate(createPageUrl("Agenda"));
    },
    onError: (error) => {
      alert(`❌ Erro ao lançar venda: ${error.message}`);
    },
  });

  const handleUploadComprovante = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingComprovante(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, comprovante_url: file_url });
      alert("✅ Comprovante anexado com sucesso!");
    } catch (error) {
      alert(`❌ Erro ao anexar comprovante: ${error.message}`);
    } finally {
      setUploadingComprovante(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.cliente_nome || !formData.cliente_telefone || !formData.data_sessao || !formData.profissional_id || !formData.valor_combinado || formData.terapias.length === 0) {
      alert("⚠️ Preencha todos os campos obrigatórios!");
      return;
    }

    const profissional = profissionais.find(p => p.id === formData.profissional_id);
    const vendedor = vendedores.find(v => v.id === formData.vendedor_id);
    const recepcionista = recepcionistas.find(r => r.id === formData.recepcionista_id);
    const terapiasNomes = formData.terapias.join(" + ");

    const valorCombinado = parseFloat(formData.valor_combinado) || 0;
    const valorPago = parseFloat(formData.valor_pago) || 0;
    const faltaQuanto = valorCombinado - valorPago;

    criarAgendamentoMutation.mutate({
      cliente_nome: formData.cliente_nome,
      cliente_telefone: formData.cliente_telefone,
      profissional_id: formData.profissional_id,
      profissional_nome: profissional?.nome || "",
      servico_nome: terapiasNomes,
      servico_id: "",
      unidade_id: recepcionista?.unidade_id || "",
      unidade_nome: recepcionista?.unidade_nome || "",
      vendedor_id: formData.vendedor_id,
      vendedor_nome: vendedor?.nome || "",
      data: formData.data_sessao,
      hora_inicio: formData.horario_inicio || "09:00",
      hora_fim: formData.horario_fim || "10:00",
      status: "concluido",
      tipo: formData.restante_pagamento === "sim" ? "pacote" : "avulsa",
      valor_combinado: valorCombinado,
      sinal: formData.restante_pagamento === "nao" ? valorPago : 0,
      final_pagamento: formData.restante_pagamento === "sim" ? valorPago : 0,
      falta_quanto: faltaQuanto,
      forma_pagamento: formData.forma_pagamento,
      data_pagamento: formData.data_pagamento,
      observacoes_vendedores: `Motivo: ${formData.motivo}\nQueixa: ${formData.queixa}\nPago por: ${formData.pago_por}${formData.parcelas ? `\nParcelas: ${formData.parcelas}x` : ""}`,
      anotacao_venda: formData.parcelas ? `${formData.forma_pagamento} - ${formData.parcelas}x` : formData.forma_pagamento,
      comprovante_1: formData.comprovante_url,
      criador_email: user?.email,
      status_paciente: "paciente_novo",
    });
  };

  const isVendedor = user?.cargo === "vendedor";
  const isAdmin = user?.role === "admin" || user?.cargo === "administrador" || user?.cargo === "superior";

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

  if (!isVendedor && !isAdmin) {
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-4xl mx-auto">
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
                <p className="text-gray-600 mt-1">Registre vendas nos relatórios financeiros</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados do Cliente */}
            <div className="border-2 border-gray-200 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                👤 Dados do Cliente
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome *</Label>
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
            </div>

            {/* Dados da Sessão */}
            <div className="border-2 border-gray-200 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                💼 Dados da Sessão
              </h3>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Terapia * (selecione uma ou mais)</Label>
                  <div className="border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                    {servicos.map(s => (
                      <div key={s.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`terapia-${s.id}`}
                          checked={formData.terapias.includes(s.nome)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, terapias: [...formData.terapias, s.nome] });
                            } else {
                              setFormData({ ...formData, terapias: formData.terapias.filter(t => t !== s.nome) });
                            }
                          }}
                        />
                        <label htmlFor={`terapia-${s.id}`} className="text-sm cursor-pointer">
                          {s.nome}
                        </label>
                      </div>
                    ))}
                  </div>
                  {formData.terapias.length > 0 && (
                    <p className="text-sm text-green-600 mt-2">
                      ✅ Selecionado: {formData.terapias.join(" + ")}
                    </p>
                  )}
                </div>

                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                  <p className="text-sm font-semibold text-yellow-800">📅 COMBINAR O DIA DA SESSÃO</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Terapeuta que Atendeu *</Label>
                  <Select value={formData.profissional_id} onValueChange={(value) => setFormData({ ...formData, profissional_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {profissionais.filter(p => p.ativo).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Recepcionista</Label>
                  <Select value={formData.recepcionista_id} onValueChange={(value) => setFormData({ ...formData, recepcionista_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {recepcionistas.filter(r => r.ativo).map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Vendedor</Label>
                  <Select value={formData.vendedor_id} onValueChange={(value) => setFormData({ ...formData, vendedor_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vendedores.filter(v => v.ativo).map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Pagamento */}
            <div className="border-2 border-gray-200 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                💰 Dados do Pagamento
              </h3>

              <div>
                <Label>É restante de pagamento?</Label>
                <RadioGroup value={formData.restante_pagamento} onValueChange={(value) => setFormData({ ...formData, restante_pagamento: value })}>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sim" id="sim" />
                      <Label htmlFor="sim">Sim</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nao" id="nao" />
                      <Label htmlFor="nao">Não</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pago Por</Label>
                  <Input
                    value={formData.pago_por}
                    onChange={(e) => setFormData({ ...formData, pago_por: e.target.value })}
                    placeholder="Nome de quem pagou"
                  />
                </div>

                <div>
                  <Label>Forma de Pagamento *</Label>
                  <Select value={formData.forma_pagamento} onValueChange={(value) => setFormData({ ...formData, forma_pagamento: value, parcelas: "" })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="link_pagamento">Link de Pagamento</SelectItem>
                      <SelectItem value="pago_na_clinica">Pago na Clínica</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                      <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(formData.forma_pagamento === "cartao_credito" || formData.forma_pagamento === "link_pagamento" || formData.forma_pagamento === "boleto") && (
                <div>
                  <Label>Em quantas vezes?</Label>
                  <Input
                    type="number"
                    value={formData.parcelas}
                    onChange={(e) => setFormData({ ...formData, parcelas: e.target.value })}
                    placeholder="Número de parcelas"
                    min="1"
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Valor Combinado (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor_combinado}
                    onChange={(e) => {
                      const valorCombinado = parseFloat(e.target.value) || 0;
                      const valorPago = parseFloat(formData.valor_pago) || 0;
                      setFormData({ 
                        ...formData, 
                        valor_combinado: e.target.value,
                        falta_quanto: (valorCombinado - valorPago).toFixed(2)
                      });
                    }}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label>Valor Pago (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor_pago}
                    onChange={(e) => {
                      const valorPago = parseFloat(e.target.value) || 0;
                      const valorCombinado = parseFloat(formData.valor_combinado) || 0;
                      setFormData({ 
                        ...formData, 
                        valor_pago: e.target.value,
                        falta_quanto: (valorCombinado - valorPago).toFixed(2)
                      });
                    }}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label>Falta Quanto (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.falta_quanto}
                    disabled
                    className="bg-gray-100"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label>Data do Pagamento *</Label>
                <Input
                  type="date"
                  value={formData.data_pagamento}
                  onChange={(e) => setFormData({ ...formData, data_pagamento: e.target.value })}
                />
              </div>
            </div>

            {/* Motivo e Queixa */}
            <div className="border-2 border-gray-200 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                📝 Informações Adicionais
              </h3>

              <div>
                <Label>Motivo</Label>
                <Textarea
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  placeholder="Motivo da sessão..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Queixa</Label>
                <Textarea
                  value={formData.queixa}
                  onChange={(e) => setFormData({ ...formData, queixa: e.target.value })}
                  placeholder="Queixa do cliente..."
                  rows={2}
                />
              </div>
            </div>

            {/* Anexar Comprovante */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <Label className="mb-2 block">Anexar Comprovante</Label>
              <div className="flex items-center gap-4">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center gap-3 border-2 border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <Upload className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {formData.comprovante_url ? "✅ Comprovante anexado" : "Clique para anexar comprovante"}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadComprovante}
                    className="hidden"
                    disabled={uploadingComprovante}
                  />
                </label>
                {formData.comprovante_url && (
                  <a href={formData.comprovante_url} target="_blank" rel="noopener noreferrer">
                    <Button type="button" variant="outline" size="sm">
                      Ver Comprovante
                    </Button>
                  </a>
                )}
              </div>
              {uploadingComprovante && (
                <p className="text-sm text-blue-600 mt-2">Enviando comprovante...</p>
              )}
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
                disabled={criarAgendamentoMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {criarAgendamentoMutation.isPending ? "Salvando..." : "Lançar Venda"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}