import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, FileText, AlertCircle } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { format } from "date-fns";

export default function RelatorioErrosImportacaoPage() {
  const [user, setUser] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: erros = [], isLoading } = useQuery({
    queryKey: ['erros-importacao'],
    queryFn: () => base44.entities.ErroImportacaoLead.list('-created_date', 1000),
    initialData: [],
  });

  const errosFiltrados = erros.filter(erro => {
    const tipoMatch = filtroTipo === "todos" || erro.tipo_erro === filtroTipo;
    
    let dataMatch = true;
    if (filtroDataInicio || filtroDataFim) {
      const dataErro = new Date(erro.created_date);
      if (filtroDataInicio) {
        const dataInicio = new Date(filtroDataInicio);
        dataMatch = dataMatch && dataErro >= dataInicio;
      }
      if (filtroDataFim) {
        const dataFim = new Date(filtroDataFim);
        dataFim.setHours(23, 59, 59);
        dataMatch = dataMatch && dataErro <= dataFim;
      }
    }
    
    return tipoMatch && dataMatch;
  });

  const exportarCSV = () => {
    const headers = ['Data', 'Usuário', 'Nome Lead', 'Telefone', 'Tipo Erro', 'Mensagem', 'Linha'];
    const rows = errosFiltrados.map(erro => [
      format(new Date(erro.created_date), 'dd/MM/yyyy HH:mm'),
      erro.usuario_email,
      erro.nome_lead || '-',
      erro.telefone_lead || '-',
      erro.tipo_erro,
      erro.mensagem_erro,
      erro.numero_linha || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `erros_importacao_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const tipoErroLabels = {
    telefone_invalido: "Telefone Inválido",
    nome_vazio: "Nome Vazio",
    vendedor_nao_encontrado: "Vendedor Não Encontrado",
    unidade_nao_encontrada: "Unidade Não Encontrada",
    lead_duplicado: "Lead Duplicado",
    erro_criacao: "Erro ao Criar",
    outro: "Outro"
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'gerente')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <p className="text-center text-red-600">Acesso restrito a administradores</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Administrador')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Relatório de Erros de Importação</h1>
              <p className="text-sm text-gray-500">Visualize e analise erros de importação de leads</p>
            </div>
          </div>
          <Button onClick={exportarCSV} disabled={errosFiltrados.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Erros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{erros.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Erros Filtrados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{errosFiltrados.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Tipo Mais Comum</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-semibold text-gray-900">
                {erros.length > 0 
                  ? tipoErroLabels[Object.entries(
                      erros.reduce((acc, e) => {
                        acc[e.tipo_erro] = (acc[e.tipo_erro] || 0) + 1;
                        return acc;
                      }, {})
                    ).sort((a, b) => b[1] - a[1])[0]?.[0]] || '-'
                  : '-'
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Tipo de Erro</Label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="telefone_invalido">Telefone Inválido</SelectItem>
                    <SelectItem value="nome_vazio">Nome Vazio</SelectItem>
                    <SelectItem value="vendedor_nao_encontrado">Vendedor Não Encontrado</SelectItem>
                    <SelectItem value="unidade_nao_encontrada">Unidade Não Encontrada</SelectItem>
                    <SelectItem value="lead_duplicado">Lead Duplicado</SelectItem>
                    <SelectItem value="erro_criacao">Erro ao Criar</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data Início</Label>
                <Input 
                  type="date" 
                  value={filtroDataInicio}
                  onChange={(e) => setFiltroDataInicio(e.target.value)}
                />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input 
                  type="date" 
                  value={filtroDataFim}
                  onChange={(e) => setFiltroDataFim(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Erros */}
        <Card>
          <CardHeader>
            <CardTitle>Erros Registrados ({errosFiltrados.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {errosFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500">Nenhum erro encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Nome Lead</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead className="text-center">Linha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errosFiltrados.map((erro) => (
                      <TableRow key={erro.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(erro.created_date), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{erro.usuario_email}</TableCell>
                        <TableCell>{erro.nome_lead || '-'}</TableCell>
                        <TableCell className="whitespace-nowrap">{erro.telefone_lead || '-'}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertCircle className="h-3 w-3" />
                            {tipoErroLabels[erro.tipo_erro]}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={erro.mensagem_erro}>
                          {erro.mensagem_erro}
                        </TableCell>
                        <TableCell className="text-center">{erro.numero_linha || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}