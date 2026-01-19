import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Plus, Trash2, Settings, ArrowLeft } from "lucide-react";
import { format, addDays, isSaturday, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function ConfiguracaoSabadoPage() {
  const [dialogAberto, setDialogAberto] = useState(false);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState(null);
  const [dataSelecionada, setDataSelecionada] = useState(null);
  const [dataInicial, setDataInicial] = useState(null);
  const [dataFinal, setDataFinal] = useState(null);
  const [limiteAtendimentos, setLimiteAtendimentos] = useState(4);
  const [observacoes, setObservacoes] = useState("");
  const [modoEdicao, setModoEdicao] = useState(false);
  const [modoGeracao, setModoGeracao] = useState(false);
  const [configEditando, setConfigEditando] = useState(null);

  const queryClient = useQueryClient();

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
  });

  const { data: configuracoes = [] } = useQuery({
    queryKey: ['configuracoes-sabado'],
    queryFn: () => base44.entities.ConfiguracaoSabado.list("-data_sabado"),
    initialData: [],
  });

  const criarConfigMutation = useMutation({
    mutationFn: (dados) => base44.entities.ConfiguracaoSabado.create(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-sabado'] });
      setDialogAberto(false);
      resetForm();
    },
  });

  const atualizarConfigMutation = useMutation({
    mutationFn: ({ id, dados }) => base44.entities.ConfiguracaoSabado.update(id, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-sabado'] });
      setDialogAberto(false);
      resetForm();
    },
  });

  const deletarConfigMutation = useMutation({
    mutationFn: (id) => base44.entities.ConfiguracaoSabado.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-sabado'] });
    },
  });

  const resetForm = () => {
    setUnidadeSelecionada(null);
    setDataSelecionada(null);
    setDataInicial(null);
    setDataFinal(null);
    setLimiteAtendimentos(4);
    setObservacoes("");
    setModoEdicao(false);
    setModoGeracao(false);
    setConfigEditando(null);
  };

  const handleNovaConfig = () => {
    resetForm();
    setDialogAberto(true);
  };

  const handleEditarConfig = (config) => {
    setConfigEditando(config);
    setUnidadeSelecionada(config.unidade_id);
    setDataSelecionada(new Date(config.data_sabado + 'T12:00:00'));
    setLimiteAtendimentos(config.limite_atendimentos_por_hora);
    setObservacoes(config.observacoes || "");
    setModoEdicao(true);
    setDialogAberto(true);
  };

  const handleSalvar = () => {
    if (!unidadeSelecionada) {
      alert("⚠️ Selecione a unidade");
      return;
    }

    const unidade = unidades.find(u => u.id === unidadeSelecionada);

    // Modo geração em massa
    if (modoGeracao) {
      if (!dataInicial || !dataFinal) {
        alert("⚠️ Selecione a data inicial e final");
        return;
      }

      const sabados = [];
      let data = new Date(dataInicial);
      const fim = new Date(dataFinal);

      while (data <= fim) {
        if (isSaturday(data)) {
          sabados.push({
            unidade_id: unidadeSelecionada,
            unidade_nome: unidade.nome,
            data_sabado: format(data, "yyyy-MM-dd"),
            limite_atendimentos_por_hora: limiteAtendimentos,
            observacoes: observacoes,
            ativo: true
          });
        }
        data = addDays(data, 1);
      }

      if (sabados.length === 0) {
        alert("⚠️ Nenhum sábado encontrado no período selecionado");
        return;
      }

      if (!window.confirm(`Gerar configuração para ${sabados.length} sábado(s)?`)) return;

      Promise.all(sabados.map(sab => criarConfigMutation.mutateAsync(sab)))
        .then(() => {
          alert("✅ Configurações criadas com sucesso!");
          setDialogAberto(false);
          resetForm();
        })
        .catch(err => alert("❌ Erro: " + err.message));
      
      return;
    }

    // Modo criação/edição individual
    if (!dataSelecionada) {
      alert("⚠️ Selecione a data do sábado");
      return;
    }

    const dataFormatada = format(dataSelecionada, "yyyy-MM-dd");

    const dados = {
      unidade_id: unidadeSelecionada,
      unidade_nome: unidade.nome,
      data_sabado: dataFormatada,
      limite_atendimentos_por_hora: limiteAtendimentos,
      observacoes: observacoes,
      ativo: true
    };

    if (modoEdicao && configEditando) {
      atualizarConfigMutation.mutate({ id: configEditando.id, dados });
    } else {
      criarConfigMutation.mutate(dados);
    }
  };

  const handleDeletar = (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta configuração?")) return;
    deletarConfigMutation.mutate(id);
  };

  const gerarTodosSabadosAnoAtual = () => {
    if (!unidadeSelecionada) {
      alert("⚠️ Selecione uma unidade primeiro");
      return;
    }

    const unidade = unidades.find(u => u.id === unidadeSelecionada);
    const anoAtual = new Date().getFullYear();
    const sabados = [];
    let data = new Date(anoAtual, 0, 1); // 1 de janeiro do ano atual
    const fimAno = new Date(anoAtual, 11, 31); // 31 de dezembro do ano atual

    while (data <= fimAno) {
      if (isSaturday(data)) {
        sabados.push({
          unidade_id: unidadeSelecionada,
          unidade_nome: unidade.nome,
          data_sabado: format(data, "yyyy-MM-dd"),
          limite_atendimentos_por_hora: 4,
          ativo: true
        });
      }
      data = addDays(data, 1);
    }

    if (!window.confirm(`Gerar configuração para ${sabados.length} sábados de ${anoAtual}?`)) return;

    Promise.all(sabados.map(sab => criarConfigMutation.mutateAsync(sab)))
      .then(() => alert("✅ Configurações criadas com sucesso!"))
      .catch(err => alert("❌ Erro: " + err.message));
  };

  // Agrupar configurações por unidade
  const configsPorUnidade = unidades.map(unidade => ({
    unidade,
    configs: configuracoes.filter(c => c.unidade_id === unidade.id)
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Administrador")}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">⚙️ Configurar Sábados</h1>
          </div>
          <Button onClick={handleNovaConfig} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova Configuração
          </Button>
        </div>

        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="text-sm text-blue-900">
              <strong>ℹ️ Como funciona:</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Configure o limite de atendimentos por hora em cada sábado</li>
                <li>Quando o limite for atingido, os horários serão bloqueados automaticamente</li>
                <li>Gerência de unidades pode configurar limites diferentes para cada sábado</li>
                <li>Use "Gerar Todos os Sábados" para criar configurações rápidas</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {configsPorUnidade.map(({ unidade, configs }) => (
          <Card key={unidade.id} className="mb-4">
            <CardHeader className="bg-gray-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">🏢 {unidade.nome}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetForm();
                    setUnidadeSelecionada(unidade.id);
                    setModoGeracao(true);
                    setDialogAberto(true);
                  }}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Gerar Todos os Sábados {new Date().getFullYear()}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {configs.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Nenhuma configuração de sábado para esta unidade
                </div>
              ) : (
                <div className="space-y-2">
                  {configs.map(config => (
                    <div
                      key={config.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            📅 {format(new Date(config.data_sabado + 'T12:00:00'), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Limite: <strong>{config.limite_atendimentos_por_hora} atendimentos/hora</strong>
                          </div>
                          {config.observacoes && (
                            <div className="text-xs text-gray-500 mt-1">{config.observacoes}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditarConfig(config)}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletar(config.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modoEdicao ? "✏️ Editar Configuração" : modoGeracao ? "➕ Gerar Configurações de Sábados" : "➕ Nova Configuração de Sábado"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select 
                value={unidadeSelecionada} 
                onValueChange={setUnidadeSelecionada}
                disabled={modoEdicao || modoGeracao}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {unidades.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {modoGeracao ? (
              <>
                <div className="space-y-2">
                  <Label>Data Inicial</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataInicial ? format(dataInicial, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data inicial"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dataInicial}
                        onSelect={setDataInicial}
                        locale={ptBR}
                        disabled={(date) => date.getDay() !== 6}
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-gray-500">Selecione um sábado</p>
                </div>

                <div className="space-y-2">
                  <Label>Data Final</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataFinal ? format(dataFinal, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data final"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dataFinal}
                        onSelect={setDataFinal}
                        locale={ptBR}
                        disabled={(date) => date.getDay() !== 6}
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-gray-500">Todos os sábados entre as datas serão configurados</p>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>Data do Sábado</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataSelecionada ? format(dataSelecionada, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dataSelecionada}
                      onSelect={setDataSelecionada}
                      locale={ptBR}
                      disabled={(date) => date.getDay() !== 6}
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-gray-500">Apenas sábados podem ser selecionados</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Limite de Atendimentos por Hora</Label>
              <Input
                type="number"
                min="1"
                value={limiteAtendimentos}
                onChange={(e) => setLimiteAtendimentos(parseInt(e.target.value))}
                placeholder="Ex: 4"
              />
              <p className="text-xs text-gray-500">
                Quando atingir este limite, o horário será bloqueado automaticamente
              </p>
            </div>

            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Input
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Sábado com movimento reduzido"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} className="bg-blue-600 hover:bg-blue-700">
              {modoEdicao ? "Salvar Alterações" : modoGeracao ? "Gerar Configurações" : "Criar Configuração"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}