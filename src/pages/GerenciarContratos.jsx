import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Search, Eye, Download } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const criarDataPura = (dataString) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

export default function GerenciarContratosPage() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [pesquisa, setPesquisa] = useState("");
  const [contratoVisualizando, setContratoVisualizando] = useState(null);
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
        } else {
          // Registrar entrada
          await base44.entities.LogAcao.create({
            tipo: "acessou_relatorios",
            usuario_email: user.email,
            descricao: "Entrou na área de Gerenciar Contratos Termo 30%",
            entidade_tipo: "Agendamento"
          });
        }
      } catch (error) {
        navigate(createPageUrl("Agenda"));
      } finally {
        setCarregando(false);
      }
    };
    carregarUsuario();

    return () => {
      if (usuarioAtual) {
        base44.entities.LogAcao.create({
          tipo: "acessou_relatorios",
          usuario_email: usuarioAtual.email,
          descricao: "Saiu da área de Gerenciar Contratos Termo 30%",
          entidade_tipo: "Agendamento"
        }).catch(err => console.error("Erro ao registrar saída:", err));
      }
    };
  }, [navigate]);

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-contratos'],
    queryFn: () => base44.entities.Agendamento.list("-data"),
    initialData: [],
  });

  // Filtrar apenas agendamentos com contrato
  const agendamentosComContrato = agendamentos.filter(ag => 
    ag.contrato_termo_url && 
    ag.status !== "bloqueio" && 
    ag.tipo !== "bloqueio" && 
    ag.cliente_nome !== "FECHADO"
  );

  // Função de pesquisa
  const filtrarContratos = () => {
    if (!pesquisa) return agendamentosComContrato;
    const termo = pesquisa.toLowerCase();
    return agendamentosComContrato.filter(ag =>
      ag.cliente_nome?.toLowerCase().includes(termo) ||
      ag.cliente_telefone?.toLowerCase().includes(termo) ||
      ag.unidade_nome?.toLowerCase().includes(termo) ||
      ag.profissional_nome?.toLowerCase().includes(termo)
    );
  };

  const handleVisualizar = (ag) => {
    setContratoVisualizando(ag);
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
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Contratos Termo 30%</h1>
              <p className="text-sm text-gray-500">Visualize todos os contratos de termo 30% multa assinados</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Pesquisar por nome, telefone, unidade ou profissional..."
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {filtrarContratos().length} contrato{filtrarContratos().length !== 1 ? 's' : ''}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-600" />
              Contratos Termo 30% Multa Anexados
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
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrarContratos().map(ag => (
                  <TableRow key={ag.id}>
                    <TableCell>
                      {format(criarDataPura(ag.data), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">{ag.cliente_nome}</TableCell>
                    <TableCell>{ag.cliente_telefone || "-"}</TableCell>
                    <TableCell>{ag.profissional_nome}</TableCell>
                    <TableCell>{ag.unidade_nome}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVisualizar(ag)}
                          className="border-blue-600 text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
                        </Button>
                        <a 
                          href={ag.contrato_termo_url} 
                          download={`Contrato_${ag.cliente_nome}_${ag.data}.pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-600 text-green-700 hover:bg-green-50"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Baixar
                          </Button>
                        </a>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filtrarContratos().length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="font-medium">Nenhum contrato encontrado</p>
                <p className="text-sm mt-1">
                  {pesquisa 
                    ? "Tente ajustar sua pesquisa" 
                    : "Nenhum contrato termo 30% foi anexado ainda"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog Visualizar Contrato */}
      <Dialog open={!!contratoVisualizando} onOpenChange={() => setContratoVisualizando(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-600" />
              Contrato Termo 30% Multa - {contratoVisualizando?.cliente_nome}
            </DialogTitle>
          </DialogHeader>

          {contratoVisualizando && (
            <div className="space-y-4 py-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-orange-900">Cliente:</span>
                    <p className="text-orange-800">{contratoVisualizando.cliente_nome}</p>
                  </div>
                  <div>
                    <span className="font-medium text-orange-900">Telefone:</span>
                    <p className="text-orange-800">{contratoVisualizando.cliente_telefone || "-"}</p>
                  </div>
                  <div>
                    <span className="font-medium text-orange-900">Data:</span>
                    <p className="text-orange-800">{format(criarDataPura(contratoVisualizando.data), "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                  <div>
                    <span className="font-medium text-orange-900">Profissional:</span>
                    <p className="text-orange-800">{contratoVisualizando.profissional_nome}</p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
                <iframe
                  src={contratoVisualizando.contrato_termo_url}
                  className="w-full h-[60vh]"
                  title="Contrato"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setContratoVisualizando(null)}>
                  Fechar
                </Button>
                <a 
                  href={contratoVisualizando.contrato_termo_url} 
                  download={`Contrato_${contratoVisualizando.cliente_nome}_${contratoVisualizando.data}.pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Contrato
                  </Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}