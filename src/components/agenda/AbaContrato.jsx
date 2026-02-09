import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, Upload, Eye, Trash2 } from "lucide-react";

export default function AbaContrato({ agendamento, usuarioAtual, onAtualizarAgendamento, setAbaAtiva }) {
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const uploadContratoMutation = useMutation({
    mutationFn: async (file) => {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const agendamentoAtualizado = await base44.entities.Agendamento.update(agendamento.id, {
        contrato_termo_url: file_url
      });

      // Registrar no log
      await base44.entities.LogAcao.create({
        tipo: "editou_agendamento",
        usuario_email: usuarioAtual?.email || "sistema",
        descricao: `Anexou contrato termo 30% para: ${agendamento.cliente_nome} - ${agendamento.data}`,
        entidade_tipo: "Agendamento",
        entidade_id: agendamento.id
      });

      return agendamentoAtualizado;
    },
    onSuccess: async (agendamentoAtualizado) => {
      await queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      await queryClient.refetchQueries({ queryKey: ['agendamentos'] });
      queryClient.invalidateQueries({ queryKey: ['logs-acoes'] });
      setUploading(false);
      alert("✅ Contrato anexado com sucesso!");
      if (onAtualizarAgendamento) onAtualizarAgendamento();
      // Manter na aba de contrato após anexar
      if (setAbaAtiva) setAbaAtiva("contrato");
    },
    onError: (error) => {
      setUploading(false);
      alert("❌ Erro ao anexar contrato: " + error.message);
    }
  });

  const removerContratoMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Agendamento.update(agendamento.id, {
        contrato_termo_url: null
      });

      // Registrar no log
      await base44.entities.LogAcao.create({
        tipo: "editou_agendamento",
        usuario_email: usuarioAtual?.email || "sistema",
        descricao: `Removeu contrato termo 30% de: ${agendamento.cliente_nome} - ${agendamento.data}`,
        entidade_tipo: "Agendamento",
        entidade_id: agendamento.id
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      await queryClient.refetchQueries({ queryKey: ['agendamentos'] });
      alert("✅ Contrato removido com sucesso!");
      if (onAtualizarAgendamento) onAtualizarAgendamento();
    },
    onError: (error) => {
      alert("❌ Erro ao remover contrato: " + error.message);
    }
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert("❌ Apenas imagens (JPG, PNG, GIF) ou PDF são permitidos!");
      return;
    }

    // Validar tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("❌ O arquivo deve ter no máximo 10MB!");
      return;
    }

    uploadContratoMutation.mutate(file);
  };

  const handleRemover = async () => {
    if (window.confirm("Tem certeza que deseja remover este contrato?")) {
      removerContratoMutation.mutate();
    }
  };

  const temContrato = !!agendamento?.contrato_termo_url;

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">Contrato Termo 30% Multa</h3>
        </div>
      </div>

      {temContrato ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800 font-medium">✅ Contrato anexado com sucesso!</p>
            <p className="text-xs text-green-700 mt-1">Cliente: {agendamento.cliente_nome}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Documento Anexado:</Label>
            <div className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                <span className="text-sm text-gray-700">Contrato Termo 30% Multa</span>
              </div>
              <div className="flex gap-2">
                <a 
                  href={agendamento.contrato_termo_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Button size="sm" variant="outline" className="border-blue-600 text-blue-700 hover:bg-blue-50">
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar
                  </Button>
                </a>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleRemover}
                  className="border-red-600 text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-xs text-orange-800">
              <strong>Importante:</strong> Este contrato estabelece uma multa de 30% em caso de cancelamento após a assinatura.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 font-medium">⚠️ Nenhum contrato anexado</p>
            <p className="text-xs text-yellow-700 mt-1">Faça o upload do contrato assinado pelo cliente</p>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-300 text-center">
            <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Anexar Contrato Termo 30% Multa
            </Label>
            <p className="text-xs text-gray-500 mb-4">
              Formatos aceitos: JPG, PNG, GIF, PDF (máximo 10MB)
            </p>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              disabled={uploading}
              style={{ display: 'none' }}
              id="upload-contrato"
            />
            <Button 
              type="button" 
              className="bg-orange-600 hover:bg-orange-700"
              disabled={uploading}
              onClick={() => document.getElementById('upload-contrato').click()}
            >
              {uploading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Selecionar Arquivo
                </>
              )}
            </Button>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-xs text-orange-800">
              <strong>Sobre o Termo 30% Multa:</strong><br/>
              Este contrato estabelece que caso o cliente cancele o serviço após a assinatura, será cobrada uma multa de 30% sobre o valor total do serviço contratado.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}