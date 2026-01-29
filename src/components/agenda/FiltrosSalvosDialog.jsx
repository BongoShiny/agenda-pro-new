import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Trash2, Star, StarOff } from "lucide-react";

export default function FiltrosSalvosDialog({ 
  open, 
  onOpenChange, 
  filtrosAtuais,
  onCarregarFiltro,
  usuarioAtual
}) {
  const [nomeFiltro, setNomeFiltro] = useState("");
  const queryClient = useQueryClient();

  const { data: filtrosSalvos = [] } = useQuery({
    queryKey: ['filtros-salvos', usuarioAtual?.email],
    queryFn: async () => {
      if (!usuarioAtual?.email) return [];
      return await base44.entities.FiltroSalvo.filter({ 
        usuario_email: usuarioAtual.email 
      });
    },
    enabled: !!usuarioAtual?.email,
    initialData: []
  });

  const salvarFiltroMutation = useMutation({
    mutationFn: async (dados) => {
      return await base44.entities.FiltroSalvo.create(dados);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filtros-salvos'] });
      setNomeFiltro("");
    }
  });

  const deletarFiltroMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.FiltroSalvo.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filtros-salvos'] });
    }
  });

  const definirPadraoMutation = useMutation({
    mutationFn: async ({ filtroId }) => {
      // Remover padrão de todos
      for (const filtro of filtrosSalvos) {
        if (filtro.padrao) {
          await base44.entities.FiltroSalvo.update(filtro.id, { padrao: false });
        }
      }
      // Definir novo padrão
      await base44.entities.FiltroSalvo.update(filtroId, { padrao: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filtros-salvos'] });
    }
  });

  const handleSalvar = () => {
    if (!nomeFiltro.trim()) {
      alert("Digite um nome para o filtro");
      return;
    }

    const temFiltros = Object.values(filtrosAtuais).some(v => v !== null && v !== "");
    if (!temFiltros) {
      alert("Configure pelo menos um filtro antes de salvar");
      return;
    }

    salvarFiltroMutation.mutate({
      usuario_email: usuarioAtual.email,
      nome: nomeFiltro,
      filtros: JSON.stringify(filtrosAtuais),
      padrao: filtrosSalvos.length === 0 // Primeiro filtro é padrão
    });
  };

  const handleCarregar = (filtro) => {
    const filtrosObj = JSON.parse(filtro.filtros);
    onCarregarFiltro(filtrosObj);
    onOpenChange(false);
  };

  const handleDeletar = (id, e) => {
    e.stopPropagation();
    if (confirm("Deseja realmente excluir este filtro?")) {
      deletarFiltroMutation.mutate(id);
    }
  };

  const handleDefinirPadrao = (filtroId, e) => {
    e.stopPropagation();
    definirPadraoMutation.mutate({ filtroId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Filtros Salvos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Salvar novo filtro */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Salvar Filtro Atual</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Nome do filtro..."
                value={nomeFiltro}
                onChange={(e) => setNomeFiltro(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSalvar()}
              />
              <Button onClick={handleSalvar} disabled={salvarFiltroMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>

          {/* Lista de filtros salvos */}
          {filtrosSalvos.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Meus Filtros ({filtrosSalvos.length})</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filtrosSalvos.map(filtro => (
                  <div
                    key={filtro.id}
                    onClick={() => handleCarregar(filtro)}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {filtro.padrao ? (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <StarOff className="w-4 h-4 text-gray-400" />
                      )}
                      <div>
                        <div className="font-medium">{filtro.nome}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(filtro.created_date).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDefinirPadrao(filtro.id, e)}
                        className="h-8 w-8 text-gray-400 hover:text-yellow-500"
                      >
                        {filtro.padrao ? (
                          <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        ) : (
                          <StarOff className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDeletar(filtro.id, e)}
                        className="h-8 w-8 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filtrosSalvos.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Save className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Nenhum filtro salvo ainda</p>
              <p className="text-xs">Configure os filtros e salve para acesso rápido</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}