import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Download, Save, Edit } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const criarDataPura = (dataString) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

export default function AbaProntuario({ agendamento, usuarioAtual }) {
  const [prontuario, setProntuario] = useState({
    terapia_feita: "",
    musculo_liberado: "",
    sugestoes_proxima_sessao: "",
    observacoes: "",
    relato_terapeuta: "",
    sessao_plano_terapeutico: ""
  });
  const [modoEdicao, setModoEdicao] = useState(false);

  const queryClient = useQueryClient();

  // Buscar prontuário existente
  const { data: prontuarioExistente, isLoading } = useQuery({
    queryKey: ['prontuario', agendamento.id],
    queryFn: async () => {
      const prontuarios = await base44.entities.Prontuario.filter({
        agendamento_id: agendamento.id
      });
      return prontuarios[0] || null;
    },
    enabled: !!agendamento?.id
  });

  // Atualizar estado quando prontuario existente mudar
  React.useEffect(() => {
    if (prontuarioExistente) {
      setProntuario({
        terapia_feita: prontuarioExistente.terapia_feita || "",
        musculo_liberado: prontuarioExistente.musculo_liberado || "",
        sugestoes_proxima_sessao: prontuarioExistente.sugestoes_proxima_sessao || "",
        observacoes: prontuarioExistente.observacoes || "",
        relato_terapeuta: prontuarioExistente.relato_terapeuta || "",
        sessao_plano_terapeutico: prontuarioExistente.sessao_plano_terapeutico || ""
      });
      setModoEdicao(false);
    }
  }, [prontuarioExistente]);

  const salvarProntuarioMutation = useMutation({
    mutationFn: async (dados) => {
      let resultado;
      
      if (prontuarioExistente) {
        resultado = await base44.entities.Prontuario.update(prontuarioExistente.id, dados);
        
        // Registrar edição no log
        await base44.entities.LogAcao.create({
          tipo: "editou_prontuario",
          usuario_email: usuarioAtual?.email || "sistema",
          descricao: `Editou prontuário de: ${agendamento.cliente_nome} - ${agendamento.data} às ${agendamento.hora_inicio}`,
          entidade_tipo: "Prontuario",
          entidade_id: prontuarioExistente.id,
          dados_antigos: JSON.stringify(prontuarioExistente),
          dados_novos: JSON.stringify(resultado)
        });
      } else {
        resultado = await base44.entities.Prontuario.create({
          ...dados,
          agendamento_id: agendamento.id,
          cliente_id: agendamento.cliente_id,
          cliente_nome: agendamento.cliente_nome,
          cliente_telefone: agendamento.cliente_telefone,
          profissional_nome: agendamento.profissional_nome,
          unidade_nome: agendamento.unidade_nome,
          data_sessao: agendamento.data,
          criado_por: usuarioAtual?.email
        });
        
        // Registrar criação no log
        await base44.entities.LogAcao.create({
          tipo: "salvou_prontuario",
          usuario_email: usuarioAtual?.email || "sistema",
          descricao: `Salvou novo prontuário para: ${agendamento.cliente_nome} - ${agendamento.data} às ${agendamento.hora_inicio}`,
          entidade_tipo: "Prontuario",
          entidade_id: resultado.id,
          dados_novos: JSON.stringify(resultado)
        });
      }
      
      // Atualizar status do agendamento para "concluido"
      await base44.entities.Agendamento.update(agendamento.id, {
        status: "concluido"
      });
      
      // Registrar mudança de status
      await base44.entities.LogAcao.create({
        tipo: "editou_agendamento",
        usuario_email: usuarioAtual?.email || "sistema",
        descricao: `Marcou como concluído (prontuário preenchido): ${agendamento.cliente_nome} - ${agendamento.data} às ${agendamento.hora_inicio}`,
        entidade_tipo: "Agendamento",
        entidade_id: agendamento.id,
        dados_antigos: JSON.stringify({ status: agendamento.status }),
        dados_novos: JSON.stringify({ status: "concluido" })
      });
      
      return resultado;
    },
    onSuccess: async () => {
      // Invalidar e refetch imediato
      await queryClient.invalidateQueries({ queryKey: ['prontuario', agendamento.id] });
      await queryClient.refetchQueries({ queryKey: ['prontuario', agendamento.id] });
      await queryClient.invalidateQueries({ queryKey: ['prontuarios'] });
      await queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      await queryClient.invalidateQueries({ queryKey: ['logs-acoes'] });
      
      setModoEdicao(false);
      alert("✅ Prontuário salvo com sucesso! Agendamento marcado como concluído.");
    }
  });

  const handleSalvar = () => {
    salvarProntuarioMutation.mutate(prontuario);
  };

  const handleEditar = () => {
    setModoEdicao(true);
  };

  const podeEditar = !prontuarioExistente || modoEdicao;

  const handleExportar = () => {
    const dataFormatada = format(criarDataPura(agendamento.data), "dd/MM/yyyy", { locale: ptBR });
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Prontuário - ${agendamento.cliente_nome}</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            body { 
              font-family: Arial, sans-serif; 
              padding: 10px; 
              background: #fff;
              margin: 0;
            }
            .container {
              max-width: 100%;
              margin: 0 auto;
              border: 4px solid #7C5746;
              padding: 15px;
              background: white;
            }
            .header {
              text-align: center;
              margin-bottom: 12px;
              padding: 15px 10px 10px 10px;
              background: #7C5746;
              border-radius: 4px 4px 0 0;
            }
            .logo {
              width: 80px;
              height: auto;
              margin-bottom: 8px;
            }
            .title {
              color: #fff;
              font-size: 16px;
              font-weight: bold;
              margin: 5px 0;
            }
            .subtitle {
              color: #f9f5f3;
              font-size: 10px;
              font-style: italic;
            }
            .info-section {
              background: #f9f5f3;
              padding: 10px;
              border-radius: 4px;
              margin-bottom: 12px;
              border-left: 3px solid #7C5746;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 5px;
            }
            .info-row {
              display: flex;
              font-size: 9px;
            }
            .info-label {
              font-weight: bold;
              color: #7C5746;
              min-width: 70px;
            }
            .info-value {
              color: #333;
            }
            .field-section {
              margin-bottom: 10px;
              padding-bottom: 8px;
              border-bottom: 1px solid #e0d5d0;
            }
            .field-label {
              font-weight: bold;
              color: #7C5746;
              font-size: 10px;
              margin-bottom: 4px;
              display: block;
            }
            .field-value {
              color: #333;
              line-height: 1.3;
              white-space: pre-wrap;
              padding: 5px;
              background: #f9f5f3;
              border-radius: 3px;
              min-height: 25px;
              font-size: 9px;
            }
            .footer {
              margin-top: 12px;
              padding-top: 8px;
              border-top: 2px solid #7C5746;
              text-align: center;
              color: #7C5746;
              font-size: 8px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f9217a0dea005bde3c1cc0/e271e046f_image.png" alt="Logo Vibi Terapias" class="logo" />
              <div class="title">FICHA DE PRONTUÁRIO</div>
              <div class="subtitle">Clínica especializada em Dor</div>
            </div>

            <div class="info-section">
              <div class="info-row">
                <span class="info-label">Paciente:</span>
                <span class="info-value">${agendamento.cliente_nome}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Telefone:</span>
                <span class="info-value">${agendamento.cliente_telefone || "-"}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Profissional:</span>
                <span class="info-value">${agendamento.profissional_nome}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Unidade:</span>
                <span class="info-value">${agendamento.unidade_nome}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Data da Sessão:</span>
                <span class="info-value">${dataFormatada}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Horário:</span>
                <span class="info-value">${agendamento.hora_inicio} - ${agendamento.hora_fim}</span>
              </div>
            </div>

            <div class="field-section">
              <span class="field-label">TERAPIA FEITA:</span>
              <div class="field-value">${prontuario.terapia_feita || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">MÚSCULO LIBERADO:</span>
              <div class="field-value">${prontuario.musculo_liberado || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">SUGESTÕES PARA PRÓXIMA SESSÃO:</span>
              <div class="field-value">${prontuario.sugestoes_proxima_sessao || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">OBSERVAÇÕES:</span>
              <div class="field-value">${prontuario.observacoes || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">RELATO DO TERAPEUTA SOBRE A SESSÃO:</span>
              <div class="field-value">${prontuario.relato_terapeuta || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">QUAL A SESSÃO DO PLANO TERAPÊUTICO:</span>
              <div class="field-value">${prontuario.sessao_plano_terapeutico || "-"}</div>
            </div>

            <div class="footer">
              <p><strong>Vibi Terapias</strong> - Clínica especializada em Dor</p>
              <p>Prontuário gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            </div>
          </div>

          <button class="no-print" onclick="window.print()" style="
            position: fixed;
            bottom: 30px;
            right: 30px;
            padding: 15px 30px;
            background: #7C5746;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
          ">
            🖨️ Imprimir / Salvar como PDF
          </button>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 py-4 flex items-center justify-center">
        <p className="text-gray-500">Carregando prontuário...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-900">Ficha de Prontuário</h3>
        </div>
        {prontuarioExistente && !modoEdicao && (
          <Button onClick={handleExportar} variant="outline" className="border-amber-600 text-amber-700 hover:bg-amber-50">
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        )}
      </div>

      {prontuarioExistente && !modoEdicao ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800 font-medium">✅ Prontuário já preenchido para este agendamento</p>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Label className="text-sm font-semibold text-gray-700">TERAPIA FEITA:</Label>
              <p className="mt-2 text-gray-800 whitespace-pre-wrap">{prontuario.terapia_feita || "-"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Label className="text-sm font-semibold text-gray-700">MÚSCULO LIBERADO:</Label>
              <p className="mt-2 text-gray-800 whitespace-pre-wrap">{prontuario.musculo_liberado || "-"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Label className="text-sm font-semibold text-gray-700">SUGESTÕES PARA PRÓXIMA SESSÃO:</Label>
              <p className="mt-2 text-gray-800 whitespace-pre-wrap">{prontuario.sugestoes_proxima_sessao || "-"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Label className="text-sm font-semibold text-gray-700">OBSERVAÇÕES:</Label>
              <p className="mt-2 text-gray-800 whitespace-pre-wrap">{prontuario.observacoes || "-"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Label className="text-sm font-semibold text-gray-700">RELATO DO TERAPEUTA SOBRE A SESSÃO:</Label>
              <p className="mt-2 text-gray-800 whitespace-pre-wrap">{prontuario.relato_terapeuta || "-"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Label className="text-sm font-semibold text-gray-700">QUAL A SESSÃO DO PLANO TERAPÊUTICO:</Label>
              <p className="mt-2 text-gray-800 whitespace-pre-wrap">{prontuario.sessao_plano_terapeutico || "-"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button onClick={handleEditar} className="bg-blue-600 hover:bg-blue-700">
              <Edit className="w-4 h-4 mr-2" />
              Editar Prontuário
            </Button>
            <Button onClick={handleExportar} variant="outline" className="border-amber-600 text-amber-700 hover:bg-amber-50">
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">TERAPIA FEITA:</Label>
            <Textarea
              value={prontuario.terapia_feita}
              onChange={(e) => setProntuario({ ...prontuario, terapia_feita: e.target.value })}
              placeholder="Descreva a terapia realizada..."
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">MÚSCULO LIBERADO:</Label>
            <Textarea
              value={prontuario.musculo_liberado}
              onChange={(e) => setProntuario({ ...prontuario, musculo_liberado: e.target.value })}
              placeholder="Liste os músculos que foram liberados..."
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">SUGESTÕES PARA PRÓXIMA SESSÃO:</Label>
            <Textarea
              value={prontuario.sugestoes_proxima_sessao}
              onChange={(e) => setProntuario({ ...prontuario, sugestoes_proxima_sessao: e.target.value })}
              placeholder="Sugestões e recomendações para a próxima sessão..."
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">OBSERVAÇÕES:</Label>
            <Textarea
              value={prontuario.observacoes}
              onChange={(e) => setProntuario({ ...prontuario, observacoes: e.target.value })}
              placeholder="Observações gerais..."
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">RELATO DO TERAPEUTA SOBRE A SESSÃO:</Label>
            <Textarea
              value={prontuario.relato_terapeuta}
              onChange={(e) => setProntuario({ ...prontuario, relato_terapeuta: e.target.value })}
              placeholder="Relato detalhado do terapeuta sobre a sessão..."
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">QUAL A SESSÃO DO PLANO TERAPÊUTICO:</Label>
            <Textarea
              value={prontuario.sessao_plano_terapeutico}
              onChange={(e) => setProntuario({ ...prontuario, sessao_plano_terapeutico: e.target.value })}
              placeholder="Ex: 3ª sessão de 10, 5ª sessão do plano..."
              rows={2}
              className="mt-1"
            />
          </div>

          <Button onClick={handleSalvar} className="w-full bg-amber-600 hover:bg-amber-700">
            <Save className="w-4 h-4 mr-2" />
            Salvar Prontuário
          </Button>
        </div>
      )}
    </div>
  );
}