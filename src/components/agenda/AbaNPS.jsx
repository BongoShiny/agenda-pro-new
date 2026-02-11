import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link2, Copy, Check, Maximize2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function AbaNPS({ agendamento }) {
  const [copiado, setCopiado] = useState(false);
  const [mostraFormulario, setMostraFormulario] = useState(false);

  const { data: respostaNPS } = useQuery({
    queryKey: ['resposta-nps', agendamento.id],
    queryFn: async () => {
      const respostas = await base44.entities.RespostaNPS.filter({ agendamento_id: agendamento.id });
      return respostas.length > 0 ? respostas[0] : null;
    },
  });

  // Gerar link único do NPS usando o ID do agendamento
  const linkNPS = `${window.location.origin}/FormularioNPS?id=${agendamento.id}`;

  const copiarLink = () => {
    navigator.clipboard.writeText(linkNPS);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };



  return (
    <div className="space-y-4">
      {/* Link do NPS */}
      <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Link2 className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Link do Formulário NPS</h3>
            <p className="text-sm text-gray-600 mb-3">
              Compartilhe este link com o cliente para coletar feedback sobre o atendimento
            </p>
            <div className="bg-white rounded-lg p-3 border border-gray-200 mb-3">
              <p className="text-xs text-gray-700 font-mono break-all">{linkNPS}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={copiarLink}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {copiado ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar Link
                  </>
                )}
              </Button>
              <Button
                onClick={() => setMostraFormulario(true)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Link2 className="w-4 h-4" />
                Abrir Formulário
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Resposta do NPS */}
      {respostaNPS ? (
        <Card className="p-4 border-green-200 bg-green-50">
          <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
            <Check className="w-5 h-5" />
            NPS Respondido em {new Date(respostaNPS.created_date).toLocaleDateString('pt-BR')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded p-3 border border-green-200">
              <p className="text-xs text-gray-600 mb-1">Nota para o Terapeuta</p>
              <p className="text-2xl font-bold text-green-700">{respostaNPS.nota_terapeuta}/10</p>
            </div>
            <div className="bg-white rounded p-3 border border-green-200">
              <p className="text-xs text-gray-600 mb-1">Recomendaria?</p>
              <p className="text-2xl font-bold text-green-700">{respostaNPS.nota_recomendacao}/10</p>
            </div>
            <div className="bg-white rounded p-3 border border-green-200">
              <p className="text-xs text-gray-600 mb-1">Atenção do Terapeuta</p>
              <p className="text-base font-semibold text-gray-900">{respostaNPS.avaliacao_atencao_terapeuta}</p>
            </div>
            <div className="bg-white rounded p-3 border border-green-200">
              <p className="text-xs text-gray-600 mb-1">Avaliação da Sessão</p>
              <p className="text-base font-semibold text-gray-900">{respostaNPS.avaliacao_sessao}</p>
            </div>
            <div className="bg-white rounded p-3 border border-green-200">
              <p className="text-xs text-gray-600 mb-1">Clareza das Informações</p>
              <p className="text-base font-semibold text-gray-900">{respostaNPS.clareza_informacoes}</p>
            </div>
            <div className="bg-white rounded p-3 border border-green-200">
              <p className="text-xs text-gray-600 mb-1">Experiência Agendamento</p>
              <p className="text-base font-semibold text-gray-900">{respostaNPS.experiencia_agendamento}</p>
            </div>
            <div className="bg-white rounded p-3 border border-green-200">
              <p className="text-xs text-gray-600 mb-1">Recepção na Clínica</p>
              <p className="text-base font-semibold text-gray-900">{respostaNPS.recepcao_clinica}</p>
            </div>
          </div>
          {respostaNPS.o_que_mais_gostou && (
            <div className="bg-white rounded p-3 border border-green-200 mt-4">
              <p className="text-xs text-gray-600 mb-1">O que mais gostou</p>
              <p className="text-sm text-gray-900">{respostaNPS.o_que_mais_gostou}</p>
            </div>
          )}
          {respostaNPS.o_que_melhorar && (
            <div className="bg-white rounded p-3 border border-green-200 mt-4">
              <p className="text-xs text-gray-600 mb-1">O que podemos melhorar</p>
              <p className="text-sm text-gray-900">{respostaNPS.o_que_melhorar}</p>
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-6 text-center border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Link2 className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 text-sm">
            O cliente ainda não respondeu o formulário NPS
          </p>
        </Card>
      )}

      {/* Modal do Formulário */}
      {mostraFormulario && (
        <div className="fixed inset-0 bg-black z-[9999] overflow-hidden" style={{top: 0, left: 0, right: 0, bottom: 0}}>
          <div className="bg-white w-screen h-screen flex flex-col">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Formulário NPS</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => window.open(linkNPS, '_blank')}
                  className="text-gray-500 hover:text-gray-700 p-1"
                  title="Abrir em tela cheia"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setMostraFormulario(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            <iframe
              src={linkNPS}
              className="w-full flex-1"
              frameBorder="0"
              title="Formulário NPS"
            />
          </div>
        </div>
      )}
    </div>
  );
}