import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function FormularioNPSPage() {
  const [enviado, setEnviado] = useState(false);

  // Pegar ID do agendamento da URL
  const urlParams = new URLSearchParams(window.location.search);
  const agendamentoId = urlParams.get('id');

  const { data: agendamento, isLoading } = useQuery({
    queryKey: ['agendamento-nps', agendamentoId],
    queryFn: async () => {
      if (!agendamentoId) return null;
      const response = await base44.functions.invoke('npsPublico', {
        action: 'get_agendamento',
        agendamento_id: agendamentoId
      });
      return response.data;
    },
    enabled: !!agendamentoId,
  });

  const { data: respostaExistente } = useQuery({
    queryKey: ['resposta-existente', agendamentoId],
    queryFn: async () => {
      if (!agendamentoId) return null;
      const response = await base44.functions.invoke('npsPublico', {
        action: 'check_resposta',
        agendamento_id: agendamentoId
      });
      return response.data;
    },
    enabled: !!agendamentoId,
  });

  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    unidade_nome: "",
    profissional_nome: "",
    nota_terapeuta: null,
    nota_recomendacao: null,
    avaliacao_atencao_terapeuta: "",
    avaliacao_sessao: "",
    clareza_informacoes: "",
    experiencia_agendamento: "",
    recepcao_clinica: "",
    o_que_mais_gostou: "",
    o_que_melhorar: ""
  });

  React.useEffect(() => {
    if (agendamento) {
      setFormData(prev => ({
        ...prev,
        nome: agendamento.cliente_nome || "",
        telefone: agendamento.cliente_telefone || "",
        unidade_nome: agendamento.unidade_nome || "",
        profissional_nome: agendamento.profissional_nome || ""
      }));
    }
  }, [agendamento]);

  const salvarNPSMutation = useMutation({
    mutationFn: async (dados) => {
      const response = await base44.functions.invoke('npsPublico', {
        action: 'salvar_resposta',
        ...dados
      });
      return response.data;
    },
    onSuccess: () => {
      setEnviado(true);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!agendamento) return;

    salvarNPSMutation.mutate({
      agendamento_id: agendamento.id,
      cliente_id: agendamento.cliente_id,
      cliente_nome: formData.nome,
      cliente_telefone: formData.telefone,
      unidade_nome: formData.unidade_nome,
      profissional_nome: formData.profissional_nome,
      data_atendimento: agendamento.data,
      nota_terapeuta: formData.nota_terapeuta,
      nota_recomendacao: formData.nota_recomendacao,
      avaliacao_atencao_terapeuta: formData.avaliacao_atencao_terapeuta,
      avaliacao_sessao: formData.avaliacao_sessao,
      clareza_informacoes: formData.clareza_informacoes,
      experiencia_agendamento: formData.experiencia_agendamento,
      recepcao_clinica: formData.recepcao_clinica,
      o_que_mais_gostou: formData.o_que_mais_gostou,
      o_que_melhorar: formData.o_que_melhorar
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-amber-800 to-amber-900 flex items-center justify-center">
        <p className="text-white text-lg">Carregando...</p>
      </div>
    );
  }

  if (!agendamento) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-amber-800 to-amber-900 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-700">Link inválido ou agendamento não encontrado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (respostaExistente) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-amber-800 to-amber-900 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Já Respondido</h2>
            <p className="text-gray-600">Você já respondeu este formulário anteriormente. Obrigado!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-amber-800 to-amber-900 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Obrigado!</h2>
            <p className="text-gray-600">Sua avaliação foi enviada com sucesso. Valorizamos muito seu feedback!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-amber-900 via-amber-800 to-amber-900 py-8 sm:py-12 px-4 overflow-x-hidden">
      <div className="max-w-2xl mx-auto w-full">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="bg-white rounded-lg p-4 sm:p-6 inline-block">
            <h1 className="text-2xl sm:text-3xl font-bold text-amber-900">Vibe Terapias</h1>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl sm:text-2xl font-bold text-amber-900 mb-6 text-center">
              Formulário de NPS - Vibe Terapias
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
               {/* 1. Nome */}
               <div className="space-y-2">
                 <Label className="text-sm sm:text-base">
                  * 1. Qual seu nome e sobrenome?
                </Label>
                <Input
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Digite seu nome completo"
                />
              </div>

              {/* 2. Telefone */}
              <div className="space-y-2">
                <Label className="text-sm sm:text-base">
                  * 2. Qual seu telefone?
                </Label>
                <Input
                  required
                  type="tel"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="+55 11 99999-9999"
                />
              </div>

              {/* 3. Clínica */}
              <div className="space-y-2">
                <Label className="text-base">
                  * 3. Em qual clínica você foi atendido?
                </Label>
                <Input
                  required
                  disabled
                  value={formData.unidade_nome}
                  className="bg-gray-50"
                />
              </div>

              {/* 4. Terapeuta */}
              <div className="space-y-2">
                <Label className="text-base">
                  * 4. Qual terapeuta te atendeu?
                </Label>
                <Input
                  required
                  disabled
                  value={formData.profissional_nome}
                  className="bg-gray-50"
                />
              </div>

              {/* 5. Nota para o terapeuta */}
              <div className="space-y-2">
                <Label className="text-base">
                  5. Que nota você daria para o terapeuta que te atendeu?
                </Label>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 sm:gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(nota => (
                    <button
                      key={nota}
                      type="button"
                      onClick={() => setFormData({ ...formData, nota_terapeuta: nota })}
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 text-sm sm:text-base transition-all ${
                        formData.nota_terapeuta === nota
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400'
                      }`}
                    >
                      {nota}
                    </button>
                  ))}
                </div>
              </div>

              {/* 6. NPS - Recomendação */}
              <div className="space-y-2">
                <Label className="text-base">
                  6. Qual é a probabilidade de você recomendar Vibe Terapias a um amigo ou colega?
                </Label>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <div className="flex justify-between text-xs text-gray-600 mb-2">
                    <span>0</span>
                    <span>10</span>
                  </div>
                  <div className="grid grid-cols-11 gap-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(nota => (
                      <button
                        key={nota}
                        type="button"
                        onClick={() => setFormData({ ...formData, nota_recomendacao: nota })}
                        className={`h-8 sm:h-10 text-xs sm:text-base rounded border-2 transition-all ${
                          formData.nota_recomendacao === nota
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400'
                        }`}
                      >
                        {nota}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 7. Atenção do terapeuta */}
              <div className="space-y-2">
                <Label className="text-base">
                  7. Como você avalia a atenção e cuidado do terapeuta durante a sessão?
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["Ruim", "Regular", "Boa", "Excelente"].map(opcao => (
                    <button
                      key={opcao}
                      type="button"
                      onClick={() => setFormData({ ...formData, avaliacao_atencao_terapeuta: opcao })}
                      className={`p-2 sm:p-3 text-sm sm:text-base rounded-lg border-2 transition-all ${
                        formData.avaliacao_atencao_terapeuta === opcao
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400'
                      }`}
                    >
                      {opcao}
                    </button>
                  ))}
                </div>
              </div>

              {/* 8. Sessão realizada */}
              <div className="space-y-2">
                <Label className="text-base">
                  8. Como você avalia a sessão realizada?
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["Ruim", "Regular", "Boa", "Excelente"].map(opcao => (
                    <button
                      key={opcao}
                      type="button"
                      onClick={() => setFormData({ ...formData, avaliacao_sessao: opcao })}
                      className={`p-2 sm:p-3 text-sm sm:text-base rounded-lg border-2 transition-all ${
                        formData.avaliacao_sessao === opcao
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400'
                      }`}
                    >
                      {opcao}
                    </button>
                  ))}
                </div>
              </div>

              {/* 9. Clareza informações */}
              <div className="space-y-2">
                <Label className="text-base">
                  9. Como você avalia a clareza das informações recebidas antes da sua primeira sessão?
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["Ótima", "Boa", "Regular", "Ruim"].map(opcao => (
                    <button
                      key={opcao}
                      type="button"
                      onClick={() => setFormData({ ...formData, clareza_informacoes: opcao })}
                      className={`p-2 sm:p-3 text-sm sm:text-base rounded-lg border-2 transition-all ${
                        formData.clareza_informacoes === opcao
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400'
                      }`}
                    >
                      {opcao}
                    </button>
                  ))}
                </div>
              </div>

              {/* 10. Experiência agendamento */}
              <div className="space-y-2">
                <Label className="text-base">
                  10. Como foi sua experiência no agendamento da sessão?
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["Ótima", "Boa", "Regular", "Ruim"].map(opcao => (
                    <button
                      key={opcao}
                      type="button"
                      onClick={() => setFormData({ ...formData, experiencia_agendamento: opcao })}
                      className={`p-2 sm:p-3 text-sm sm:text-base rounded-lg border-2 transition-all ${
                        formData.experiencia_agendamento === opcao
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400'
                      }`}
                    >
                      {opcao}
                    </button>
                  ))}
                </div>
              </div>

              {/* 12. Recepção */}
              <div className="space-y-2">
                <Label className="text-base">
                  12. Você se sentiu bem recebido(a) ao chegar na clínica?
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["Insatisfatório", "Regular", "Satisfatório", "Excelente"].map(opcao => (
                    <button
                      key={opcao}
                      type="button"
                      onClick={() => setFormData({ ...formData, recepcao_clinica: opcao })}
                      className={`p-2 sm:p-3 text-sm sm:text-base rounded-lg border-2 transition-all ${
                        formData.recepcao_clinica === opcao
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400'
                      }`}
                    >
                      {opcao}
                    </button>
                  ))}
                </div>
              </div>

              {/* 13. O que mais gostou */}
              <div className="space-y-2">
                <Label className="text-base">
                  13. O que mais gostou na sua experiência?
                </Label>
                <Textarea
                  value={formData.o_que_mais_gostou}
                  onChange={(e) => setFormData({ ...formData, o_que_mais_gostou: e.target.value })}
                  placeholder="Compartilhe conosco..."
                  rows={4}
                />
              </div>

              {/* 14. O que melhorar */}
              <div className="space-y-2">
                <Label className="text-base">
                  14. O que podemos melhorar no atendimento ou na experiência com a Vibe Terapias?
                </Label>
                <Textarea
                  value={formData.o_que_melhorar}
                  onChange={(e) => setFormData({ ...formData, o_que_melhorar: e.target.value })}
                  placeholder="Suas sugestões são muito importantes..."
                  rows={4}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-amber-800 hover:bg-amber-900 text-white text-lg py-6"
                disabled={salvarNPSMutation.isPending}
              >
                {salvarNPSMutation.isPending ? "Enviando..." : "Concluído"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}