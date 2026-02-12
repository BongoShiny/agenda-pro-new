import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ArrowLeft } from "lucide-react";

export default function FormularioNPSFullscreen({ agendamento, onVoltar }) {
  const [enviado, setEnviado] = useState(false);
  const queryClient = useQueryClient();

  const { data: respostaExistente } = useQuery({
    queryKey: ['resposta-nps-fullscreen', agendamento?.id],
    queryFn: async () => {
      if (!agendamento?.id) return null;
      const respostas = await base44.entities.RespostaNPS.filter({ agendamento_id: agendamento.id });
      return respostas.length > 0 ? respostas[0] : null;
    },
    enabled: !!agendamento?.id,
  });

  const [formData, setFormData] = useState({
    nome: agendamento?.cliente_nome || "",
    telefone: agendamento?.cliente_telefone || "",
    unidade_nome: agendamento?.unidade_nome || "",
    profissional_nome: agendamento?.profissional_nome || "",
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

  const salvarNPSMutation = useMutation({
    mutationFn: async (dados) => {
      const resposta = await base44.entities.RespostaNPS.create({
        agendamento_id: agendamento.id,
        cliente_id: agendamento.cliente_id,
        cliente_nome: dados.nome,
        cliente_telefone: dados.telefone,
        unidade_nome: dados.unidade_nome,
        profissional_nome: dados.profissional_nome,
        data_atendimento: agendamento.data,
        nota_terapeuta: dados.nota_terapeuta,
        nota_recomendacao: dados.nota_recomendacao,
        avaliacao_atencao_terapeuta: dados.avaliacao_atencao_terapeuta,
        avaliacao_sessao: dados.avaliacao_sessao,
        clareza_informacoes: dados.clareza_informacoes,
        experiencia_agendamento: dados.experiencia_agendamento,
        recepcao_clinica: dados.recepcao_clinica,
        o_que_mais_gostou: dados.o_que_mais_gostou,
        o_que_melhorar: dados.o_que_melhorar
      });
      return resposta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resposta-nps', agendamento.id] });
      queryClient.invalidateQueries({ queryKey: ['resposta-nps-fullscreen', agendamento.id] });
      setEnviado(true);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    salvarNPSMutation.mutate(formData);
  };

  if (respostaExistente) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-amber-900 via-amber-800 to-amber-900 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Já Respondido</h2>
            <p className="text-gray-600 mb-6">Este agendamento já possui resposta NPS.</p>
            <Button onClick={onVoltar} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-amber-900 via-amber-800 to-amber-900 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">NPS Enviado com Sucesso!</h2>
            <p className="text-gray-600 mb-6">Sua avaliação foi registrada. Muito obrigado!</p>
            <Button onClick={onVoltar} className="w-full bg-amber-800 hover:bg-amber-900">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Detalhes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-amber-900 via-amber-800 to-amber-900 overflow-y-auto">
      {/* Header fixo */}
      <div className="sticky top-0 z-10 bg-amber-900/95 backdrop-blur-sm border-b border-amber-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button 
            onClick={onVoltar} 
            variant="ghost" 
            className="text-white hover:bg-amber-800"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar
          </Button>
          <h1 className="text-lg font-bold text-white">Formulário NPS</h1>
          <div className="w-20"></div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="w-full h-full px-0 py-0">
        <div className="text-center mb-6 pt-6">
          <div className="bg-white rounded-lg p-4 inline-block">
            <h2 className="text-2xl font-bold text-amber-900">Vibe Terapias</h2>
          </div>
        </div>

        <Card className="border-0 rounded-none shadow-none bg-transparent">
          <CardContent className="pt-6 px-6 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-amber-900 mb-6 text-center">
              Formulário de NPS - Vibe Terapias
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Nome */}
              <div className="space-y-2">
                <Label>* 1. Qual seu nome e sobrenome?</Label>
                <Input
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Digite seu nome completo"
                />
              </div>

              {/* 2. Telefone */}
              <div className="space-y-2">
                <Label>* 2. Qual seu telefone?</Label>
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
                <Label>* 3. Em qual clínica você foi atendido?</Label>
                <Input
                  required
                  disabled
                  value={formData.unidade_nome}
                  className="bg-gray-50"
                />
              </div>

              {/* 4. Terapeuta */}
              <div className="space-y-2">
                <Label>* 4. Qual terapeuta te atendeu?</Label>
                <Input
                  required
                  disabled
                  value={formData.profissional_nome}
                  className="bg-gray-50"
                />
              </div>

              {/* 5. Nota para o terapeuta */}
              <div className="space-y-2">
                <Label>5. Que nota você daria para o terapeuta que te atendeu?</Label>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(nota => (
                    <button
                      key={nota}
                      type="button"
                      onClick={() => setFormData({ ...formData, nota_terapeuta: nota })}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
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
                <Label>6. Qual é a probabilidade de você recomendar Vibe Terapias a um amigo ou colega?</Label>
                <div className="bg-gray-50 p-4 rounded-lg">
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
                        className={`h-10 rounded border-2 transition-all ${
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
                <Label>7. Como você avalia a atenção e cuidado do terapeuta durante a sessão?</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["Ruim", "Regular", "Boa", "Excelente"].map(opcao => (
                    <button
                      key={opcao}
                      type="button"
                      onClick={() => setFormData({ ...formData, avaliacao_atencao_terapeuta: opcao })}
                      className={`p-3 rounded-lg border-2 transition-all ${
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
                <Label>8. Como você avalia a sessão realizada?</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["Ruim", "Regular", "Boa", "Excelente"].map(opcao => (
                    <button
                      key={opcao}
                      type="button"
                      onClick={() => setFormData({ ...formData, avaliacao_sessao: opcao })}
                      className={`p-3 rounded-lg border-2 transition-all ${
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
                <Label>9. Como você avalia a clareza das informações recebidas antes da sua primeira sessão?</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["Ótima", "Boa", "Regular", "Ruim"].map(opcao => (
                    <button
                      key={opcao}
                      type="button"
                      onClick={() => setFormData({ ...formData, clareza_informacoes: opcao })}
                      className={`p-3 rounded-lg border-2 transition-all ${
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
                <Label>10. Como foi sua experiência no agendamento da sessão?</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["Ótima", "Boa", "Regular", "Ruim"].map(opcao => (
                    <button
                      key={opcao}
                      type="button"
                      onClick={() => setFormData({ ...formData, experiencia_agendamento: opcao })}
                      className={`p-3 rounded-lg border-2 transition-all ${
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
                <Label>12. Você se sentiu bem recebido(a) ao chegar na clínica?</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["Insatisfatório", "Regular", "Satisfatório", "Excelente"].map(opcao => (
                    <button
                      key={opcao}
                      type="button"
                      onClick={() => setFormData({ ...formData, recepcao_clinica: opcao })}
                      className={`p-3 rounded-lg border-2 transition-all ${
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
                <Label>13. O que mais gostou na sua experiência?</Label>
                <Textarea
                  value={formData.o_que_mais_gostou}
                  onChange={(e) => setFormData({ ...formData, o_que_mais_gostou: e.target.value })}
                  placeholder="Compartilhe conosco..."
                  rows={4}
                />
              </div>

              {/* 14. O que melhorar */}
              <div className="space-y-2">
                <Label>14. O que podemos melhorar no atendimento ou na experiência com a Vibe Terapias?</Label>
                <Textarea
                  value={formData.o_que_melhorar}
                  onChange={(e) => setFormData({ ...formData, o_que_melhorar: e.target.value })}
                  placeholder="Suas sugestões são muito importantes..."
                  rows={4}
                />
              </div>

              {/* Botão Submit fixo na parte inferior */}
              <div className="sticky bottom-0 bg-white pt-4 pb-2 -mx-6 px-6 border-t">
                <Button
                  type="submit"
                  className="w-full bg-amber-800 hover:bg-amber-900 text-white text-lg py-6"
                  disabled={salvarNPSMutation.isPending}
                >
                  {salvarNPSMutation.isPending ? "Enviando..." : "Enviar NPS"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}