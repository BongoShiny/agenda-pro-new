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
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const user = await base44.auth.me();
        setUsuarioAtual(user);
        const isAdmin = user?.cargo === "administrador" || user?.cargo === "superior" || user?.role === "admin";
        if (!isAdmin) {
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
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Configuração da API:</strong> Configure as variáveis WHATSAPP_API_URL, WHATSAPP_API_TOKEN e WHATSAPP_INSTANCE_NAME no Dashboard → Settings.
            <br /><strong>Webhook:</strong> Configure sua API de WhatsApp para enviar respostas para: <code className="bg-blue-100 px-2 py-1 rounded">/webhookWhatsApp</code>
          </AlertDescription>
        </Alert>

        <Alert className="bg-amber-50 border-amber-200">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Horários de envio:</strong> Os lembretes são enviados em horário de Brasília, 1 dia e/ou 12 horas antes do agendamento.
            <br /><strong>Automação:</strong> Para envio automático, configure um cron job no Dashboard para chamar a função <code className="bg-amber-100 px-2 py-1 rounded">enviarLembreteWhatsApp</code> a cada hora.
          </AlertDescription>
        </Alert>

        {unidades.map(unidade => {
          const config = configuracoes.find(c => c.unidade_id === unidade.id);
          const [mensagemEditavel, setMensagemEditavel] = useState(config?.mensagem_template || mensagemPadrao);

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
                      onChange={(e) => setMensagemEditavel(e.target.value)}
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