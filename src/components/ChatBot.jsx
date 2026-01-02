import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ChatBot({ usuarioAtual }) {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState([
    {
      tipo: "bot",
      texto: "👋 Olá! Sou o assistente virtual. Posso te ajudar com:\n\n• Status de agendamentos\n• Informações sobre pacotes\n• Detalhes de serviços\n• Dúvidas sobre sessões\n\nComo posso ajudar?",
      timestamp: new Date()
    }
  ]);
  const [pergunta, setPergunta] = useState("");
  const [processando, setProcessando] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  const buscarContextoUsuario = async () => {
    try {
      // Buscar agendamentos do usuário
      const hoje = new Date();
      const dataAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
      
      const agendamentos = await base44.entities.Agendamento.filter({
        cliente_nome: usuarioAtual?.full_name
      });

      // Buscar pacotes ativos
      const pacotesAtivos = agendamentos.filter(ag => 
        ag.cliente_pacote === "Sim" && 
        (ag.sessoes_feitas || 0) < (ag.quantas_sessoes || 0)
      );

      // Buscar próximos agendamentos
      const proximosAgendamentos = agendamentos.filter(ag => 
        ag.data >= dataAtual && ag.status !== "cancelado" && ag.status !== "concluido"
      ).slice(0, 5);

      // Buscar todos os serviços
      const servicos = await base44.entities.Servico.list("nome");

      return {
        agendamentos: proximosAgendamentos,
        pacotes: pacotesAtivos,
        servicos: servicos,
        nomeUsuario: usuarioAtual?.full_name || "Usuário"
      };
    } catch (error) {
      console.error("Erro ao buscar contexto:", error);
      return null;
    }
  };

  const enviarMensagem = async () => {
    if (!pergunta.trim() || processando) return;

    const novaPergunta = pergunta.trim();
    setPergunta("");

    // Adicionar pergunta do usuário
    setMensagens(prev => [...prev, {
      tipo: "usuario",
      texto: novaPergunta,
      timestamp: new Date()
    }]);

    setProcessando(true);

    try {
      // Buscar contexto do usuário
      const contexto = await buscarContextoUsuario();

      // Montar prompt com contexto
      let promptContexto = `Você é um assistente virtual de uma clínica de terapias. O usuário ${contexto?.nomeUsuario} está fazendo uma pergunta.\n\n`;
      
      if (contexto?.agendamentos?.length > 0) {
        promptContexto += `PRÓXIMOS AGENDAMENTOS DO USUÁRIO:\n`;
        contexto.agendamentos.forEach(ag => {
          promptContexto += `- ${format(new Date(ag.data + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })} às ${ag.hora_inicio} com ${ag.profissional_nome} (${ag.servico_nome}) - Status: ${ag.status}\n`;
        });
        promptContexto += `\n`;
      }

      if (contexto?.pacotes?.length > 0) {
        promptContexto += `PACOTES ATIVOS DO USUÁRIO:\n`;
        contexto.pacotes.forEach(pac => {
          const sessoeRestantes = (pac.quantas_sessoes || 0) - (pac.sessoes_feitas || 0);
          promptContexto += `- Pacote de ${pac.servico_nome}: ${pac.sessoes_feitas || 0}/${pac.quantas_sessoes || 0} sessões realizadas (${sessoeRestantes} restantes)\n`;
        });
        promptContexto += `\n`;
      }

      if (contexto?.servicos?.length > 0) {
        promptContexto += `SERVIÇOS DISPONÍVEIS:\n`;
        contexto.servicos.slice(0, 10).forEach(s => {
          promptContexto += `- ${s.nome} (${s.duracao_minutos} minutos)\n`;
        });
        promptContexto += `\n`;
      }

      promptContexto += `PERGUNTA DO USUÁRIO: ${novaPergunta}\n\n`;
      promptContexto += `Responda de forma clara, amigável e concisa. Use emojis quando apropriado. Se não tiver informação específica, oriente o usuário a entrar em contato com a recepção.`;

      // Chamar IA
      const resposta = await base44.integrations.Core.InvokeLLM({
        prompt: promptContexto,
        add_context_from_internet: false
      });

      // Adicionar resposta do bot
      setMensagens(prev => [...prev, {
        tipo: "bot",
        texto: resposta,
        timestamp: new Date()
      }]);

    } catch (error) {
      console.error("Erro ao processar mensagem:", error);
      setMensagens(prev => [...prev, {
        tipo: "bot",
        texto: "❌ Desculpe, ocorreu um erro ao processar sua pergunta. Por favor, tente novamente ou entre em contato com a recepção.",
        timestamp: new Date()
      }]);
    } finally {
      setProcessando(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensagem();
    }
  };

  if (!aberto) {
    return (
      <Button
        onClick={() => setAberto(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 z-50"
        size="icon"
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold">Assistente Virtual</h3>
            <p className="text-xs text-blue-100">Online</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setAberto(false)}
          className="text-white hover:bg-white/20"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {mensagens.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-2 ${msg.tipo === 'usuario' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.tipo === 'bot' && (
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                msg.tipo === 'usuario'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.texto}</p>
              <p className={`text-xs mt-1 ${msg.tipo === 'usuario' ? 'text-blue-100' : 'text-gray-500'}`}>
                {format(msg.timestamp, "HH:mm")}
              </p>
            </div>
            {msg.tipo === 'usuario' && (
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        ))}
        {processando && (
          <div className="flex gap-2 justify-start">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200 rounded-b-2xl">
        <div className="flex gap-2">
          <Input
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua pergunta..."
            className="flex-1"
            disabled={processando}
          />
          <Button
            onClick={enviarMensagem}
            disabled={!pergunta.trim() || processando}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}