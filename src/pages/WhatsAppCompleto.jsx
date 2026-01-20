import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Send, Check, AlertCircle, Copy } from "lucide-react";

export default function WhatsAppCompleto() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testando, setTestando] = useState(false);
  const [numeroTeste, setNumeroTeste] = useState("");
  const [mensagensEditaveis, setMensagensEditaveis] = useState({});
  const [resultado, setResultado] = useState(null);
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser || !['superior', 'admin'].includes(currentUser.role)) {
          window.location.href = createPageUrl("Agenda");
          return;
        }
        setUser(currentUser);
      } catch (error) {
        window.location.href = createPageUrl("Agenda");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: () => base44.entities.Unidade.filter({ ativa: true })
  });

  const { data: configuracoes = [] } = useQuery({
    queryKey: ['configuracoes-whatsapp'],
    queryFn: () => base44.entities.ConfiguracaoWhatsApp.list()
  });

  const createConfig = useMutation({
    mutationFn: (data) => base44.entities.ConfiguracaoWhatsApp.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['configuracoes-whatsapp'] })
  });

  const updateConfig = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ConfiguracaoWhatsApp.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['configuracoes-whatsapp'] })
  });

  const handleToggleAtivo = async (config) => {
    if (!config.ativo) {
      const confirmar = window.confirm(`Ativar WhatsApp para ${config.unidade_nome}?\n\nIsso enviará mensagens automaticamente para todos os agendamentos de amanhã desta unidade.`);
      if (!confirmar) return;
      
      try {
        await updateConfig.mutateAsync({ id: config.id, data: { ativo: true } });
        await base44.functions.invoke('enviarLembreteWhatsApp', {
          envioImediato: true,
          unidadeId: config.unidade_id
        });
        alert('✅ WhatsApp ativado e mensagens enviadas!');
      } catch (error) {
        alert('❌ Erro ao ativar: ' + error.message);
      }
    } else {
      await updateConfig.mutateAsync({ id: config.id, data: { ativo: false } });
    }
  };

  const handleSalvarMensagem = async (config) => {
    const novaMensagem = mensagensEditaveis[config.id];
    if (novaMensagem) {
      await updateConfig.mutateAsync({ 
        id: config.id, 
        data: { mensagem_template: novaMensagem } 
      });
      setMensagensEditaveis(prev => {
        const novo = { ...prev };
        delete novo[config.id];
        return novo;
      });
    }
  };

  const handleToggleHorario = async (config, tipo) => {
    const campo = tipo === '1_dia' ? 'enviar_1_dia' : 'enviar_12_horas';
    await updateConfig.mutateAsync({ 
      id: config.id, 
      data: { [campo]: !config[campo] } 
    });
  };

  const handleCriarConfiguracao = async (unidadeId, unidadeNome) => {
    await createConfig.mutateAsync({
      unidade_id: unidadeId,
      unidade_nome: unidadeNome,
      ativo: false,
      mensagem_template: "Olá {cliente}! 🗓️\n\nLembramos que você tem um agendamento:\n\n📅 Data: {data}\n⏰ Horário: {hora}\n👨‍⚕️ Profissional: {profissional}\n💼 Serviço: {servico}\n📍 Unidade: {unidade}\n\n✅ Responda *Confirmar* para confirmar\n❌ Responda *Cancelar* para cancelar",
      enviar_1_dia: true,
      enviar_12_horas: true
    });
  };

  const handleTestarEnvio = async (config) => {
    if (!numeroTeste) {
      alert('Digite um número de teste!');
      return;
    }
    
    setTestando(true);
    try {
      const response = await base44.functions.invoke('enviarLembreteWhatsApp', {
        numeroTeste: numeroTeste
      });
      
      if (response.data.mensagensEnviadas > 0) {
        alert(`✅ Mensagem de teste enviada com sucesso!`);
      } else {
        alert('❌ Nenhuma mensagem enviada. Verifique se há agendamentos para este número.');
      }
    } catch (error) {
      alert('❌ Erro ao enviar teste: ' + error.message);
    } finally {
      setTestando(false);
    }
  };

  const copiarUrl = () => {
    const webhookUrl = window.location.origin + "/api/webhookWhatsApp";
    navigator.clipboard.writeText(webhookUrl);
    alert("✅ URL copiada!");
  };

  const enviarMensagem = async () => {
    if (!telefone || !mensagem) {
      alert("Preencha telefone e mensagem!");
      return;
    }

    setTestando(true);
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
      setTestando(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  const webhookUrl = window.location.origin + "/api/webhookWhatsApp";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to={createPageUrl("Administrador")}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">WhatsApp - Configuração Completa</h1>
        </div>

        <Tabs defaultValue="setup" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="setup">📱 Setup</TabsTrigger>
            <TabsTrigger value="config">⚙️ Configuração</TabsTrigger>
            <TabsTrigger value="webhook">🔗 Webhook</TabsTrigger>
            <TabsTrigger value="teste">🧪 Teste</TabsTrigger>
          </TabsList>

          {/* ABA SETUP */}
          <TabsContent value="setup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>📱 Como Configurar WhatsApp Business API</CardTitle>
                <CardDescription>Siga este guia passo a passo para configurar sua integração</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Passo 1 */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-bold text-lg mb-2">1️⃣ Criar Conta na Octadesk</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Acesse: <a href="https://octadesk.com" target="_blank" rel="noopener" className="text-blue-600 underline">octadesk.com</a></li>
                    <li>Crie uma conta gratuita ou faça login</li>
                    <li>Acesse o painel de controle</li>
                  </ol>
                </div>

                {/* Passo 2 */}
                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-bold text-lg mb-2">2️⃣ Conectar WhatsApp Business</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>No painel Octadesk, vá em <strong>Canais → WhatsApp</strong></li>
                    <li>Clique em <strong>"Conectar WhatsApp"</strong></li>
                    <li>Escolha <strong>"WhatsApp Business API"</strong></li>
                    <li>Escaneie o QR Code com seu WhatsApp Business</li>
                    <li>Aguarde a confirmação da conexão</li>
                  </ol>
                </div>

                {/* Passo 3 */}
                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="font-bold text-lg mb-2">3️⃣ Obter Credenciais da API</h3>
                  <div className="space-y-3">
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="font-semibold mb-1">🔗 URL da API:</p>
                      <code className="text-xs bg-white px-2 py-1 rounded">https://oXXXXXX-fXX.apiXXX.octadesk.services</code>
                      <p className="text-xs text-gray-600 mt-1">
                        • Encontre em: <strong>Configurações → API → URL Base</strong><br/>
                        • Formato: https://o[seu-id]-f[numero].api[numero].octadesk.services<br/>
                        • Exemplo: https://o216174-f20.api002.octadesk.services
                      </p>
                    </div>

                    <div className="bg-gray-50 p-3 rounded">
                      <p className="font-semibold mb-1">🔑 Token da API:</p>
                      <code className="text-xs bg-white px-2 py-1 rounded">xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</code>
                      <p className="text-xs text-gray-600 mt-1">
                        • Encontre em: <strong>Configurações → API → Tokens</strong><br/>
                        • Clique em <strong>"Gerar Novo Token"</strong><br/>
                        • Copie o token completo (formato UUID com hífens)<br/>
                        • ⚠️ Guarde com segurança - só aparece uma vez!
                      </p>
                    </div>

                    <div className="bg-gray-50 p-3 rounded">
                      <p className="font-semibold mb-1">📱 Nome da Instância:</p>
                      <code className="text-xs bg-white px-2 py-1 rounded">minha_instancia</code>
                      <p className="text-xs text-gray-600 mt-1">
                        • Encontre em: <strong>Canais → WhatsApp → Configurações</strong><br/>
                        • Geralmente é "default" ou o nome que você definiu<br/>
                        • Exemplos: default, producao, vibe_terapias
                      </p>
                    </div>
                  </div>
                </div>

                {/* Passo 4 */}
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="font-bold text-lg mb-2">4️⃣ Configurar no Dashboard</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Acesse o <strong>Dashboard → Configurações → Secrets</strong></li>
                    <li>Configure os seguintes valores:</li>
                  </ol>
                  <div className="mt-2 space-y-2 ml-6">
                    <div className="text-sm">
                      <strong>WHATSAPP_API_URL:</strong> Cole a URL completa da API
                    </div>
                    <div className="text-sm">
                      <strong>WHATSAPP_API_TOKEN:</strong> Cole o token UUID completo
                    </div>
                    <div className="text-sm">
                      <strong>WHATSAPP_INSTANCE_NAME:</strong> Cole o nome da instância
                    </div>
                  </div>
                </div>

                {/* Passo 5 */}
                <div className="border-l-4 border-red-500 pl-4">
                  <h3 className="font-bold text-lg mb-2">5️⃣ Testar Integração</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Vá para a aba <strong>"🧪 Teste"</strong> desta página</li>
                    <li>Digite seu próprio número de telefone</li>
                    <li>Digite uma mensagem de teste</li>
                    <li>Clique em "Enviar Mensagem WhatsApp"</li>
                    <li>Verifique se recebeu a mensagem no seu WhatsApp</li>
                  </ol>
                </div>

                {/* Alternativas */}
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">💡 Alternativas à Octadesk:</h4>
                  <ul className="space-y-2 text-sm">
                    <li><strong>Evolution API:</strong> Solução open-source e gratuita
                      <br/><a href="https://evolution-api.com" target="_blank" className="text-blue-600 underline text-xs">evolution-api.com</a>
                    </li>
                    <li><strong>Z-API:</strong> API brasileira para WhatsApp Business
                      <br/><a href="https://z-api.io" target="_blank" className="text-blue-600 underline text-xs">z-api.io</a>
                    </li>
                    <li><strong>Baileys:</strong> Biblioteca Node.js open-source
                      <br/><a href="https://github.com/WhiskeySockets/Baileys" target="_blank" className="text-blue-600 underline text-xs">github.com/WhiskeySockets/Baileys</a>
                    </li>
                  </ul>
                  <p className="text-xs text-yellow-700 mt-2">
                    ℹ️ As credenciais funcionam de forma similar - você precisará da URL, Token e Instance de cada provedor.
                  </p>
                </div>

                {/* Troubleshooting */}
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">❌ Problemas Comuns:</h4>
                  <ul className="space-y-2 text-sm">
                    <li><strong>Erro 401 (Unauthorized):</strong> Token incorreto ou expirado - gere um novo</li>
                    <li><strong>Erro 404:</strong> URL da API incorreta - verifique o formato</li>
                    <li><strong>Mensagem não chega:</strong> Verifique se o WhatsApp está conectado na Octadesk</li>
                    <li><strong>Instância não encontrada:</strong> Confirme o nome exato da instância</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA CONFIGURAÇÃO */}
          <TabsContent value="config" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>📋 Guia de Configuração</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Configure suas credenciais de API (URL, Token e Instância) no Dashboard</li>
                  <li>Ative o WhatsApp para as unidades desejadas abaixo</li>
                  <li>Configure os horários de envio (1 dia antes e/ou 12 horas antes)</li>
                  <li>Personalize a mensagem para cada unidade</li>
                  <li>Configure o webhook na aba "Webhook"</li>
                  <li>Teste o envio na aba "Teste"</li>
                </ol>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {unidades.map(unidade => {
                const config = configuracoes.find(c => c.unidade_id === unidade.id);
                
                if (!config) {
                  return (
                    <Card key={unidade.id}>
                      <CardHeader>
                        <CardTitle>{unidade.nome}</CardTitle>
                        <CardDescription>WhatsApp não configurado</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button onClick={() => handleCriarConfiguracao(unidade.id, unidade.nome)}>
                          Criar Configuração
                        </Button>
                      </CardContent>
                    </Card>
                  );
                }

                return (
                  <Card key={unidade.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{config.unidade_nome}</CardTitle>
                          <CardDescription>
                            {config.ativo ? '✅ Ativo' : '❌ Inativo'}
                          </CardDescription>
                        </div>
                        <Switch 
                          checked={config.ativo}
                          onCheckedChange={() => handleToggleAtivo(config)}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Enviar lembretes:</Label>
                        <div className="flex gap-4 mt-2">
                          <label className="flex items-center gap-2">
                            <Switch 
                              checked={config.enviar_1_dia}
                              onCheckedChange={() => handleToggleHorario(config, '1_dia')}
                            />
                            <span>1 dia antes</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <Switch 
                              checked={config.enviar_12_horas}
                              onCheckedChange={() => handleToggleHorario(config, '12_horas')}
                            />
                            <span>12 horas antes</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <Label>Mensagem personalizada:</Label>
                        <Textarea
                          value={mensagensEditaveis[config.id] !== undefined 
                            ? mensagensEditaveis[config.id] 
                            : config.mensagem_template}
                          onChange={(e) => setMensagensEditaveis(prev => ({
                            ...prev,
                            [config.id]: e.target.value
                          }))}
                          rows={8}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Use: {"{cliente}"}, {"{profissional}"}, {"{data}"}, {"{hora}"}, {"{unidade}"}, {"{servico}"}
                        </p>
                        {mensagensEditaveis[config.id] && (
                          <Button 
                            onClick={() => handleSalvarMensagem(config)}
                            className="mt-2"
                            size="sm"
                          >
                            Salvar Mensagem
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ABA WEBHOOK */}
          <TabsContent value="webhook" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>🔗 Configurar Webhook</CardTitle>
                <CardDescription>
                  Configure este webhook na sua API do WhatsApp para receber confirmações/cancelamentos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>URL do Webhook:</Label>
                  <div className="flex gap-2 mt-2">
                    <Input 
                      value={webhookUrl} 
                      readOnly 
                      className="bg-gray-100 font-mono text-sm"
                    />
                    <Button onClick={copiarUrl} variant="outline" size="icon">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">📋 Como configurar na Octadesk:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Acesse sua conta Octadesk</li>
                    <li>Vá em Configurações → Integrações → WhatsApp</li>
                    <li>Configure o webhook para "Mensagens Recebidas"</li>
                    <li>Cole a URL acima</li>
                    <li>Salve as configurações</li>
                  </ol>
                </div>

                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">✅ Funcionamento:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Cliente responde "Confirmar" → agendamento fica confirmado</li>
                    <li>Cliente responde "Cancelar" → agendamento é cancelado</li>
                    <li>Sistema identifica automaticamente pelo número</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA TESTE */}
          <TabsContent value="teste" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>📱 Enviar Mensagem de Teste</CardTitle>
                <CardDescription>
                  Envie uma mensagem real para testar a integração
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Telefone do Cliente (ex: 5511999999999)</Label>
                  <Input
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="5511999999999"
                  />
                </div>

                <div>
                  <Label>Mensagem para enviar</Label>
                  <Textarea
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    placeholder="Digite a mensagem que deseja enviar..."
                    rows={4}
                  />
                </div>

                <Button 
                  onClick={enviarMensagem} 
                  disabled={testando}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {testando ? "Enviando..." : "📱 Enviar Mensagem WhatsApp"}
                </Button>

                {resultado && (
                  <div className={`p-4 rounded-lg ${resultado.sucesso ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}`}>
                    {resultado.sucesso ? (
                      <div className="space-y-2">
                        <div className="text-green-800 font-bold text-lg flex items-center gap-2">
                          <Check className="h-5 w-5" /> Mensagem enviada!
                        </div>
                        <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                          {JSON.stringify(resultado.dados, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-red-800 font-bold text-lg flex items-center gap-2">
                          <AlertCircle className="h-5 w-5" /> Erro no envio
                        </div>
                        <p className="text-red-700">{resultado.erro}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🔍 Testar com Número Específico</CardTitle>
                <CardDescription>
                  Teste o envio automático para um número de telefone específico
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Número de Teste (DDD + Telefone)</Label>
                  <Input
                    value={numeroTeste}
                    onChange={(e) => setNumeroTeste(e.target.value)}
                    placeholder="Ex: 11999999999"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Sistema buscará agendamentos deste número e enviará mensagem de teste
                  </p>
                </div>

                <Button 
                  onClick={() => handleTestarEnvio()}
                  disabled={testando || !numeroTeste}
                  className="w-full"
                >
                  {testando ? "Enviando..." : "🧪 Enviar Teste"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}