import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { Copy, Send, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TesteWebhook() {
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  // URL do webhook (ajuste conforme sua URL base)
  const webhookUrl = window.location.origin + "/api/webhookWhatsApp";

  const copiarUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    alert("✅ URL copiada!");
  };

  const testarWebhook = async () => {
    if (!telefone || !mensagem) {
      alert("Preencha telefone e mensagem!");
      return;
    }

    setLoading(true);
    setResultado(null);

    try {
      const response = await base44.functions.invoke('webhookWhatsApp', {
        from: telefone,
        message: {
          text: {
            body: mensagem
          }
        }
      });

      setResultado({
        sucesso: true,
        dados: response.data
      });
    } catch (error) {
      setResultado({
        sucesso: false,
        erro: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to={createPageUrl("Administrador")}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Teste de Webhook WhatsApp</h1>
        </div>

        <div className="grid gap-6">
          {/* URL do Webhook */}
          <Card>
            <CardHeader>
              <CardTitle>1. URL do Webhook</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Cole esta URL na sua API do WhatsApp (Evolution, Z-API, etc):</Label>
                <div className="flex gap-2">
                  <Input 
                    value={webhookUrl} 
                    readOnly 
                    className="bg-gray-100"
                  />
                  <Button onClick={copiarUrl} variant="outline">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Configure na sua API: Webhook → Mensagens Recebidas → Cole esta URL
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Teste Manual */}
          <Card>
            <CardHeader>
              <CardTitle>2. Testar Webhook Manualmente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Telefone do Cliente (ex: 5511999999999)</Label>
                  <Input
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="5511999999999"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mensagem (escreva "Confirmar" ou "Cancelar")</Label>
                  <Textarea
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    placeholder="Confirmar"
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={testarWebhook} 
                  disabled={loading}
                  className="w-full"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {loading ? "Enviando..." : "Testar Webhook"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resultado */}
          {resultado && (
            <Card>
              <CardHeader>
                <CardTitle>3. Resultado do Teste</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`p-4 rounded-lg ${resultado.sucesso ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}`}>
                  {resultado.sucesso ? (
                    <div className="space-y-2">
                      <div className="text-green-800 font-bold text-lg">
                        ✅ Webhook funcionou!
                      </div>
                      <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                        {JSON.stringify(resultado.dados, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-red-800 font-bold text-lg">
                        ❌ Erro no Webhook
                      </div>
                      <p className="text-red-700">{resultado.erro}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instruções */}
          <Card>
            <CardHeader>
              <CardTitle>📋 Como Funciona</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Copie a URL do webhook acima</li>
                <li>Configure na sua API do WhatsApp (Evolution, Z-API, Octadesk, etc)</li>
                <li>Quando cliente responder "Confirmar" → agendamento fica confirmado</li>
                <li>Quando cliente responder "Cancelar" → agendamento é deletado</li>
                <li>Use o teste acima para simular uma resposta do cliente</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}