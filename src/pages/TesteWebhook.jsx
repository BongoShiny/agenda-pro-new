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

  const enviarMensagem = async () => {
    if (!telefone || !mensagem) {
      alert("Preencha telefone e mensagem!");
      return;
    }

    setLoading(true);
    setResultado(null);

    try {
      const response = await base44.functions.invoke('enviarMensagemTeste', {
        telefone: telefone,
        mensagem: mensagem
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

  const testarWebhook = async () => {
    if (!telefone || !mensagem) {
      alert("Preencha telefone e mensagem!");
      return;
    }

    setLoading(true);
    setResultado(null);

    try {
      const response = await base44.functions.invoke('webhookWhatsApp', {
        phoneNumber: telefone,
        contact: {
          phoneNumber: telefone
        },
        message: {
          body: mensagem
        }
      });

      setResultado({
        sucesso: true,
        dados: response.data
      });
    } catch (error) {
      setResultado({
        sucesso: false,
        erro: error.message || error.response?.data?.error || 'Erro desconhecido'
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

          {/* Enviar Mensagem Real */}
          <Card>
            <CardHeader>
              <CardTitle>2. Enviar Mensagem Real via WhatsApp</CardTitle>
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
                  <Label>Mensagem para enviar</Label>
                  <Textarea
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    placeholder="Digite a mensagem que deseja enviar..."
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={enviarMensagem} 
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {loading ? "Enviando..." : "📱 Enviar Mensagem WhatsApp"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Teste Webhook */}
          <Card>
            <CardHeader>
              <CardTitle>3. Simular Resposta do Cliente (Testar Webhook)</CardTitle>
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
                  <Label>Resposta (escreva "Confirmar" ou "Cancelar")</Label>
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
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {loading ? "Testando..." : "🔄 Simular Resposta do Cliente"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resultado */}
          {resultado && (
            <Card>
              <CardHeader>
                <CardTitle>4. Resultado</CardTitle>
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
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">📱 Enviar Mensagem Real:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Digite o telefone do cliente (com DDD e código do país)</li>
                    <li>Escreva a mensagem que deseja enviar</li>
                    <li>Clique em "Enviar Mensagem WhatsApp"</li>
                    <li>O cliente receberá a mensagem no WhatsApp</li>
                  </ol>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">🔄 Simular Resposta:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Digite o telefone do cliente</li>
                    <li>Escreva "Confirmar" ou "Cancelar"</li>
                    <li>Clique em "Simular Resposta do Cliente"</li>
                    <li>O sistema processará como se o cliente tivesse respondido</li>
                  </ol>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">⚙️ Configurar Webhook:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Copie a URL do webhook acima</li>
                    <li>Configure na sua API do WhatsApp (Evolution, Z-API, etc)</li>
                    <li>Quando cliente responder "Confirmar" → agendamento fica confirmado</li>
                    <li>Quando cliente responder "Cancelar" → agendamento é deletado</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}