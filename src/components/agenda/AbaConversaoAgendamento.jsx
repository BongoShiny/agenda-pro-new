import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Edit, Plus, Trash2, DollarSign, Package, Users, FileImage, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
    sessoes_personalizadas: "",
    valor_original: agendamento.conversao_valor_original?.toString() || "",
    desconto: agendamento.conversao_desconto?.toString() || "",
    valor_final: agendamento.conversao_valor_final?.toString() || "",
    sinal: agendamento.conversao_sinal?.toString() || "",
    recebimento_2: agendamento.conversao_recebimento_2?.toString() || "",
    valor_falta_pagar: agendamento.conversao_valor_falta_pagar?.toString() || "",
    forma_pagamento: agendamento.conversao_forma_pagamento || "pix",
    forma_pagamento_2: agendamento.conversao_forma_pagamento_2 || "",
    parcelas: agendamento.conversao_parcelas?.toString() || "1",
    parcelas_2: agendamento.conversao_parcelas_2?.toString() || "",
    motivos_fechamento: [],
    observacoes: "",
    motivo_nao_conversao: "",
    nao_conversao_valor_pago: agendamento.nao_conversao_valor_pago?.toString() || (agendamento.falta_quanto > 0 ? agendamento.falta_quanto.toString() : "0"),
    nao_conversao_forma_pagamento: agendamento.nao_conversao_forma_pagamento || "",
    nao_conversao_forma_pagamento_2: agendamento.nao_conversao_forma_pagamento_2 || "",
    nao_conversao_parcelas: agendamento.nao_conversao_parcelas?.toString() || "",
    nao_conversao_parcelas_2: agendamento.nao_conversao_parcelas_2?.toString() || "",
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

  const handleExcluirRegistro = async () => {
    const confirmacao = window.confirm("⚠️ Tem certeza que deseja excluir este registro de conversão?\n\nO agendamento não será excluído, apenas os dados da conversão.");
    
    if (!confirmacao) return;

    try {
      await updateAgendamentoMutation.mutateAsync({
        data_conversao: null,
        conversao_plano: null,
        conversao_profissional_id: null,
        conversao_profissional_nome: null,
        conversao_recepcionista: null,
        conversao_motivos: null,
        conversao_forma_pagamento: null,
        conversao_desconto: null,
        conversao_converteu: null,
        conversao_motivo_nao_converteu: null,
        conversao_recepcionista_nao_converteu: null,
        conversao_parcelas: null,
        conversao_valor_original: null,
        conversao_valor_final: null,
        conversao_sinal: null,
        conversao_recebimento_2: null,
        conversao_valor_falta_pagar: null,
        nao_conversao_valor_pago: null,
        nao_conversao_forma_pagamento: null,
        nao_conversao_parcelas: null,
      });

      alert("✅ Registro de conversão excluído com sucesso!");
    } catch (error) {
      alert("❌ Erro ao excluir o registro: " + error.message);
    }
  };

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

    if (!formData.recepcao_fechou) {
      alert("⚠️ Selecione a recepcionista que fechou");
      return;
    }

    if (formData.pacote_fechado === "plano_personalizado" && !formData.sessoes_personalizadas) {
      alert("⚠️ Preencha o número de sessões para o plano personalizado");
      return;
    }

      const planoPorSessoes = formData.pacote_fechado === "plano_personalizado" 
        ? `plano_${formData.sessoes_personalizadas}_sessoes`
        : formData.pacote_fechado;

      await updateAgendamentoMutation.mutateAsync({
        data_conversao: formData.data_conversao,
        status: "concluido",
        observacoes: formData.observacoes,
        conversao_plano: planoPorSessoes,
        conversao_profissional_id: formData.terapeuta_id,
        conversao_profissional_nome: formData.terapeuta_nome,
        conversao_recepcionista: formData.recepcao_fechou,
        conversao_motivos: formData.motivos_fechamento.join(", "),
        conversao_forma_pagamento: formData.forma_pagamento,
        conversao_desconto: parseFloat(formData.desconto) || 0,
        conversao_parcelas: parseInt(formData.parcelas) || 1,
        conversao_valor_original: parseFloat(formData.valor_original) || 0,
        conversao_valor_final: parseFloat(formData.valor_final) || 0,
        conversao_sinal: parseFloat(formData.sinal) || 0,
        conversao_recebimento_2: parseFloat(formData.recebimento_2) || 0,
        conversao_valor_falta_pagar: parseFloat(formData.valor_falta_pagar) || 0,
        conversao_converteu: true,
      });

      // Não mostra alert, deixa a mensagem de sucesso aparecer no card
    } else {
      if (!formData.recepcao_nao_fechou) {
        alert("⚠️ Selecione a recepcionista que não fechou");
        return;
      }

      if (!formData.motivo_nao_conversao) {
        alert("⚠️ Selecione o motivo de não conversão");
        return;
      }

      const valorPago = parseFloat(formData.nao_conversao_valor_pago) || 0;
      const novoFaltaQuanto = (agendamento.falta_quanto || 0) - valorPago;

      await updateAgendamentoMutation.mutateAsync({
        data_conversao: formData.data_conversao,
        status: "concluido",
        observacoes: formData.observacoes,
        conversao_converteu: false,
        conversao_motivo_nao_converteu: formData.motivo_nao_conversao,
        conversao_recepcionista_nao_converteu: formData.recepcao_nao_fechou,
        nao_conversao_valor_pago: valorPago,
        nao_conversao_forma_pagamento: formData.nao_conversao_forma_pagamento,
        nao_conversao_parcelas: parseInt(formData.nao_conversao_parcelas) || null,
        falta_quanto: novoFaltaQuanto,
      });
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
      sessoes_personalizadas: "",
      valor_original: "",
      desconto: "",
      valor_final: "",
      sinal: "",
      recebimento_2: "",
      valor_falta_pagar: "",
      forma_pagamento: "pix",
      parcelas: "1",
      motivos_fechamento: [],
      observacoes: "",
      motivo_nao_conversao: "",
      nao_conversao_valor_pago: "",
      nao_conversao_forma_pagamento: "",
      nao_conversao_parcelas: "",
    });
  };

  const handleMotivoCheck = React.useCallback((motivo) => {
    setFormData(prev => ({
      ...prev,
      motivos_fechamento: prev.motivos_fechamento.includes(motivo)
        ? prev.motivos_fechamento.filter(m => m !== motivo)
        : [...prev.motivos_fechamento, motivo]
    }));
  }, []);

  // Debounce para o campo de observações
  const debounceTimerRef = useRef(null);
  const [localObservacoes, setLocalObservacoes] = useState(formData.observacoes);

  const handleObservacoesChange = React.useCallback((value) => {
    setLocalObservacoes(value);
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      setFormData(prev => ({ ...prev, observacoes: value }));
    }, 300);
  }, []);

  useEffect(() => {
    setLocalObservacoes(formData.observacoes);
  }, [formData.observacoes]);

  // Recarregar dados quando entra em modo edição
  useEffect(() => {
    if (modoEdicao) {
      // Extrair sessões personalizadas do plano se existirem
      let sessoesPersonalizadas = "";
      const planoArmazenado = agendamento.conversao_plano || "";
      const matchSessoes = planoArmazenado.match(/plano_(\d+)_sessoes/);
      if (matchSessoes && ![24, 16, 12, 8].includes(parseInt(matchSessoes[1]))) {
        sessoesPersonalizadas = matchSessoes[1];
      }

      setFormData(prev => ({
        ...prev,
        data_conversao: agendamento.data_conversao || prev.data_conversao,
        valor_original: agendamento.conversao_valor_original?.toString() || prev.valor_original,
        valor_final: agendamento.conversao_valor_final?.toString() || prev.valor_final,
        sinal: agendamento.conversao_sinal?.toString() || prev.sinal,
        recebimento_2: agendamento.conversao_recebimento_2?.toString() || prev.recebimento_2,
        valor_falta_pagar: agendamento.conversao_valor_falta_pagar?.toString() || prev.valor_falta_pagar,
        pacote_fechado: matchSessoes && ![24, 16, 12, 8].includes(parseInt(matchSessoes[1])) ? "plano_personalizado" : (agendamento.conversao_plano || prev.pacote_fechado),
        sessoes_personalizadas: sessoesPersonalizadas,
        recepcao_fechou: agendamento.conversao_recepcionista || prev.recepcao_fechou,
        terapeuta_id: agendamento.conversao_profissional_id || agendamento.profissional_id || prev.terapeuta_id,
        terapeuta_nome: agendamento.conversao_profissional_nome || agendamento.profissional_nome || prev.terapeuta_nome,
        motivos_fechamento: agendamento.conversao_motivos?.split(",").map(m => m.trim()).filter(m => m) || prev.motivos_fechamento,
        forma_pagamento: agendamento.conversao_forma_pagamento || prev.forma_pagamento,
        parcelas: agendamento.conversao_parcelas?.toString() || "1",
        desconto: agendamento.conversao_desconto?.toString() || prev.desconto,
        observacoes: agendamento.observacoes || prev.observacoes,
      }));
    }
  }, [modoEdicao, agendamento]);

  useEffect(() => {
    // Não recalcula se não houver valor original ou se estiver editando texto
    if (!formData.valor_original || formData.desconto === undefined) return;
    
    const original = parseFloat(formData.valor_original) || 0;
    const desc = parseFloat(formData.desconto) || 0;
    const final = original - (original * desc / 100);
    
    const sinal = parseFloat(formData.sinal) || 0;
    const recebimento2 = parseFloat(formData.recebimento_2) || 0;
    const totalPago = sinal + recebimento2;
    const faltaPagar = final - totalPago;
    
    setFormData(prev => ({ 
      ...prev, 
      valor_final: final.toFixed(2),
      valor_falta_pagar: Math.max(0, faltaPagar).toFixed(2)
    }));
  }, [formData.valor_original, formData.desconto, formData.sinal, formData.recebimento_2]);

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

  const jaFechou = agendamento.conversao_converteu === true;
  const jaNaoFechou = agendamento.conversao_converteu === false;

  return (
    <div className="space-y-4 py-4">
      {/* Mensagem quando plano foi FECHADO */}
      {jaFechou && !modoRegistro && (
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-green-900">✅ Seu registro foi enviado para análise</h3>
                <p className="text-sm text-green-700 mt-1">
                  Caso queira editar, clique no lápis ao lado e edite o registro.
                </p>
                <p className="text-xs text-green-600 mt-2">
                  {`Plano: ${agendamento.conversao_plano} | Recepção: ${agendamento.conversao_recepcionista}`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
               variant="outline" 
               size="sm"
               onClick={() => {
                 setModoEdicao(true);
                 setModoRegistro(true);
                 setFechouPacote(true);
               }}
               className="flex-shrink-0 border-green-600 text-green-700 hover:bg-green-100"
              >
               <Edit className="w-4 h-4" />
              </Button>
              <Button 
               variant="outline" 
               size="sm"
               onClick={handleExcluirRegistro}
               className="flex-shrink-0 border-red-600 text-red-700 hover:bg-red-100"
              >
               <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mensagem quando NÃO fechou */}
      {jaNaoFechou && !modoRegistro && (
        <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-orange-900">✅ Seu registro foi enviado para análise</h3>
                <p className="text-sm text-orange-700 mt-1">
                  Caso queira editar, clique no lápis ao lado e edite o registro.
                </p>
                <p className="text-xs text-orange-600 mt-2">
                  {`Motivo: ${agendamento.conversao_motivo_nao_converteu}`}
                  {agendamento.nao_conversao_valor_pago > 0 && (
                    <>
                      <span className="ml-2 font-semibold">| Valor Pago: R$ {agendamento.nao_conversao_valor_pago.toFixed(2)}</span>
                      {agendamento.nao_conversao_forma_pagamento && (
                        <span className="ml-2">
                          ({agendamento.nao_conversao_forma_pagamento === "pix" && "PIX"}
                          {agendamento.nao_conversao_forma_pagamento === "dinheiro" && "Dinheiro"}
                          {agendamento.nao_conversao_forma_pagamento === "boleto" && `Boleto ${agendamento.nao_conversao_parcelas || 1}x`}
                          {agendamento.nao_conversao_forma_pagamento === "cartao_credito" && `Crédito ${agendamento.nao_conversao_parcelas || 1}x`}
                          {agendamento.nao_conversao_forma_pagamento === "cartao_debito" && "Débito"})
                        </span>
                      )}
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
               variant="outline" 
               size="sm"
               onClick={() => {
                 setModoEdicao(true);
                 setModoRegistro(true);
                 setFechouPacote(false);
               }}
               className="flex-shrink-0 border-orange-600 text-orange-700 hover:bg-orange-100"
              >
               <Edit className="w-4 h-4" />
              </Button>
              <Button 
               variant="outline" 
               size="sm"
               onClick={handleExcluirRegistro}
               className="flex-shrink-0 border-red-600 text-red-700 hover:bg-red-100"
              >
               <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {!modoRegistro && !jaFechou && !jaNaoFechou && (
        <Button 
          onClick={() => {
            setModoRegistro(true);
          }}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Registrar Conversão
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
                    <Select value={formData.pacote_fechado} onValueChange={(value) => setFormData(prev => ({ ...prev, pacote_fechado: value, sessoes_personalizadas: "" }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o plano..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plano_24_sessoes">Plano 24 Sessões</SelectItem>
                        <SelectItem value="plano_16_sessoes">Plano 16 Sessões</SelectItem>
                        <SelectItem value="plano_12_sessoes">Plano 12 Sessões</SelectItem>
                        <SelectItem value="plano_8_sessoes">Plano 8 Sessões</SelectItem>
                        <SelectItem value="sessao_avulsa">Sessão Avulsa</SelectItem>
                        <SelectItem value="plano_personalizado">Plano Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.pacote_fechado === "plano_personalizado" && (
                    <div>
                      <Label>Número de Sessões *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.sessoes_personalizadas}
                        onChange={(e) => setFormData(prev => ({ ...prev, sessoes_personalizadas: e.target.value }))}
                        placeholder="Ex: 20"
                      />
                    </div>
                  )}

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
                     <Label>Valor Original *</Label>
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
                     <Label>Valor Final</Label>
                     <Input
                       type="number"
                       step="0.01"
                       value={formData.valor_final}
                       disabled
                       placeholder="0,00"
                       className="bg-gray-100"
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
                     <Label>Valor que Falta Pagar</Label>
                     <Input
                       type="number"
                       step="0.01"
                       value={formData.valor_falta_pagar}
                       disabled
                       placeholder="0,00"
                       className="bg-gray-100"
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
                       <SelectItem value="boleto">Boleto</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>

                 {(formData.forma_pagamento === "cartao_credito" || formData.forma_pagamento === "boleto") && (
                   <div>
                     <Label>Quantas Vezes?</Label>
                     <Select value={formData.parcelas} onValueChange={(value) => setFormData(prev => ({ ...prev, parcelas: value }))}>
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         {Array.from({ length: 12 }, (_, i) => (i + 1)).map(num => (
                           <SelectItem key={num} value={num.toString()}>{num}x</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                 )}
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

                {formData.motivos_fechamento.includes("Outro") && (
                  <div className="bg-white rounded-lg border p-3 mt-3">
                    <Label className="block mb-2">Especifique o motivo:</Label>
                    <Textarea
                      value={localObservacoes}
                      onChange={(e) => handleObservacoesChange(e.target.value)}
                      placeholder="Descreva o motivo específico aqui..."
                      rows={3}
                    />
                  </div>
                )}
              </div>


            </div>
          )}

          {fechouPacote === false && (
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-semibold text-gray-900">Motivo de Não Conversão</h4>

              <div>
                <Label>Data que Não Converteu *</Label>
                <Input
                  type="date"
                  value={formData.data_conversao}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_conversao: e.target.value }))}
                />
              </div>

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

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <Label className="font-semibold text-green-900 mb-2 block">💰 Valor Pago na Clínica *</Label>
                <p className="text-xs text-green-700 mb-3">Valor do restante pago na clínica após a avaliação. Este valor abate do "Falta Quanto" do Valor Combinado dos Detalhes (para abater nos relatórios Terapeuta x Recepção)</p>
                <Input
                  type="text"
                  value={`R$ ${parseFloat(formData.nao_conversao_valor_pago || 0).toFixed(2)}`}
                  disabled
                  className="mb-3 bg-gray-100 font-semibold text-lg"
                />

                <div className="space-y-3 pt-3 border-t border-green-300">
                   <div>
                     <Label className="text-green-900">1ª Forma de Pagamento *</Label>
                     <Select value={formData.nao_conversao_forma_pagamento} onValueChange={(value) => setFormData(prev => ({ ...prev, nao_conversao_forma_pagamento: value }))}>
                       <SelectTrigger>
                         <SelectValue placeholder="Selecione a forma" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="pix">PIX</SelectItem>
                         <SelectItem value="dinheiro">Dinheiro</SelectItem>
                         <SelectItem value="boleto">Boleto</SelectItem>
                         <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                         <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>

                   {(formData.nao_conversao_forma_pagamento === "boleto" || formData.nao_conversao_forma_pagamento === "cartao_credito") && (
                     <div>
                       <Label className="text-green-900">Quantas Parcelas? *</Label>
                       <Input
                         type="number"
                         min="1"
                         value={formData.nao_conversao_parcelas}
                         onChange={(e) => setFormData(prev => ({ ...prev, nao_conversao_parcelas: e.target.value }))}
                         placeholder="Ex: 2"
                       />
                     </div>
                   )}

                   <div>
                     <Label className="text-green-900">2ª Forma de Pagamento</Label>
                     <Select value={formData.nao_conversao_forma_pagamento_2 || ""} onValueChange={(value) => setFormData(prev => ({ ...prev, nao_conversao_forma_pagamento_2: value }))}>
                       <SelectTrigger>
                         <SelectValue placeholder="Selecione a forma" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value={null}>Nenhuma</SelectItem>
                         <SelectItem value="pix">PIX</SelectItem>
                         <SelectItem value="dinheiro">Dinheiro</SelectItem>
                         <SelectItem value="boleto">Boleto</SelectItem>
                         <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                         <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>

                   {formData.nao_conversao_forma_pagamento_2 && (formData.nao_conversao_forma_pagamento_2 === "boleto" || formData.nao_conversao_forma_pagamento_2 === "cartao_credito") && (
                     <div>
                       <Label className="text-green-900">Quantas Parcelas? (2ª Forma)</Label>
                       <Input
                         type="number"
                         min="1"
                         value={formData.nao_conversao_parcelas_2 || ""}
                         onChange={(e) => setFormData(prev => ({ ...prev, nao_conversao_parcelas_2: e.target.value }))}
                         placeholder="Ex: 2"
                       />
                     </div>
                   )}
                 </div>
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

              {formData.motivo_nao_conversao === "Outro" && (
                <div className="bg-white rounded-lg border p-3">
                  <Label className="block mb-2">Especifique o motivo:</Label>
                  <Textarea
                    value={localObservacoes}
                    onChange={(e) => handleObservacoesChange(e.target.value)}
                    placeholder="Descreva o motivo específico aqui..."
                    rows={3}
                  />
                </div>
              )}
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
                disabled={fechouPacote === true ? !formData.recepcao_fechou : !formData.recepcao_nao_fechou}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
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