import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Save, Edit, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { musculosOptions } from "./musculosOptions";

const criarDataPura = (dataString) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

export default function AbaProntuario({ agendamento, usuarioAtual }) {
  const [prontuario, setProntuario] = useState({
    terapia_realizada: "",
    tecnicas_utilizadas: "",
    musculos_cabeca_pescoco: "",
    musculos_face_temporomandibular: "",
    musculos_face_costas_superior: "",
    musculos_ombros_bracos: "",
    musculos_toracica_lombar: "",
    musculos_quadris_coxas: "",
    musculos_panturrilhas: "",
    musculos_pes: "",
    musculos_abdomen: "",
    feedback_pre_sessao: "",
    feedback_pos_sessao: "",
    relato_terapeuta: "",
    observacoes_proxima_sessao: "",
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
        terapia_realizada: prontuarioExistente.terapia_realizada || "",
        tecnicas_utilizadas: prontuarioExistente.tecnicas_utilizadas || "",
        musculos_cabeca_pescoco: prontuarioExistente.musculos_cabeca_pescoco || "",
        musculos_face_temporomandibular: prontuarioExistente.musculos_face_temporomandibular || "",
        musculos_face_costas_superior: prontuarioExistente.musculos_face_costas_superior || "",
        musculos_ombros_bracos: prontuarioExistente.musculos_ombros_bracos || "",
        musculos_toracica_lombar: prontuarioExistente.musculos_toracica_lombar || "",
        musculos_quadris_coxas: prontuarioExistente.musculos_quadris_coxas || "",
        musculos_panturrilhas: prontuarioExistente.musculos_panturrilhas || "",
        musculos_pes: prontuarioExistente.musculos_pes || "",
        musculos_abdomen: prontuarioExistente.musculos_abdomen || "",
        feedback_pre_sessao: prontuarioExistente.feedback_pre_sessao || "",
        feedback_pos_sessao: prontuarioExistente.feedback_pos_sessao || "",
        relato_terapeuta: prontuarioExistente.relato_terapeuta || "",
        observacoes_proxima_sessao: prontuarioExistente.observacoes_proxima_sessao || "",
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
              margin: 8mm;
            }
            body { 
              font-family: Arial, sans-serif; 
              padding: 0; 
              background: #fff;
              margin: 0;
            }
            .container {
              max-width: 100%;
              margin: 0 auto;
              border: 4px solid #7C5746;
              padding: 0;
              background: white;
            }
            .header {
              text-align: center;
              margin-bottom: 0;
              padding: 12px 10px;
              background: #7C5746;
            }
            .content {
              padding: 10px;
            }
            .logo {
              width: 60px;
              height: auto;
              margin-bottom: 5px;
            }
            .title {
              color: #fff;
              font-size: 15px;
              font-weight: bold;
              margin: 3px 0;
            }
            .subtitle {
              color: #f9f5f3;
              font-size: 9px;
              font-style: italic;
            }
            .info-section {
              background: #f9f5f3;
              padding: 8px;
              border-radius: 6px;
              margin-bottom: 8px;
              border: 1px solid #d4c5b9;
              box-shadow: 0 1px 2px rgba(0,0,0,0.06);
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 4px;
            }
            .info-row {
              display: flex;
              font-size: 10px;
            }
            .info-label {
              font-weight: bold;
              color: #7C5746;
              min-width: 65px;
            }
            .info-value {
              color: #333;
            }
            .field-section {
              margin-bottom: 6px;
              padding: 6px;
              background: #f9f5f3;
              border: 1px solid #d4c5b9;
              border-radius: 6px;
              box-shadow: 0 1px 2px rgba(0,0,0,0.04);
            }
            .field-label {
              font-weight: bold;
              color: #7C5746;
              font-size: 10px;
              margin-bottom: 3px;
              display: block;
            }
            .field-value {
              color: #333;
              line-height: 1.25;
              white-space: pre-wrap;
              padding: 5px;
              background: #fff;
              border-radius: 3px;
              min-height: 20px;
              font-size: 10px;
              border: 1px solid #e8e0db;
            }
            .footer {
              margin-top: 8px;
              padding: 6px;
              background: #f9f5f3;
              border: 1px solid #d4c5b9;
              border-radius: 6px;
              text-align: center;
              color: #7C5746;
              font-size: 9px;
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

            <div class="content">
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
              <span class="field-label">TERAPIA REALIZADA:</span>
              <div class="field-value">${prontuario.terapia_realizada || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">TÉCNICAS UTILIZADAS:</span>
              <div class="field-value">${prontuario.tecnicas_utilizadas || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">MÚSCULOS LIBERADOS DA CABEÇA E PESCOÇO:</span>
              <div class="field-value">${prontuario.musculos_cabeca_pescoco || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">MÚSCULOS LIBERADOS DA FACE E REGIÃO TEMPOROMANDIBULAR:</span>
              <div class="field-value">${prontuario.musculos_face_temporomandibular || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">MÚSCULOS LIBERADOS DA FACE E REGIÃO SUPERIOR DAS COSTAS:</span>
              <div class="field-value">${prontuario.musculos_face_costas_superior || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">MÚSCULOS LIBERADOS DOS OMBROS E BRAÇOS:</span>
              <div class="field-value">${prontuario.musculos_ombros_bracos || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">MÚSCULOS LIBERADOS DA REGIÃO E TORÁCICA E LOMBAR:</span>
              <div class="field-value">${prontuario.musculos_toracica_lombar || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">MÚSCULOS LIBERADOS DOS QUADRIS E COXAS:</span>
              <div class="field-value">${prontuario.musculos_quadris_coxas || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">MÚSCULOS LIBERADOS DAS PANTURRILHAS:</span>
              <div class="field-value">${prontuario.musculos_panturrilhas || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">MÚSCULOS LIBERADOS DOS PÉS:</span>
              <div class="field-value">${prontuario.musculos_pes || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">MÚSCULOS LIBERADOS DO ABDÔMEN:</span>
              <div class="field-value">${prontuario.musculos_abdomen || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">FEEDBACK DO PACIENTE PRÉ SESSÃO:</span>
              <div class="field-value">${prontuario.feedback_pre_sessao || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">FEEDBACK DO PACIENTE PÓS SESSÃO:</span>
              <div class="field-value">${prontuario.feedback_pos_sessao || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">RELATO DO TERAPEUTA SOBRE A SESSÃO:</span>
              <div class="field-value">${prontuario.relato_terapeuta || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">OBSERVAÇÕES PARA UMA PRÓXIMA SESSÃO:</span>
              <div class="field-value">${prontuario.observacoes_proxima_sessao || "-"}</div>
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
              <Label className="text-sm font-semibold text-gray-700">TERAPIA REALIZADA:</Label>
              <p className="mt-2 text-gray-800 whitespace-pre-wrap">{prontuario.terapia_realizada || "-"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Label className="text-sm font-semibold text-gray-700">TÉCNICAS UTILIZADAS:</Label>
              <p className="mt-2 text-gray-800 whitespace-pre-wrap">{prontuario.tecnicas_utilizadas || "-"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Label className="text-sm font-semibold text-gray-700">MÚSCULOS LIBERADOS DA CABEÇA E PESCOÇO:</Label>
              <p className="mt-2 text-gray-800 whitespace-pre-wrap">{prontuario.musculos_cabeca_pescoco || "-"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Label className="text-sm font-semibold text-gray-700">MÚSCULOS LIBERADOS DA FACE E REGIÃO TEMPOROMANDIBULAR:</Label>
              <p className="mt-2 text-gray-800 whitespace-pre-wrap">{prontuario.musculos_face_temporomandibular || "-"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Label className="text-sm font-semibold text-gray-700">MÚSCULOS LIBERADOS DA FACE E REGIÃO SUPERIOR DAS COSTAS:</Label>
              <p className="mt-2 text-gray-800 whitespace-pre-wrap">{prontuario.musculos_face_costas_superior || "-"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Label className="text-sm font-semibold text-gray-700">MÚSCULOS LIBERADOS DOS OMBROS E BRAÇOS:</Label>
              <p className="mt-2 text-gray-800 whitespace-pre-wrap">{prontuario.musculos_ombros_bracos || "-"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Label className="text-sm font-semibold text-gray-700">MÚSCULOS LIBERADOS DA REGIÃO E TORÁCICA E LOMBAR:</Label>
              <p className="mt-2 text-gray-800 whitespace-pre-wrap">{prontuario.musculos_toracica_lombar || "-"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Label className="text-sm font-semibold text-gray-700">MÚSCULOS LIBERADOS DOS QUADRIS E COXAS:</Label>
              <p className="mt-2 text-gray-800 whitespace-pre-wrap">{prontuario.musculos_quadris_coxas || "-"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Label className="text-sm font-semibold text-gray-700">MÚSCULOS LIBERADOS DAS PANTURRILHAS:</Label>
              <p className="mt-2 text-gray-800 whitespace-pre-wrap">{prontuario.musculos_panturrilhas || "-"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Label className="text-sm font-semibold text-gray-700">MÚSCULOS LIBERADOS DOS PÉS:</Label>
              <p className="mt-2 text-gray-800 whitespace-pre-wrap">{prontuario.musculos_pes || "-"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Label className="text-sm font-semibold text-gray-700">MÚSCULOS LIBERADOS DO ABDÔMEN:</Label>
              <p className="mt-2 text-gray-800 whitespace-pre-wrap">{prontuario.musculos_abdomen || "-"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Label className="text-sm font-semibold text-gray-700">FEEDBACK DO PACIENTE PRÉ SESSÃO:</Label>
              <p className="mt-2 text-gray-800 whitespace-pre-wrap">{prontuario.feedback_pre_sessao || "-"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Label className="text-sm font-semibold text-gray-700">FEEDBACK DO PACIENTE PÓS SESSÃO:</Label>
              <p className="mt-2 text-gray-800 whitespace-pre-wrap">{prontuario.feedback_pos_sessao || "-"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Label className="text-sm font-semibold text-gray-700">RELATO DO TERAPEUTA SOBRE A SESSÃO:</Label>
              <p className="mt-2 text-gray-800 whitespace-pre-wrap">{prontuario.relato_terapeuta || "-"}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Label className="text-sm font-semibold text-gray-700">OBSERVAÇÕES PARA UMA PRÓXIMA SESSÃO:</Label>
              <p className="mt-2 text-gray-800 whitespace-pre-wrap">{prontuario.observacoes_proxima_sessao || "-"}</p>
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
            <Label className="text-sm font-medium text-gray-700">TERAPIA REALIZADA:</Label>
            <Textarea
              value={prontuario.terapia_realizada}
              onChange={(e) => setProntuario({ ...prontuario, terapia_realizada: e.target.value })}
              placeholder="Descreva a terapia realizada..."
              rows={2}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">TÉCNICAS UTILIZADAS:</Label>
            <div className="mt-1 flex flex-wrap gap-2 p-3 border rounded-md bg-white min-h-12">
              {prontuario.tecnicas_utilizadas?.split(',').filter(Boolean).map((tecnica, idx) => (
                <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  {tecnica.trim()}
                  <button onClick={() => setProntuario({
                    ...prontuario,
                    tecnicas_utilizadas: prontuario.tecnicas_utilizadas.split(',').filter((_, i) => i !== idx).join(',')
                  })} className="hover:text-blue-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <Select onValueChange={(value) => {
                const atual = prontuario.tecnicas_utilizadas?.split(',').filter(Boolean) || [];
                if (!atual.includes(value)) {
                  setProntuario({
                    ...prontuario,
                    tecnicas_utilizadas: [...atual, value].join(',')
                  });
                }
              }}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue placeholder="Adicionar técnica" />
                </SelectTrigger>
                <SelectContent>
                  {musculosOptions.tecnicas.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">MÚSCULOS LIBERADOS DA CABEÇA E PESCOÇO:</Label>
            <div className="mt-1 flex flex-wrap gap-2 p-3 border rounded-md bg-white min-h-12">
              {prontuario.musculos_cabeca_pescoco?.split(',').filter(Boolean).map((m, idx) => (
                <span key={idx} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  {m.trim()}
                  <button onClick={() => setProntuario({
                    ...prontuario,
                    musculos_cabeca_pescoco: prontuario.musculos_cabeca_pescoco.split(',').filter((_, i) => i !== idx).join(',')
                  })} className="hover:text-green-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <Select onValueChange={(value) => {
                const atual = prontuario.musculos_cabeca_pescoco?.split(',').filter(Boolean) || [];
                if (!atual.includes(value)) {
                  setProntuario({
                    ...prontuario,
                    musculos_cabeca_pescoco: [...atual, value].join(',')
                  });
                }
              }}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue placeholder="Adicionar músculo" />
                </SelectTrigger>
                <SelectContent>
                  {musculosOptions.cabeca_pescoco.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">MÚSCULOS LIBERADOS DA FACE E REGIÃO TEMPOROMANDIBULAR:</Label>
            <Textarea
              value={prontuario.musculos_face_temporomandibular}
              onChange={(e) => setProntuario({ ...prontuario, musculos_face_temporomandibular: e.target.value })}
              placeholder="Liste os músculos..."
              rows={2}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">MÚSCULOS LIBERADOS DA FACE E REGIÃO SUPERIOR DAS COSTAS:</Label>
            <Textarea
              value={prontuario.musculos_face_costas_superior}
              onChange={(e) => setProntuario({ ...prontuario, musculos_face_costas_superior: e.target.value })}
              placeholder="Liste os músculos..."
              rows={2}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">MÚSCULOS LIBERADOS DOS OMBROS E BRAÇOS:</Label>
            <Textarea
              value={prontuario.musculos_ombros_bracos}
              onChange={(e) => setProntuario({ ...prontuario, musculos_ombros_bracos: e.target.value })}
              placeholder="Liste os músculos..."
              rows={2}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">MÚSCULOS LIBERADOS DA REGIÃO E TORÁCICA E LOMBAR:</Label>
            <Textarea
              value={prontuario.musculos_toracica_lombar}
              onChange={(e) => setProntuario({ ...prontuario, musculos_toracica_lombar: e.target.value })}
              placeholder="Liste os músculos..."
              rows={2}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">MÚSCULOS LIBERADOS DOS QUADRIS E COXAS:</Label>
            <Textarea
              value={prontuario.musculos_quadris_coxas}
              onChange={(e) => setProntuario({ ...prontuario, musculos_quadris_coxas: e.target.value })}
              placeholder="Liste os músculos..."
              rows={2}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">MÚSCULOS LIBERADOS DAS PANTURRILHAS:</Label>
            <Textarea
              value={prontuario.musculos_panturrilhas}
              onChange={(e) => setProntuario({ ...prontuario, musculos_panturrilhas: e.target.value })}
              placeholder="Liste os músculos..."
              rows={2}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">MÚSCULOS LIBERADOS DOS PÉS:</Label>
            <Textarea
              value={prontuario.musculos_pes}
              onChange={(e) => setProntuario({ ...prontuario, musculos_pes: e.target.value })}
              placeholder="Liste os músculos..."
              rows={2}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">MÚSCULOS LIBERADOS DO ABDÔMEN:</Label>
            <Textarea
              value={prontuario.musculos_abdomen}
              onChange={(e) => setProntuario({ ...prontuario, musculos_abdomen: e.target.value })}
              placeholder="Liste os músculos..."
              rows={2}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">FEEDBACK DO PACIENTE PRÉ SESSÃO:</Label>
            <Textarea
              value={prontuario.feedback_pre_sessao}
              onChange={(e) => setProntuario({ ...prontuario, feedback_pre_sessao: e.target.value })}
              placeholder="Feedback antes da sessão..."
              rows={2}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">FEEDBACK DO PACIENTE PÓS SESSÃO:</Label>
            <Textarea
              value={prontuario.feedback_pos_sessao}
              onChange={(e) => setProntuario({ ...prontuario, feedback_pos_sessao: e.target.value })}
              placeholder="Feedback após a sessão..."
              rows={2}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">RELATO DO TERAPEUTA SOBRE A SESSÃO:</Label>
            <Textarea
              value={prontuario.relato_terapeuta}
              onChange={(e) => setProntuario({ ...prontuario, relato_terapeuta: e.target.value })}
              placeholder="Relato detalhado do terapeuta..."
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">OBSERVAÇÕES PARA UMA PRÓXIMA SESSÃO:</Label>
            <Textarea
              value={prontuario.observacoes_proxima_sessao}
              onChange={(e) => setProntuario({ ...prontuario, observacoes_proxima_sessao: e.target.value })}
              placeholder="Observações e recomendações..."
              rows={2}
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