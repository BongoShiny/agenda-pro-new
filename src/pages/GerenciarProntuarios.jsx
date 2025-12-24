import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Download, Search, CheckCircle, XCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const criarDataPura = (dataString) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

export default function GerenciarProntuariosPage() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [pesquisa, setPesquisa] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const user = await base44.auth.me();
        setUsuarioAtual(user);
        
        const temAcesso = user?.cargo === "administrador" || 
                         user?.cargo === "superior" || 
                         user?.role === "admin" || 
                         user?.cargo === "gerencia_unidades" ||
                         user?.cargo === "financeiro";
        
        if (!temAcesso) {
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

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-prontuarios'],
    queryFn: () => base44.entities.Agendamento.list("-data"),
    initialData: [],
  });

  const { data: prontuarios = [] } = useQuery({
    queryKey: ['prontuarios'],
    queryFn: () => base44.entities.Prontuario.list("-created_date"),
    initialData: [],
  });

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades-prontuarios'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
  });

  // Filtrar agendamentos não bloqueados
  const agendamentosValidos = agendamentos.filter(ag => 
    ag.status !== "bloqueio" && ag.tipo !== "bloqueio" && ag.cliente_nome !== "FECHADO"
  );

  // Separar agendamentos com e sem prontuário
  const agendamentosComProntuario = agendamentosValidos.filter(ag =>
    prontuarios.some(p => p.agendamento_id === ag.id)
  );

  const agendamentosSemProntuario = agendamentosValidos.filter(ag =>
    !prontuarios.some(p => p.agendamento_id === ag.id)
  );

  // Função de pesquisa
  const filtrarAgendamentos = (lista) => {
    if (!pesquisa) return lista;
    const termo = pesquisa.toLowerCase();
    return lista.filter(ag =>
      ag.cliente_nome?.toLowerCase().includes(termo) ||
      ag.cliente_telefone?.toLowerCase().includes(termo) ||
      ag.unidade_nome?.toLowerCase().includes(termo)
    );
  };

  const exportarProntuario = (agendamento) => {
    const prontuario = prontuarios.find(p => p.agendamento_id === agendamento.id);
    if (!prontuario) return;

    const dataFormatada = format(criarDataPura(agendamento.data), "dd/MM/yyyy", { locale: ptBR });
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Prontuário - ${agendamento.cliente_nome}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              background: #fff;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              border: 8px solid #7C5746;
              padding: 40px;
              background: white;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #7C5746;
            }
            .logo {
              width: 150px;
              height: auto;
              margin-bottom: 15px;
            }
            .title {
              color: #7C5746;
              font-size: 28px;
              font-weight: bold;
              margin: 10px 0;
            }
            .subtitle {
              color: #7C5746;
              font-size: 14px;
              font-style: italic;
            }
            .info-section {
              background: #f9f5f3;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 25px;
              border-left: 4px solid #7C5746;
            }
            .info-row {
              display: flex;
              margin-bottom: 10px;
            }
            .info-label {
              font-weight: bold;
              color: #7C5746;
              min-width: 150px;
            }
            .info-value {
              color: #333;
            }
            .field-section {
              margin-bottom: 25px;
              padding-bottom: 20px;
              border-bottom: 1px solid #e0d5d0;
            }
            .field-label {
              font-weight: bold;
              color: #7C5746;
              font-size: 14px;
              margin-bottom: 8px;
              display: block;
            }
            .field-value {
              color: #333;
              line-height: 1.6;
              white-space: pre-wrap;
              padding: 10px;
              background: #f9f5f3;
              border-radius: 4px;
              min-height: 40px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 3px solid #7C5746;
              text-align: center;
              color: #7C5746;
              font-size: 12px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f9217a0dea005bde3c1cc0/e271e046f_image.png" alt="Logo Vibi Terapias" class="logo" />
              <div class="title">FICHA DE PRONTUÁRIO</div>
              <div class="subtitle">Clínica especializada em Dor</div>
            </div>

            <div class="info-section">
              <div class="info-row">
                <span class="info-label">Paciente:</span>
                <span class="info-value">${agendamento.cliente_nome}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Telefone:</span>
                <span class="info-value">${agendamento.cliente_telefone || "-"}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Profissional:</span>
                <span class="info-value">${agendamento.profissional_nome}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Unidade:</span>
                <span class="info-value">${agendamento.unidade_nome}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Data da Sessão:</span>
                <span class="info-value">${dataFormatada}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Horário:</span>
                <span class="info-value">${agendamento.hora_inicio} - ${agendamento.hora_fim}</span>
              </div>
            </div>

            <div class="field-section">
              <span class="field-label">TERAPIA FEITA:</span>
              <div class="field-value">${prontuario.terapia_feita || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">MÚSCULO LIBERADO:</span>
              <div class="field-value">${prontuario.musculo_liberado || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">SUGESTÕES PARA PRÓXIMA SESSÃO:</span>
              <div class="field-value">${prontuario.sugestoes_proxima_sessao || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">OBSERVAÇÕES:</span>
              <div class="field-value">${prontuario.observacoes || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">RELATO DO TERAPEUTA SOBRE A SESSÃO:</span>
              <div class="field-value">${prontuario.relato_terapeuta || "-"}</div>
            </div>

            <div class="field-section">
              <span class="field-label">QUAL A SESSÃO DO PLANO TERAPÊUTICO:</span>
              <div class="field-value">${prontuario.sessao_plano_terapeutico || "-"}</div>
            </div>

            <div class="footer">
              <p><strong>Vibi Terapias</strong> - Clínica especializada em Dor</p>
              <p>Prontuário gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            </div>
          </div>

          <button class="no-print" onclick="window.print()" style="
            position: fixed;
            bottom: 30px;
            right: 30px;
            padding: 15px 30px;
            background: #7C5746;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
          ">
            🖨️ Imprimir / Salvar como PDF
          </button>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to={createPageUrl("Administrador")}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Prontuários</h1>
              <p className="text-sm text-gray-500">Visualize e exporte prontuários de clientes</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Pesquisar por nome, telefone ou unidade..."
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="com-prontuario" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="com-prontuario">
              Com Prontuário ({filtrarAgendamentos(agendamentosComProntuario).length})
            </TabsTrigger>
            <TabsTrigger value="sem-prontuario">
              Sem Prontuário ({filtrarAgendamentos(agendamentosSemProntuario).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="com-prontuario">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Agendamentos com Prontuário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrarAgendamentos(agendamentosComProntuario).map(ag => (
                      <TableRow key={ag.id}>
                        <TableCell>
                          {format(criarDataPura(ag.data), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium">{ag.cliente_nome}</TableCell>
                        <TableCell>{ag.cliente_telefone || "-"}</TableCell>
                        <TableCell>{ag.profissional_nome}</TableCell>
                        <TableCell>{ag.unidade_nome}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-700">
                            Preenchido
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => exportarProntuario(ag)}
                            className="border-amber-600 text-amber-700 hover:bg-amber-50"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Exportar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filtrarAgendamentos(agendamentosComProntuario).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="font-medium">Nenhum prontuário encontrado</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sem-prontuario">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-orange-600" />
                  Agendamentos sem Prontuário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrarAgendamentos(agendamentosSemProntuario).map(ag => (
                      <TableRow key={ag.id}>
                        <TableCell>
                          {format(criarDataPura(ag.data), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium">{ag.cliente_nome}</TableCell>
                        <TableCell>{ag.cliente_telefone || "-"}</TableCell>
                        <TableCell>{ag.profissional_nome}</TableCell>
                        <TableCell>{ag.unidade_nome}</TableCell>
                        <TableCell>
                          <Badge className="bg-orange-100 text-orange-700">
                            Pendente
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filtrarAgendamentos(agendamentosSemProntuario).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
                    <p className="font-medium">Todos os agendamentos têm prontuário!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}