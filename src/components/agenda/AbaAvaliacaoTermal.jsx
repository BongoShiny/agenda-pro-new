import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function AbaAvaliacaoTermal({ agendamento, usuarioAtual }) {
  const [uploading, setUploading] = useState(false);
  const [agendamentoAtualizado, setAgendamentoAtualizado] = useState(agendamento);
  const queryClient = useQueryClient();

  // Usar agendamento atualizado ou fallback ao agendamento original
  const ag = agendamentoAtualizado || agendamento;

  // Extrair URLs das fotos existentes
  const fotosExistentes = [];
  for (let i = 1; i <= 20; i++) {
    const url = ag[`avaliacao_termal_${i}`];
    if (url) {
      fotosExistentes.push({ index: i, url });
    }
  }

  const uploadFotoMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await base44.functions.invoke('uploadToGoogleDrive', formData);
      
      // Encontrar próximo slot disponível (1 a 20)
      let proximoSlot = 1;
      for (let i = 1; i <= 20; i++) {
        if (!ag[`avaliacao_termal_${i}`]) {
          proximoSlot = i;
          break;
        }
      }

      // Atualizar agendamento com nova foto
      const updateData = {
        [`avaliacao_termal_${proximoSlot}`]: data.file_url
      };

      const agendamentoAtualizado = await base44.entities.Agendamento.update(ag.id, updateData);

      // Log da ação
      await base44.entities.LogAcao.create({
        tipo: "editou_agendamento",
        usuario_email: usuarioAtual?.email || "sistema",
        descricao: `Anexou foto ${proximoSlot} da avaliação termal: ${ag.cliente_nome} - ${ag.data}`,
        entidade_tipo: "Agendamento",
        entidade_id: ag.id
      });

      // Atualizar estado local imediatamente
      setAgendamentoAtualizado(prev => ({
        ...prev,
        [`avaliacao_termal_${proximoSlot}`]: data.file_url
      }));

      return data.file_url;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
    },
    onError: (error) => {
      alert("❌ Erro ao fazer upload: " + error.message);
      setUploading(false);
    }
  });

  const removerFotoMutation = useMutation({
    mutationFn: async (index) => {
      const updateData = {
        [`avaliacao_termal_${index}`]: null
      };

      await base44.entities.Agendamento.update(ag.id, updateData);

      // Log da ação
      await base44.entities.LogAcao.create({
        tipo: "editou_agendamento",
        usuario_email: usuarioAtual?.email || "sistema",
        descricao: `Removeu foto ${index} da avaliação termal: ${ag.cliente_nome} - ${ag.data}`,
        entidade_tipo: "Agendamento",
        entidade_id: ag.id
      });

      // Atualizar estado local
      setAgendamentoAtualizado(prev => ({
        ...prev,
        [`avaliacao_termal_${index}`]: null
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
    }
  });

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    
    if (fotosExistentes.length + files.length > 20) {
      alert(`⚠️ Você pode anexar no máximo 20 fotos. Atualmente há ${fotosExistentes.length} foto(s) anexada(s).`);
      return;
    }

    setUploading(true);

    // Upload de cada arquivo sequencialmente
    for (const file of files) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        alert(`⚠️ ${file.name} não é uma imagem válida`);
        continue;
      }

      // Validar tamanho (máx 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`⚠️ ${file.name} é maior que 10MB`);
        continue;
      }

      await uploadFotoMutation.mutateAsync(file);
    }

    setUploading(false);
  };

  const handleRemover = (index) => {
    if (confirm(`Deseja remover esta foto da avaliação termal?`)) {
      removerFotoMutation.mutate(index);
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Avaliação da Câmera Termal</h3>
        </div>
        <div className="text-sm text-gray-500">
          {fotosExistentes.length} / 20 fotos
        </div>
      </div>

      {/* Upload de Fotos */}
      <div className="border-2 border-dashed border-purple-300 rounded-lg p-6 bg-purple-50 hover:border-purple-500 transition-colors">
        <Label htmlFor="upload-termal" className="cursor-pointer">
          <div className="flex flex-col items-center justify-center gap-3">
            {uploading ? (
              <>
                <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
                <p className="text-sm text-purple-700 font-medium">📤 Enviando para Google Drive...</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-purple-600" />
                <p className="text-sm text-purple-700 font-medium">
                  📁 Arraste ou clique para selecionar fotos
                </p>
                <p className="text-xs text-purple-600">
                  Até {20 - fotosExistentes.length} foto(s) restante(s) • PNG, JPG até 10MB cada
                </p>
                <p className="text-xs text-purple-500">
                  Arquivos serão enviados para o Google Drive automaticamente
                </p>
              </>
            )}
          </div>
          <input
            id="upload-termal"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading || fotosExistentes.length >= 20}
            key={fotosExistentes.length}
          />
        </Label>
      </div>

      {/* Grid de Fotos */}
      {fotosExistentes.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {fotosExistentes.map(({ index, url }) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden border-2 border-green-500 bg-gray-100">
                <img
                  src={url}
                  alt={`Avaliação Termal ${index}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => window.open(url, '_blank')}
                  className="bg-white hover:bg-gray-100"
                >
                  👁️ Visualizar no Drive
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRemover(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                ✅ Foto {index}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>Nenhuma foto anexada ainda</p>
        </div>
      )}
    </div>
  );
}