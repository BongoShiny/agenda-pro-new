import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, XCircle, Edit, Plus } from "lucide-react";
import { format } from "date-fns";

export default function AbaConversao({ lead, onUpdate }) {
  const [modoRegistro, setModoRegistro] = useState(false);
  const [fechouPacote, setFechouPacote] = useState(null); // null, true, false
  const [formData, setFormData] = useState({
    data_conversao: format(new Date(), "yyyy-MM-dd"),
    recepcao_vendeu: "",
    pacote_fechado: "",
    valor_original: "",
    desconto: "",
    valor_final: "",
    forma_pagamento: "pix",
    motivos_fechamento: [],
    observacoes: "",
    motivo_nao_conversao: "",
  });

  const queryClient = useQueryClient();

  // Buscar recepcionistas da unidade do lead
  const { data: recepcionistas = [] } = useQuery({
    queryKey: ['recepcionistas'],
    queryFn: () => base44.entities.Recepcionista.list("nome"),
    initialData: [],
  });

  const recepcionistasDaUnidade = recepcionistas.filter(r => r.unidade_id === lead.unidade_id);

  // Buscar interações do lead
  const { data: interacoes = [] } = useQuery({
    queryKey: ['interacoes', lead.id],
    queryFn: () => base44.entities.InteracaoLead.filter({ lead_id: lead.id }, "-data_interacao"),
  });

  const createInteracaoMutation = useMutation({
    mutationFn: (data) => base44.entities.InteracaoLead.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interacoes', lead.id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      onUpdate();
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.update(lead.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      onUpdate();
    },
  });

  const handleSalvarRegistro = async () => {
    if (fechouPacote === null) {
      alert("⚠️ Selecione se o cliente fechou ou não o pacote");
      return;
    }

    if (fechouPacote === true) {
      // Validar campos obrigatórios
      if (!formData.data_conversao || !formData.pacote_fechado) {
        alert("⚠️ Preencha os campos obrigatórios: Data de Conversão e Pacote Fechado");
        return;
      }

      // Registrar conversão bem-sucedida
      const descricao = `Pacote Fechado: ${formData.pacote_fechado}${formData.motivos_fechamento.length > 0 ? ` | Motivos: ${formData.motivos_fechamento.join(", ")}` : ""}${formData.observacoes ? ` | Obs: ${formData.observacoes}` : ""}`;

      await createInteracaoMutation.mutateAsync({
        lead_id: lead.id,
        lead_nome: lead.nome,
        tipo: "conversao_fechamento",
        descricao: descricao,
        resultado: "positivo",
        vendedor_nome: lead.vendedor_nome,
        data_interacao: new Date().toISOString(),
      });

      // Calcular tempo de conversão em dias
      const dataInicio = new Date(lead.data_primeiro_contato || lead.created_date);
      const dataFim = new Date(formData.data_conversao);
      const tempoConversaoDias = Math.ceil((dataFim - dataInicio) / (1000 * 60 * 60 * 24));

      await updateLeadMutation.mutateAsync({
        status: "fechado",
        convertido: true,
        data_conversao: formData.data_conversao,
        motivo_fechamento: `${formData.pacote_fechado} - ${formData.motivos_fechamento.join(", ")}`,
        valor_negociado: formData.valor_final ? parseFloat(formData.valor_final) : null,
        anotacoes_internas: `${lead.anotacoes_internas || ""}\n\n⏱️ Tempo de conversão: ${tempoConversaoDias} dias`.trim(),
      });

      alert("🎉 Pacote fechado com sucesso!");
    } else {
      // Registrar tentativa sem conversão
      if (!formData.motivo_nao_conversao) {
        alert("⚠️ Selecione o motivo de não conversão");
        return;
      }

      const descricao = `Não Converteu: ${formData.motivo_nao_conversao}${formData.observacoes ? ` | Obs: ${formData.observacoes}` : ""}`;

      await createInteracaoMutation.mutateAsync({
        lead_id: lead.id,
        lead_nome: lead.nome,
        tipo: "tentativa_contato",
        descricao: descricao,
        resultado: "negativo",
        vendedor_nome: lead.vendedor_nome,
        data_interacao: new Date().toISOString(),
      });

      await updateLeadMutation.mutateAsync({
        tentativas_contato: (lead.tentativas_contato || 0) + 1,
      });

      alert("✅ Tentativa registrada!");
    }

    // Reset form
    setModoRegistro(false);
    setFechouPacote(null);
    setFormData({
      data_conversao: format(new Date(), "yyyy-MM-dd"),
      recepcao_vendeu: "",
      pacote_fechado: "",
      valor_original: "",
      desconto: "",
      valor_final: "",
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

  // Calcular valor final automaticamente
  useEffect(() => {
    if (formData.valor_original && formData.desconto) {
      const original = parseFloat(formData.valor_original);
      const desc = parseFloat(formData.desconto);
      const final = original - (original * desc / 100);
      setFormData(prev => ({ ...prev, valor_final: final.toFixed(2) }));
    }
  }, [formData.valor_original, formData.desconto]);

  // Filtrar tentativas de conversão registradas
  const tentativasConversao = interacoes.filter(i => 
    i.tipo === "conversao_fechamento" || i.tipo === "tentativa_contato"
  );

  const motivosFechamento = [
    "Cliente verificou avaliação e não julgou",
    "Sentiu-se bem acolhida e não julgada",
    "Verificou vídeos e resultados",
    "Necessidade de tratamento contínuo",
    "Recomendação de terceiros",
    "O valor estava bom conforme o número de sessões",
    "Primeiro a considerar antes de optar de voltar a linha cirúrgica",
    "Parcelamento e condição de negociação",
    "Proximidade com a residência",
    "O valor foi projetado e curto prazo de tempo",
    "Termos que definirá renovação conforme os 3 meses",
    "Cliente tinha vídeos pré-gravados e terá mais agilidade",
    "Anestesiados e excitados",
    "O chefe só precisaria o cartão de crédito depois se forem os 3 meses necessários",
    "Mudou o foco de tempo livre pra renovar mensalmente",
    "Escalou a reunião para ter um parceiro sem cirurgia",
    "Ambiente acolhedor",
    "Avaliação de qualidade na reunião de trabalho",
    "Termos que farão agendas e terras próximas sem circulação avançada",
    "Conforme no trabalho e o cliente confirmou disponível",
    "Ajudar a melhorar o resultado",
    "O desafio",
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

  return (
    <div className="space-y-4">
      {/* Status de conversão se já fechou */}
      {lead.convertido && (
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-green-900">Pacote Fechado com Sucesso!</h3>
              <p className="text-sm text-green-700">
                O cliente converteu para: {lead.motivo_fechamento}. {lead.valor_negociado && `Valor final: R$ ${lead.valor_negociado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              </p>
              {lead.data_conversao && (lead.data_primeiro_contato || lead.created_date) && (
                <p className="text-sm text-green-700 mt-1 font-semibold">
                  ⏱️ Tempo de conversão: {Math.ceil((new Date(lead.data_conversao) - new Date(lead.data_primeiro_contato || lead.created_date)) / (1000 * 60 * 60 * 24))} dias
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Histórico de tentativas */}
      {tentativasConversao.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-lg">📋</span> Conversão de Pacote
          </h3>
          {tentativasConversao.map((tentativa) => (
            <div 
              key={tentativa.id}
              className={`${
                tentativa.tipo === "conversao_fechamento" 
                  ? "bg-green-50 border-l-4 border-green-500" 
                  : "bg-orange-50 border-l-4 border-orange-500"
              } rounded-lg p-4`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-10 h-10 ${
                    tentativa.tipo === "conversao_fechamento" ? "bg-green-500" : "bg-orange-500"
                  } rounded-full flex items-center justify-center shrink-0`}>
                    {tentativa.tipo === "conversao_fechamento" ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : (
                      <span className="text-white font-bold">C</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900">
                      {tentativa.tipo === "conversao_fechamento" ? "Pacote Fechado com Sucesso!" : "Tentativa de Conversão Registrada"}
                    </h4>
                    <p className="text-sm text-gray-700 mt-1 break-words">{tentativa.descricao}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(tentativa.data_interacao), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="shrink-0">
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botão para nova tentativa */}
      {!modoRegistro && !lead.convertido && (
        <Button 
          onClick={() => setModoRegistro(true)}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Registrar Nova Tentativa
        </Button>
      )}

      {/* Formulário de registro */}
      {modoRegistro && !lead.convertido && (
        <div className="border-2 border-gray-200 rounded-lg p-6 bg-gray-50 space-y-6">
          <h3 className="font-bold text-lg text-gray-900">Registrar Tentativa de Conversão</h3>

          {/* Pergunta inicial */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">O cliente fechou um pacote?</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={fechouPacote === true ? "default" : "outline"}
                onClick={() => setFechouPacote(true)}
                className={fechouPacote === true ? "bg-green-600 hover:bg-green-700" : ""}
              >
                Sim, fechou pacote
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

          {/* Formulário quando fechou */}
          {fechouPacote === true && (
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-semibold text-gray-900">Dados do Pacote Fechado</h4>
              
              <div>
                <Label>Data da Conversão *</Label>
                <Input
                  type="date"
                  value={formData.data_conversao}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_conversao: e.target.value }))}
                />
              </div>

              {recepcionistasDaUnidade.length > 0 && (
                <div>
                  <Label>Recepção que Vendeu</Label>
                  <Select value={formData.recepcao_vendeu} onValueChange={(value) => setFormData(prev => ({ ...prev, recepcao_vendeu: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a recepcionista..." />
                    </SelectTrigger>
                    <SelectContent>
                      {recepcionistasDaUnidade.map(r => (
                        <SelectItem key={r.id} value={r.nome}>{r.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Plano Terapêutico Fechado *</Label>
                <Select value={formData.pacote_fechado} onValueChange={(value) => setFormData(prev => ({ ...prev, pacote_fechado: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o pacote..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plano_24_sessoes">Plano 24 Sessões (Caribe)</SelectItem>
                    <SelectItem value="plano_12_sessoes">Plano 12 Sessões</SelectItem>
                    <SelectItem value="plano_6_sessoes">Plano 6 Sessões</SelectItem>
                    <SelectItem value="sessao_avulsa">Sessão Avulsa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Valor Original</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor_original}
                    onChange={(e) => setFormData(prev => ({ ...prev, valor_original: e.target.value }))}
                    placeholder="0"
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
                    placeholder="0"
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

              <div>
                <Label className="mb-2 block">Por que o cliente decidiu fechar o pacote? *</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto bg-white rounded-lg border p-3">
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

              <div>
                <Label>Observações Adicionais</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Detalhes sobre a conversão, condições especiais, etc..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Formulário quando não fechou */}
          {fechouPacote === false && (
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-semibold text-gray-900">Motivo de Não Conversão</h4>
              
              <div>
                <Label className="mb-2 block">Por que o cliente decidiu não fechar o pacote? *</Label>
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
                  placeholder="Detalhes sobre o encontro, condições informadas, etc..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Botões de ação */}
          {fechouPacote !== null && (
            <div className="flex gap-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setModoRegistro(false);
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