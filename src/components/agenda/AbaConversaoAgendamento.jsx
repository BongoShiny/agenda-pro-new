import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Edit, Plus } from "lucide-react";
import { format } from "date-fns";

export default function AbaConversaoAgendamento({ agendamento, onUpdate }) {
  const [modoRegistro, setModoRegistro] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [fechouPacote, setFechouPacote] = useState(null);
  const [formData, setFormData] = useState({
    data_conversao: agendamento.data_conversao || format(new Date(), "yyyy-MM-dd"),
    terapeuta_id: agendamento.profissional_id || "",
    terapeuta_nome: agendamento.profissional_nome || "",
    recepcao_fechou: "",
    recepcao_nao_fechou: "",
    pacote_fechado: "",
    valor_original: agendamento.valor_combinado?.toString() || "",
    desconto: "",
    valor_final: agendamento.valor_combinado?.toString() || "",
    sinal: agendamento.sinal?.toString() || "",
    recebimento_2: agendamento.recebimento_2?.toString() || "",
    final_pagamento: agendamento.final_pagamento?.toString() || "",
    forma_pagamento: "pix",
    motivos_fechamento: [],
    observacoes: "",
    motivo_nao_conversao: "",
  });

  const queryClient = useQueryClient();

  const { data: profissionais = [] } = useQuery({
    queryKey: ['profissionais'],
    queryFn: () => base44.entities.Profissional.list("nome"),
    initialData: [],
  });

  const { data: recepcionistas = [] } = useQuery({
    queryKey: ['recepcionistas', agendamento.unidade_id],
    queryFn: () => base44.entities.Recepcionista.filter({ unidade_id: agendamento.unidade_id }),
    initialData: [],
    enabled: !!agendamento.unidade_id,
  });

  const updateAgendamentoMutation = useMutation({
    mutationFn: (data) => base44.entities.Agendamento.update(agendamento.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      onUpdate?.();
    },
  });

  const handleSalvarRegistro = async () => {
    if (fechouPacote === null) {
      alert("⚠️ Selecione se o cliente fechou ou não o pacote");
      return;
    }

    if (fechouPacote === true) {
      if (!formData.data_conversao || !formData.pacote_fechado) {
        alert("⚠️ Preencha os campos obrigatórios: Data de Conversão e Plano Fechado");
        return;
      }

      await updateAgendamentoMutation.mutateAsync({
        data_conversao: formData.data_conversao,
        status: "concluido",
        valor_combinado: parseFloat(formData.valor_final) || agendamento.valor_combinado,
        sinal: parseFloat(formData.sinal) || 0,
        recebimento_2: parseFloat(formData.recebimento_2) || 0,
        final_pagamento: parseFloat(formData.final_pagamento) || 0,
        forma_pagamento: formData.forma_pagamento,
        observacoes_pos_venda: `Plano: ${formData.pacote_fechado} | Recepção: ${formData.recepcao_fechou} | Motivos: ${formData.motivos_fechamento.join(", ")} ${formData.observacoes ? `| ${formData.observacoes}` : ""}`,
      });

      alert("🎉 Plano fechado com sucesso!");
    } else {
      if (!formData.motivo_nao_conversao) {
        alert("⚠️ Selecione o motivo de não conversão");
        return;
      }

      await updateAgendamentoMutation.mutateAsync({
        data_conversao: formData.data_conversao,
        status: "concluido",
        observacoes_pos_venda: `Não Converteu: ${formData.motivo_nao_conversao} | Recepção: ${formData.recepcao_nao_fechou}${formData.observacoes ? ` | ${formData.observacoes}` : ""}`,
      });

      alert("✅ Tentativa registrada!");
    }

    setModoRegistro(false);
    setModoEdicao(false);
    setFechouPacote(null);
    setFormData({
      data_conversao: format(new Date(), "yyyy-MM-dd"),
      terapeuta_id: agendamento.profissional_id || "",
      terapeuta_nome: agendamento.profissional_nome || "",
      recepcao_fechou: "",
      recepcao_nao_fechou: "",
      pacote_fechado: "",
      valor_original: agendamento.valor_combinado?.toString() || "",
      desconto: "",
      valor_final: agendamento.valor_combinado?.toString() || "",
      sinal: agendamento.sinal?.toString() || "",
      recebimento_2: agendamento.recebimento_2?.toString() || "",
      final_pagamento: agendamento.final_pagamento?.toString() || "",
      forma_pagamento: "pix",
      motivos_fechamento: [],
      observacoes: "",
      motivo_nao_conversao: "",
    });
  };

  const handleMotivoCheck = (motivo) => {
    setFormData(prev => ({
      ...prev,
      motivos_fechamento: prev.motivos_fechamento.includes(motivo)
        ? prev.motivos_fechamento.filter(m => m !== motivo)
        : [...prev.motivos_fechamento, motivo]
    }));
  };

  useEffect(() => {
    if (formData.valor_original && formData.desconto) {
      const original = parseFloat(formData.valor_original);
      const desc = parseFloat(formData.desconto);
      const final = original - (original * desc / 100);
      setFormData(prev => ({ ...prev, valor_final: final.toFixed(2) }));
    }
  }, [formData.valor_original, formData.desconto]);

  const motivosFechamento = [
    "Cliente verificou avaliação e não julgou",
    "Sentiu-se bem acolhida e não julgada",
    "Verificou vídeos e resultados",
    "Necessidade de tratamento contínuo",
    "Recomendação de terceiros",
    "O valor estava bom conforme o número de sessões",
    "Parcelamento e condição de negociação",
    "Proximidade com a residência",
    "Ambiente acolhedor",
    "Ajudar a melhorar o resultado",
    "Outro"
  ];

  const motivosNaoConversao = [
    "Preço alto",
    "Preferiu aguardar para pensar melhor",
    "Quis primeiro realizar avaliação física",
    "Não identificou ainda fechamento",
    "Quis opções e comparar concorrência",
    "Outro"
  ];

  const jaFechou = agendamento.observacoes_pos_venda?.includes("Plano:");

  return (
    <div className="space-y-4 py-4">
      {jaFechou && (
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-green-900">Plano Fechado com Sucesso!</h3>
                <p className="text-sm text-green-700">
                  {agendamento.observacoes_pos_venda}
                </p>
              </div>
            </div>
            <Button 
             variant="outline" 
             size="sm"
             onClick={() => {
               setModoEdicao(true);
               setModoRegistro(true);
               setFechouPacote(true);
             }}
            >
             <Edit className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {!modoRegistro && (
        <Button 
          onClick={() => {
            if (jaFechou) {
              setModoEdicao(true);
              setFechouPacote(true);
            }
            setModoRegistro(true);
          }}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          {jaFechou ? "Editar Plano Fechado" : "Registrar Conversão"}
        </Button>
      )}

      {modoRegistro && (
        <div className="border-2 border-gray-200 rounded-lg p-6 bg-gray-50 space-y-6">
          <h3 className="font-bold text-lg text-gray-900">{modoEdicao ? "Editar Plano Fechado" : "Registrar Conversão"}</h3>

          {!modoEdicao && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">O cliente fechou um plano?</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={fechouPacote === true ? "default" : "outline"}
                  onClick={() => setFechouPacote(true)}
                  className={fechouPacote === true ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  Sim, fechou plano
                </Button>
                <Button
                  type="button"
                  variant={fechouPacote === false ? "default" : "outline"}
                  onClick={() => setFechouPacote(false)}
                  className={fechouPacote === false ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  Não fechou
                </Button>
              </div>
            </div>
            )}

            {fechouPacote === true && (
            <div className="space-y-6 pt-4 border-t">
              {/* SEÇÃO 1: INFORMAÇÕES DO PLANO FECHADO */}
              <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                <h4 className="font-semibold text-gray-900 border-b pb-2">📋 Informações do Plano Fechado</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data da Conversão *</Label>
                    <Input
                      type="date"
                      value={formData.data_conversao}
                      onChange={(e) => setFormData(prev => ({ ...prev, data_conversao: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>Plano Terapêutico Fechado *</Label>
                    <Select value={formData.pacote_fechado} onValueChange={(value) => setFormData(prev => ({ ...prev, pacote_fechado: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o plano..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plano_24_sessoes">Plano 24 Sessões</SelectItem>
                        <SelectItem value="plano_16_sessoes">Plano 16 Sessões</SelectItem>
                        <SelectItem value="plano_12_sessoes">Plano 12 Sessões</SelectItem>
                        <SelectItem value="plano_8_sessoes">Plano 8 Sessões</SelectItem>
                        <SelectItem value="sessao_avulsa">Sessão Avulsa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Profissional *</Label>
                    <Select 
                      value={formData.terapeuta_id} 
                      onValueChange={(value) => {
                        const prof = profissionais.find(p => p.id === value);
                        setFormData(prev => ({ 
                          ...prev, 
                          terapeuta_id: value,
                          terapeuta_nome: prof?.nome || ""
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o profissional..." />
                      </SelectTrigger>
                      <SelectContent>
                        {profissionais.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Recepção que Fechou *</Label>
                    <Select value={formData.recepcao_fechou} onValueChange={(value) => setFormData(prev => ({ ...prev, recepcao_fechou: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a recepcionista" />
                      </SelectTrigger>
                      <SelectContent>
                        {recepcionistas.map(r => (
                          <SelectItem key={r.id} value={r.nome}>{r.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: VALORES E PAGAMENTO */}
              <div className="bg-green-50 rounded-lg p-4 space-y-4">
                <h4 className="font-semibold text-gray-900 border-b pb-2">💰 Valores e Pagamento</h4>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Valor Original</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor_original}
                      onChange={(e) => setFormData(prev => ({ ...prev, valor_original: e.target.value }))}
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <Label>Desconto (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.desconto}
                      onChange={(e) => setFormData(prev => ({ ...prev, desconto: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Valor Final *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor_final}
                      onChange={(e) => setFormData(prev => ({ ...prev, valor_final: e.target.value }))}
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                  <div>
                    <Label>Sinal</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.sinal}
                      onChange={(e) => setFormData(prev => ({ ...prev, sinal: e.target.value }))}
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <Label>Recebimento 2</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.recebimento_2}
                      onChange={(e) => setFormData(prev => ({ ...prev, recebimento_2: e.target.value }))}
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <Label>Pagamento Final</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.final_pagamento}
                      onChange={(e) => setFormData(prev => ({ ...prev, final_pagamento: e.target.value }))}
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <div>
                  <Label>Forma de Pagamento</Label>
                  <Select value={formData.forma_pagamento} onValueChange={(value) => setFormData(prev => ({ ...prev, forma_pagamento: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                      <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="parcelado">Parcelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* SEÇÃO 3: MOTIVOS DE DECISÃO */}
              <div className="bg-yellow-50 rounded-lg p-4 space-y-4">
                <h4 className="font-semibold text-gray-900 border-b pb-2">🎯 Por que o cliente decidiu fechar o plano? *</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto bg-white rounded-lg border p-3">
                  {motivosFechamento.map((motivo) => (
                    <div key={motivo} className="flex items-start gap-2">
                      <Checkbox
                        checked={formData.motivos_fechamento.includes(motivo)}
                        onCheckedChange={() => handleMotivoCheck(motivo)}
                        id={`motivo-${motivo}`}
                      />
                      <label htmlFor={`motivo-${motivo}`} className="text-sm text-gray-700 cursor-pointer flex-1">
                        {motivo}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* SEÇÃO 4: OBSERVAÇÕES ADICIONAIS */}
              <div className="bg-purple-50 rounded-lg p-4 space-y-4">
                <h4 className="font-semibold text-gray-900 border-b pb-2">📝 Observações Adicionais</h4>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Registre detalhes adicionais importantes sobre a conversão, interações específicas ou informações relevantes para análise financeira..."
                  rows={4}
                />
              </div>
            </div>
          )}

          {fechouPacote === false && (
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-semibold text-gray-900">Motivo de Não Conversão</h4>
              
              <div>
                <Label>Recepção que Não Fechou *</Label>
                <Select value={formData.recepcao_nao_fechou} onValueChange={(value) => setFormData(prev => ({ ...prev, recepcao_nao_fechou: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a recepcionista" />
                  </SelectTrigger>
                  <SelectContent>
                    {recepcionistas.map(r => (
                      <SelectItem key={r.id} value={r.nome}>{r.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">Por que o cliente decidiu não fechar o plano? *</Label>
                <div className="space-y-2 bg-white rounded-lg border p-3">
                  {motivosNaoConversao.map((motivo) => (
                    <div key={motivo} className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="motivo_nao_conversao"
                        value={motivo}
                        checked={formData.motivo_nao_conversao === motivo}
                        onChange={(e) => setFormData(prev => ({ ...prev, motivo_nao_conversao: e.target.value }))}
                        id={`nao-${motivo}`}
                        className="mt-1"
                      />
                      <label htmlFor={`nao-${motivo}`} className="text-sm text-gray-700 cursor-pointer flex-1">
                        {motivo}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Detalhes sobre o encontro..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {fechouPacote !== null && (
            <div className="flex gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setModoRegistro(false);
                    setModoEdicao(false);
                    setFechouPacote(null);
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              <Button 
                onClick={handleSalvarRegistro}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Salvar Registro
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}