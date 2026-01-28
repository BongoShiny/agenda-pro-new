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
      const tipoEnvio = config.tipo_envio === '24_horas_antes' ? '18h' : config.horario_fixo || '18:00';
      const confirmar = window.confirm(`Ativar WhatsApp para ${config.unidade_nome}?\n\nOs lembretes serão enviados diariamente às ${tipoEnvio} para agendamentos do dia seguinte.`);
      if (!confirmar) return;
      
      try {
        await updateConfig.mutateAsync({ 
          id: config.id, 
          data: { ativo: true } 
        });
        
        alert(`✅ WhatsApp ativado!\n\nOs lembretes serão enviados automaticamente todos os dias no horário configurado.`);
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

  const handleCriarConfiguracao = async (unidadeId, unidadeNome) => {
    await createConfig.mutateAsync({
      unidade_id: unidadeId,
      unidade_nome: unidadeNome,
      ativo: false,
      mensagem_template: "Olá {cliente}! 🗓️\n\nLembramos que você tem um agendamento:\n\n📅 Data: {data}\n⏰ Horário: {hora}\n👨‍⚕️ Profissional: {profissional}\n💼 Serviço: {servico}\n📍 Unidade: {unidade}\n\n✅ Responda *Confirmar* para confirmar\n❌ Responda *Cancelar* para cancelar",
      tipo_envio: "24_horas_antes",
      horario_fixo: "18:00",
      delay_segundos: 50
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
    const webhookUrl = window.location.origin + "/api/webhookZAPI";
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

  const webhookUrl = window.location.origin + "/api/webhookZAPI";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to={createPageUrl("Administrador")}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">WhatsApp - Configuração</h1>
        </div>

        <Tabs defaultValue="config" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config">⚙️ Configuração</TabsTrigger>
            <TabsTrigger value="webhook">🔗 Webhook</TabsTrigger>
            <TabsTrigger value="teste">🧪 Teste</TabsTrigger>
          </TabsList>

          {/* ABA CONFIGURAÇÃO */}
          <TabsContent value="config" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>📋 Como Funciona</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Ative o WhatsApp para as unidades desejadas</li>
                  <li>Escolha o tipo de envio: 24 horas antes ou horário personalizado</li>
                  <li>Personalize a mensagem se desejar</li>
                  <li>Configure o webhook na aba "Webhook"</li>
                  <li>Os lembretes serão enviados automaticamente no dia anterior ao agendamento</li>
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
                        <Label>Tipo de envio:</Label>
                        <div className="flex gap-4 mt-2">
                          <label className="flex items-center gap-2">
                            <Switch 
                              checked={config.tipo_envio === '24_horas_antes'}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  updateConfig.mutate({ 
                                    id: config.id, 
                                    data: { tipo_envio: '24_horas_antes' } 
                                  });
                                }
                              }}
                            />
                            <span>24 horas antes (18h)</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <Switch 
                              checked={config.tipo_envio === 'horario_personalizado'}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  updateConfig.mutate({ 
                                    id: config.id, 
                                    data: { tipo_envio: 'horario_personalizado' } 
                                  });
                                }
                              }}
                            />
                            <span>Horário personalizado</span>
                          </label>
                        </div>
                      </div>

                      {config.tipo_envio === 'horario_personalizado' && (
                        <div>
                          <Label>⏰ HORÁRIO FIXO DE LEMBRETE</Label>
                          <Input
                            type="time"
                            value={config.horario_fixo || "18:00"}
                            onChange={(e) => updateConfig.mutate({ 
                              id: config.id, 
                              data: { horario_fixo: e.target.value } 
                            })}
                            disabled={config.ativo}
                            className="mt-1 max-w-xs"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {config.ativo 
                              ? "⚠️ Desative o WhatsApp para alterar o horário"
                              : "Este horário será usado todos os dias para enviar lembretes do dia seguinte"}
                          </p>
                        </div>
                      )}

                      <div>
                        <Label>⏱️ Delay entre Envios (segundos)</Label>
                        <Input
                          type="number"
                          min="10"
                          max="120"
                          value={config.delay_segundos || 50}
                          onChange={(e) => {
                            const valor = parseInt(e.target.value, 10);
                            if (!isNaN(valor) && valor >= 10 && valor <= 120) {
                              updateConfig.mutate({ 
                                id: config.id, 
                                data: { delay_segundos: valor } 
                              });
                            }
                          }}
                          className="mt-1 max-w-xs"
                        />
                        <p className="text-xs text-gray-500 mt-1">Tempo de espera entre cada mensagem</p>
                      </div>

                      <div>
                        <Label>📝 Mensagem Padrão:</Label>
                        <Textarea
                          value={mensagensEditaveis[config.id] !== undefined 
                            ? mensagensEditaveis[config.id] 
                            : config.mensagem_template}
                          onChange={(e) => setMensagensEditaveis(prev => ({
                            ...prev,
                            [config.id]: e.target.value
                          }))}
                          rows={8}
                          className="font-mono text-sm mt-1"
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
                  <h4 className="font-semibold mb-2">📋 Como configurar na Z-API:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Acesse o painel da <strong>Z-API</strong></li>
                    <li>Clique em sua instância de WhatsApp</li>
                    <li>Vá em <strong>Webhooks</strong></li>
                    <li>Procure por <strong>"Ao receber"</strong></li>
                    <li>Cole a URL acima</li>
                    <li>Salve as configurações</li>
                  </ol>
                </div>

                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">✅ Funcionamento:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Cliente responde "Confirmar" → agendamento confirmado</li>
                    <li>Cliente responde "Cancelar" → agendamento cancelado</li>
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
                  <Label>Telefone (ex: 5511999999999)</Label>
                  <Input
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="5511999999999"
                  />
                </div>

                <div>
                  <Label>Mensagem</Label>
                  <Textarea
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    placeholder="Digite a mensagem..."
                    rows={4}
                  />
                </div>

                <Button 
                  onClick={enviarMensagem} 
                  disabled={testando}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {testando ? "Enviando..." : "Enviar WhatsApp"}
                </Button>

                {resultado && (
                  <div className={`p-4 rounded-lg ${resultado.sucesso ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}`}>
                    {resultado.sucesso ? (
                      <div className="space-y-2">
                        <div className="text-green-800 font-bold text-lg flex items-center gap-2">
                          <Check className="h-5 w-5" /> Enviado!
                        </div>
                        <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                          {JSON.stringify(resultado.dados, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-red-800 font-bold text-lg flex items-center gap-2">
                          <AlertCircle className="h-5 w-5" /> Erro
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
                  Teste o envio para um número específico
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