import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, DollarSign, Save, X, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function LancarVendasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [uploadingComprovante, setUploadingComprovante] = useState(false);
  const [informacoesVenda, setInformacoesVenda] = useState("");
  const [comprovanteUrl, setComprovanteUrl] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const criarRegistroMutation = useMutation({
    mutationFn: async (dadosRegistro) => {
      return await base44.entities.RegistroManualVendas.create(dadosRegistro);
    },
    onSuccess: () => {
      alert("✅ Venda registrada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['registros-vendas'] });
      setInformacoesVenda("");
      setComprovanteUrl("");
      navigate(createPageUrl("GerenciarClientesVendas"));
    },
    onError: (error) => {
      alert(`❌ Erro ao registrar venda: ${error.message}`);
    },
  });

  const handleUploadComprovante = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingComprovante(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setComprovanteUrl(file_url);
      alert("✅ Comprovante anexado com sucesso!");
    } catch (error) {
      alert(`❌ Erro ao anexar comprovante: ${error.message}`);
    } finally {
      setUploadingComprovante(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!informacoesVenda.trim()) {
      alert("⚠️ Preencha as informações da venda!");
      return;
    }

    criarRegistroMutation.mutate({
      informacoes: informacoesVenda,
      comprovante_url: comprovanteUrl,
      criado_por: user?.email,
      data_registro: format(new Date(), "yyyy-MM-dd"),
    });
  };

  const isVendedor = user?.cargo === "vendedor";
  const isAdmin = user?.role === "admin" || user?.cargo === "administrador" || user?.cargo === "superior";

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isVendedor && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-6">Esta página é exclusiva para vendedores.</p>
          <Button onClick={() => navigate(createPageUrl("Agenda"))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Agenda
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate(createPageUrl("Agenda"))}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-green-600" />
                  Lançar Vendas
                </h1>
                <p className="text-gray-600 mt-1">Registre vendas nos relatórios financeiros</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações da Venda */}
            <div className="border-2 border-gray-200 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                📝 Insira as informações da sua venda:
              </h3>
              
              <Textarea
                value={informacoesVenda}
                onChange={(e) => setInformacoesVenda(e.target.value)}
                placeholder="Digite todas as informações da venda aqui..."
                rows={10}
                className="w-full"
              />
            </div>

            {/* Anexar Comprovante */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <Label className="mb-2 block">Anexar Comprovante</Label>
              <div className="flex items-center gap-4">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center gap-3 border-2 border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <Upload className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {comprovanteUrl ? "✅ Comprovante anexado" : "Clique para anexar comprovante"}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadComprovante}
                    className="hidden"
                    disabled={uploadingComprovante}
                  />
                </label>
                {comprovanteUrl && (
                  <a href={comprovanteUrl} target="_blank" rel="noopener noreferrer">
                    <Button type="button" variant="outline" size="sm">
                      Ver Comprovante
                    </Button>
                  </a>
                )}
              </div>
              {uploadingComprovante && (
                <p className="text-sm text-blue-600 mt-2">Enviando comprovante...</p>
              )}
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate(createPageUrl("Agenda"))}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-green-600 hover:bg-green-700"
                disabled={criarRegistroMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {criarRegistroMutation.isPending ? "Salvando..." : "Lançar Venda"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}