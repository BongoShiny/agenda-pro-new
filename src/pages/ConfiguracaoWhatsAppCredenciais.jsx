import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Check, X, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ConfiguracaoWhatsAppCredenciais() {
  const [apiUrl, setApiUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [testando, setTestando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [resultado, setResultado] = useState(null);
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const user = await base44.auth.me();
        setUsuarioAtual(user);
        
        if (user?.role !== 'admin') {
          navigate(createPageUrl("Agenda"));
        }
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      } finally {
        setCarregando(false);
      }
    };
    carregarUsuario();
  }, [navigate]);

  const testarConexao = async () => {
    if (!apiUrl || !apiToken || !instanceName) {
      setResultado({
        sucesso: false,
        mensagem: "Preencha todos os campos para testar"
      });
      return;
    }

    setTestando(true);
    setResultado(null);

    try {
      const response = await base44.functions.invoke('testarConexaoWhatsApp', {
        apiUrl: apiUrl,
        apiToken: apiToken,
        instanceName: instanceName
      });

      setResultado({
        sucesso: response.data.sucesso,
        mensagem: response.data.mensagem
      });
    } catch (error) {
      setResultado({
        sucesso: false,
        mensagem: `Erro: ${error.message}`
      });
    } finally {
      setTestando(false);
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  if (!usuarioAtual || usuarioAtual.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link to={createPageUrl("Administrador")}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configurar WhatsApp API</h1>
            <p className="text-sm text-gray-500">Configure as credenciais da sua API WhatsApp</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Credenciais da API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>URL da API (ex: https://o216174-f20.api002.octadesk.services)</Label>
              <Input
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://seu-subdominio.api002.octadesk.services"
              />
              <p className="text-xs text-gray-500">Use o formato completo sem barra final</p>
            </div>

            <div className="space-y-2">
              <Label>Token da API</Label>
              <Input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Seu token da API"
              />
              <p className="text-xs text-gray-500">Este valor é mantido seguro e criptografado</p>
            </div>

            <div className="space-y-2">
              <Label>Nome da Instância</Label>
              <Input
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder="Ex: minha_instancia, default, prod, etc"
              />
              <p className="text-xs text-gray-500">O nome da sua instância na API do WhatsApp</p>
            </div>

            <Button 
              onClick={testarConexao} 
              disabled={testando}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {testando ? "Testando..." : "🔍 Testar Conexão"}
            </Button>
          </CardContent>
        </Card>

        {resultado && (
          <Card className={resultado.sucesso ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                {resultado.sucesso ? (
                  <Check className="w-6 h-6 text-green-600 mt-0.5" />
                ) : (
                  <X className="w-6 h-6 text-red-600 mt-0.5" />
                )}
                <div>
                  <h3 className={`font-semibold ${resultado.sucesso ? "text-green-900" : "text-red-900"}`}>
                    {resultado.sucesso ? "✅ Sucesso!" : "❌ Erro"}
                  </h3>
                  <p className={resultado.sucesso ? "text-green-700" : "text-red-700"}>
                    {resultado.mensagem}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <AlertCircle className="w-5 h-5" />
              ℹ️ Próximos Passos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-yellow-800">
            <ol className="list-decimal list-inside space-y-1">
              <li>Teste a conexão acima para validar suas credenciais</li>
              <li>Se passar no teste, as configurações serão salvas</li>
              <li>Volte para <Link to={createPageUrl("ConfiguracaoWhatsApp")} className="font-semibold underline">Configuração WhatsApp</Link> para configurar mensagens</li>
              <li>Use a página de <Link to={createPageUrl("TesteWebhook")} className="font-semibold underline">Testar Webhook</Link> para enviar mensagens de teste</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}