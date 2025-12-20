import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, MessageCircle, AlertCircle, Send, Clock } from "lucide-react";

export default function ConfiguracaoWhatsAppPage() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [testando, setTestando] = useState(false);
  const [mensagensEditaveis, setMensagensEditaveis] = useState({});
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const user = await base44.auth.me();
        setUsuarioAtual(user);
        // Apenas superior tem acesso
        const isSuperior = user?.cargo === "superior" || user?.role === "admin";
        if (!isSuperior) {
          navigate(createPageUrl("Agenda"));
        }
      } catch (error) {
        navigate(createPageUrl("Agenda"));
      } finally {
        setCarregando(false);
      }
    };
    carregarUsuario();
  }, [navigate]);

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
  });

  const { data: configuracoes = [] } = useQuery({
    queryKey: ['configuracoes-whatsapp'],
    queryFn: () => base44.entities.ConfiguracaoWhatsApp.list("unidade_nome"),
    initialData: [],
  });

  const criarConfiguracaoMutation = useMutation({
    mutationFn: (dados) => base44.entities.ConfiguracaoWhatsApp.create(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-whatsapp'] });
    },
  });

  const atualizarConfiguracaoMutation = useMutation({
    mutationFn: ({ id, dados }) => base44.entities.ConfiguracaoWhatsApp.update(id, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-whatsapp'] });
    },
  });

  const handleToggleAtivo = async (config) => {
    await atualizarConfiguracaoMutation.mutateAsync({
      id: config.id,
      dados: { ativo: !config.ativo }
    });
  };

  const handleSalvarMensagem = async (config, novaMensagem) => {
    await atualizarConfiguracaoMutation.mutateAsync({
      id: config.id,
      dados: { mensagem_template: novaMensagem }
    });
    alert("✅ Mensagem atualizada!");
  };

  const handleToggleHorario = async (config, campo) => {
    await atualizarConfiguracaoMutation.mutateAsync({
      id: config.id,
      dados: { [campo]: !config[campo] }
    });
  };

  const handleCriarConfiguracao = async (unidadeId) => {
    const unidade = unidades.find(u => u.id === unidadeId);
    await criarConfiguracaoMutation.mutateAsync({
      unidade_id: unidadeId,
      unidade_nome: unidade.nome,
      ativo: false,
      enviar_1_dia: true,
      enviar_12_horas: true,
      mensagem_template: "Olá {cliente}! 🗓️\n\nLembramos que você tem um agendamento:\n\n📅 Data: {data}\n⏰ Horário: {hora}\n👨‍⚕️ Profissional: {profissional}\n💼 Serviço: {servico}\n📍 Unidade: {unidade}\n\n✅ Responda *Confirmar* para confirmar\n❌ Responda *Cancelar* para cancelar"
    });
    alert("✅ Configuração criada!");
  };

  const handleTestarEnvio = async () => {
    setTestando(true);
    try {
      const response = await base44.functions.invoke('enviarLembreteWhatsApp', {});
      alert(`✅ Teste concluído!\n\nMensagens enviadas: ${response.data.mensagensEnviadas || 0}`);
    } catch (error) {
      alert(`❌ Erro no teste: ${error.message}`);
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

  const mensagemPadrao = "Olá {cliente}! 🗓️\n\nLembramos que você tem um agendamento:\n\n📅 Data: {data}\n⏰ Horário: {hora}\n👨‍⚕️ Profissional: {profissional}\n💼 Serviço: {servico}\n📍 Unidade: {unidade}\n\n✅ Responda *Confirmar* para confirmar\n❌ Responda *Cancelar* para cancelar";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link to={createPageUrl("Administrador")}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configuração WhatsApp</h1>
              <p className="text-sm text-gray-500">Lembretes automáticos e confirmações via WhatsApp</p>
            </div>
          </div>
          <Button onClick={handleTestarEnvio} disabled={testando} className="bg-blue-600 hover:bg-blue-700">
            <Send className="w-4 h-4 mr-2" />
            {testando ? "Testando..." : "Testar Envio"}
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <Card className="border-2 border-blue-500 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Passo 1: Configure os Secrets da API do WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-blue-800">
              Vá até o <strong>Dashboard → Settings → Application Secrets</strong> e adicione os seguintes secrets:
            </p>
            
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white rounded px-2 py-1 text-xs font-bold">1</div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">WHATSAPP_API_URL</p>
                    <p className="text-sm text-gray-600 mt-1">
                      URL da sua API de WhatsApp (exemplo: Evolution API, Twilio, etc)
                    </p>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 block">
                      Exemplo Evolution API: https://sua-api.com/message/sendText
                    </code>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white rounded px-2 py-1 text-xs font-bold">2</div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">WHATSAPP_API_TOKEN</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Token de autenticação da sua API de WhatsApp
                    </p>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 block">
                      Exemplo: seu-token-secreto-aqui
                    </code>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white rounded px-2 py-1 text-xs font-bold">3</div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">WHATSAPP_INSTANCE_NAME</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Nome da instância do WhatsApp (se usar Evolution API)
                    </p>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 block">
                      Exemplo: clinica
                    </code>
                  </div>
                </div>
              </div>
            </div>

            <Alert className="bg-white border-blue-300">
              <MessageCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>APIs compatíveis:</strong> Evolution API, Twilio WhatsApp API, ou qualquer API que aceite envio de mensagens via HTTP POST.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-500 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-900 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Passo 2: Configure o Webhook para Receber Respostas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-800 mb-4">
              Configure sua API de WhatsApp para enviar as respostas dos clientes para:
            </p>
            <div className="bg-white p-4 rounded-lg border border-green-300">
              <code className="text-sm font-mono text-green-900">
                {window.location.origin}/functions/webhookWhatsApp
              </code>
            </div>
            <p className="text-sm text-green-700 mt-3">
              ✅ Quando o cliente responder "Confirmar" ou "Cancelar", o sistema atualizará automaticamente o agendamento.
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-500 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Passo 3: Configure Envio Automático (Opcional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-800 mb-3">
              Os lembretes são enviados em <strong>horário de Brasília</strong>, 1 dia e/ou 12 horas antes do agendamento.
            </p>
            <p className="text-amber-800 mb-4">
              Para envio automático, configure um <strong>Cron Job</strong> no Dashboard para chamar a função:
            </p>
            <div className="bg-white p-4 rounded-lg border border-amber-300">
              <code className="text-sm font-mono text-amber-900">
                enviarLembreteWhatsApp
              </code>
            </div>
            <p className="text-sm text-amber-700 mt-3">
              💡 Recomendado: Execute a cada hora (0 */1 * * *) para garantir o envio no horário correto.
            </p>
          </CardContent>
        </Card>

        {unidades.map(unidade => {
          const config = configuracoes.find(c => c.unidade_id === unidade.id);
          const mensagemEditavel = mensagensEditaveis[unidade.id] || config?.mensagem_template || mensagemPadrao;

          return (
            <Card key={unidade.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{unidade.nome}</span>
                  {config ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Ativo</span>
                      <Switch checked={config.ativo} onCheckedChange={() => handleToggleAtivo(config)} />
                    </div>
                  ) : (
                    <Button onClick={() => handleCriarConfiguracao(unidade.id)} size="sm">
                      Ativar WhatsApp
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>

              {config && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-600" />
                        <span className="text-sm">Lembrete 1 dia antes</span>
                      </div>
                      <Switch 
                        checked={config.enviar_1_dia} 
                        onCheckedChange={() => handleToggleHorario(config, 'enviar_1_dia')} 
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-600" />
                        <span className="text-sm">Lembrete 12 horas antes</span>
                      </div>
                      <Switch 
                        checked={config.enviar_12_horas} 
                        onCheckedChange={() => handleToggleHorario(config, 'enviar_12_horas')} 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Mensagem Personalizada</Label>
                    <Textarea
                      value={mensagemEditavel}
                      onChange={(e) => setMensagensEditaveis(prev => ({ ...prev, [unidade.id]: e.target.value }))}
                      rows={10}
                      className="font-mono text-sm"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        Use: {"{cliente}"}, {"{profissional}"}, {"{data}"}, {"{hora}"}, {"{unidade}"}, {"{servico}"}
                      </p>
                      <Button 
                        onClick={() => handleSalvarMensagem(config, mensagemEditavel)}
                        size="sm"
                        variant="outline"
                      >
                        Salvar Mensagem
                      </Button>
                    </div>
                  </div>

                  <Alert>
                    <MessageCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Exemplo de mensagem:</strong>
                      <pre className="mt-2 p-2 bg-gray-50 rounded text-xs whitespace-pre-wrap">
                        {mensagemEditavel
                          .replace('{cliente}', 'João Silva')
                          .replace('{profissional}', 'Dr. Maria')
                          .replace('{data}', '25/12/2025')
                          .replace('{hora}', '14:00')
                          .replace('{unidade}', unidade.nome)
                          .replace('{servico}', 'Fisioterapia')}
                      </pre>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}