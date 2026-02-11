import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, UserPlus, Shield, User, Mail, Building2, AlertCircle, FileSpreadsheet, DollarSign, Check, X, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function GerenciarUsuariosPage() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [editandoNome, setEditandoNome] = useState(null);
  const [novoNome, setNovoNome] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroCargo, setFiltroCargo] = useState("");
  const [abaSelecionada, setAbaSelecionada] = useState("aprovados");
  const queryClient = useQueryClient();

  useEffect(() => {
    const carregarUsuario = async () => {
      const user = await base44.auth.me();
      setUsuarioAtual(user);
      
      // Se o usuário tem cargo superior mas não tem role admin, atualizar
      if (user.cargo === "superior" && user.role !== "admin") {
        try {
          await base44.entities.User.update(user.id, { role: "admin" });
          // Recarregar a página para aplicar as mudanças
          window.location.reload();
          return;
        } catch (error) {
          console.error("Erro ao atualizar role:", error);
        }
      }
      
      // Redirecionar se não for admin ou superior
      if (user.cargo !== "administrador" && user.cargo !== "superior" && user.role !== "admin") {
        window.location.href = createPageUrl("Agenda");
      }
    };
    carregarUsuario();
  }, []);

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const users = await base44.entities.User.list("full_name");
      
      // Garantir que todos os usuários com cargo "superior" tenham role="admin"
      for (const u of users) {
        if (u.cargo === "superior" && u.role !== "admin") {
          try {
            await base44.entities.User.update(u.id, { role: "admin" });
          } catch (error) {
            console.error(`Erro ao atualizar role do usuário ${u.email}:`, error);
          }
        }
      }
      
      return base44.entities.User.list("full_name");
    },
    initialData: [],
    enabled: !!usuarioAtual,
  });

  const usuariosAprovados = usuarios.filter(u => u.aprovado !== false);
  const usuariosPendentes = usuarios.filter(u => u.aprovado === false);
  const usuariosFiltrados = abaSelecionada === "aprovados" ? usuariosAprovados : usuariosPendentes;

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores'],
    queryFn: () => base44.entities.Vendedor.list("nome"),
    initialData: [],
  });

  const atualizarUsuarioMutation = useMutation({
    mutationFn: ({ id, dados }) => base44.entities.User.update(id, dados),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      await queryClient.refetchQueries({ queryKey: ['usuarios'] });
    },
  });

  const handleAtualizarCargo = async (usuario, novoCargo) => {
    const cargoAntigo = usuario.cargo || (usuario.role === "admin" ? "administrador" : "funcionario");
    
    // Se mudou para "vendedor", criar registro automaticamente
    if (novoCargo === "vendedor" && cargoAntigo !== "vendedor") {
      const vendedorExistente = vendedores.find(v => v.email === usuario.email);
      if (!vendedorExistente) {
        await base44.entities.Vendedor.create({
          nome: usuario.full_name,
          email: usuario.email,
          ativo: true,
          comissao_percentual: 0,
          valor_combinado_total: 0,
          valor_recebido_total: 0,
          a_receber_total: 0
        });
        queryClient.invalidateQueries({ queryKey: ['vendedores'] });
      }
    }
    
    // Se mudou para "superior", garantir que tem role admin
    const dadosAtualizacao = { cargo: novoCargo };
    if (novoCargo === "superior") {
      dadosAtualizacao.role = "admin";
    }
    
    await atualizarUsuarioMutation.mutateAsync({
      id: usuario.id,
      dados: dadosAtualizacao
    });
    
    // Registrar no log
    await base44.entities.LogAcao.create({
      tipo: "editou_usuario",
      usuario_email: usuarioAtual?.email,
      descricao: `Alterou cargo de ${usuario.full_name} (${usuario.email}) de "${cargoAntigo}" para "${novoCargo}"`,
      entidade_tipo: "Usuario",
      entidade_id: usuario.id,
      dados_antigos: JSON.stringify({ cargo: cargoAntigo }),
      dados_novos: JSON.stringify({ cargo: novoCargo })
    });
  };

  const handleToggleAtivo = async (usuario) => {
    const novoStatus = !usuario.ativo;
    await atualizarUsuarioMutation.mutateAsync({
      id: usuario.id,
      dados: { ativo: novoStatus }
    });
    
    // Registrar no log
    await base44.entities.LogAcao.create({
      tipo: "editou_usuario",
      usuario_email: usuarioAtual?.email,
      descricao: `${novoStatus ? "Ativou" : "Desativou"} usuário ${usuario.full_name} (${usuario.email})`,
      entidade_tipo: "Usuario",
      entidade_id: usuario.id,
      dados_antigos: JSON.stringify({ ativo: usuario.ativo }),
      dados_novos: JSON.stringify({ ativo: novoStatus })
    });
  };

  const handleAtualizarUnidades = async (usuario, unidadesIds) => {
    const unidadesAntigas = Array.isArray(usuario.unidades_acesso) ? usuario.unidades_acesso : [];
    await atualizarUsuarioMutation.mutateAsync({
      id: usuario.id,
      dados: { unidades_acesso: unidadesIds }
    });
    
    // Registrar no log
    const nomesUnidadesNovas = unidadesIds.map(id => unidades.find(u => u.id === id)?.nome).filter(Boolean);
    await base44.entities.LogAcao.create({
      tipo: "editou_usuario",
      usuario_email: usuarioAtual?.email,
      descricao: `Alterou unidades de acesso de ${usuario.full_name} (${usuario.email}) para: ${nomesUnidadesNovas.join(", ") || "Nenhuma"}`,
      entidade_tipo: "Usuario",
      entidade_id: usuario.id,
      dados_antigos: JSON.stringify({ unidades_acesso: unidadesAntigas }),
      dados_novos: JSON.stringify({ unidades_acesso: unidadesIds })
    });
  };

  const handleToggleUnidade = async (usuario, unidadeId) => {
    const unidadesAtuais = Array.isArray(usuario.unidades_acesso) ? usuario.unidades_acesso : [];
    const novasUnidades = unidadesAtuais.includes(unidadeId)
      ? unidadesAtuais.filter(id => id !== unidadeId)
      : [...unidadesAtuais, unidadeId];
    
    await handleAtualizarUnidades(usuario, novasUnidades);
  };

  const handleEditarNome = (usuario) => {
    setEditandoNome(usuario.id);
    setNovoNome(usuario.full_name);
  };

  const handleSalvarNome = async (usuario) => {
    const nomeFormatado = novoNome.trim();
    
    if (nomeFormatado === "") {
      alert("O nome não pode estar vazio");
      return;
    }

    try {
      // Salvar o nome exatamente como digitado (com maiúsculas, minúsculas e espaços)
      await atualizarUsuarioMutation.mutateAsync({
        id: usuario.id,
        dados: { full_name: nomeFormatado }
      });

      // Registrar no log
      await base44.entities.LogAcao.create({
        tipo: "editou_usuario",
        usuario_email: usuarioAtual?.email,
        descricao: `Alterou nome de "${usuario.full_name}" para "${nomeFormatado}" (${usuario.email})`,
        entidade_tipo: "Usuario",
        entidade_id: usuario.id,
        dados_antigos: JSON.stringify({ full_name: usuario.full_name }),
        dados_novos: JSON.stringify({ full_name: nomeFormatado })
      });

      // Se for o próprio usuário, recarregar usuário atual
      if (usuario.id === usuarioAtual.id) {
        const userAtualizado = await base44.auth.me();
        setUsuarioAtual(userAtualizado);
      }

      setEditandoNome(null);
      setNovoNome("");

      alert("✅ Nome atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar nome:", error);
      alert("Erro ao salvar nome: " + error.message);
    }
  };

  const handleCancelarEdicao = () => {
    setEditandoNome(null);
    setNovoNome("");
  };

  const handleAprovarUsuario = async (usuario) => {
    // Abrir modal para definir cargo
    setUsuarioParaConfigCargo(usuario);
    setCargoSelecionado(usuario.cargo || "");
    setUnidadesSelecionadas(usuario.unidades_acesso || []);
  };

  const [usuarioParaConfigCargo, setUsuarioParaConfigCargo] = useState(null);
  const [cargoSelecionado, setCargoSelecionado] = useState("");
  const [unidadesSelecionadas, setUnidadesSelecionadas] = useState([]);

  const handleRejeitar = async (usuario) => {
    const confirmar = window.confirm(`Deseja rejeitar o registro de ${usuario.full_name}? O usuário não poderá acessar o sistema.`);
    if (!confirmar) return;

    await base44.entities.User.delete(usuario.id);
    await queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    
    await base44.entities.LogAcao.create({
      tipo: "editou_usuario",
      usuario_email: usuarioAtual?.email,
      descricao: `Rejeitou novo usuário ${usuario.full_name} (${usuario.email})`,
      entidade_tipo: "Usuario",
      entidade_id: usuario.id,
      dados_antigos: JSON.stringify({ aprovado: false }),
      dados_novos: JSON.stringify({ rejeitado: true })
    });
  };

  const handleConfirmarCargo = async (usuario) => {
    if (!cargoSelecionado) {
      alert("Por favor, selecione um cargo!");
      return;
    }

    try {
      // Atualizar usuário com cargo e unidades
      await atualizarUsuarioMutation.mutateAsync({
        id: usuario.id,
        dados: {
          aprovado: true,
          cargo: cargoSelecionado,
          unidades_acesso: unidadesSelecionadas.length > 0 ? unidadesSelecionadas : []
        }
      });

      // Se for vendedor, criar registro automaticamente
      if (cargoSelecionado === "vendedor") {
        await base44.entities.Vendedor.create({
          nome: usuario.full_name,
          email: usuario.email
        });
      }

      await base44.entities.LogAcao.create({
        tipo: "editou_usuario",
        usuario_email: usuarioAtual?.email,
        descricao: `Aprovou usuário ${usuario.full_name} e definiu cargo como "${cargoSelecionado}"`,
        entidade_tipo: "Usuario",
        entidade_id: usuario.id
      });

      // Fechar modal e limpar
      setUsuarioParaConfigCargo(null);
      setCargoSelecionado("");
      setUnidadesSelecionadas([]);
      alert(`✅ Usuário ${usuario.full_name} aprovado com sucesso!`);
    } catch (error) {
      alert("Erro ao aprovar usuário: " + error.message);
    }
  };

  if (!usuarioAtual) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Agenda")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gerenciar Usuários</h1>
              <p className="text-gray-500 mt-1">Gerencie os acessos e permissões dos usuários do sistema</p>
            </div>
          </div>
        </div>

        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Novos usuários:</strong> Usuários que se registram aparecem na aba "Pendentes de Aprovação" e precisam ser aprovados para acessar o sistema.
          </AlertDescription>
        </Alert>

        {/* Abas */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setAbaSelecionada("aprovados")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              abaSelecionada === "aprovados"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Usuários Aprovados ({usuariosAprovados.length})
          </button>
          <button
            onClick={() => setAbaSelecionada("pendentes")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              abaSelecionada === "pendentes"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Pendentes de Aprovação ({usuariosPendentes.length})
          </button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>{abaSelecionada === "aprovados" ? "Usuários Aprovados" : "Pendentes de Aprovação"}</CardTitle>
              <Badge variant="secondary">
                {abaSelecionada === "aprovados" ? usuariosAprovados.length : usuariosPendentes.length} usuários
              </Badge>
            </div>
            <div className="flex gap-3">
              <Input
                placeholder="🔍 Pesquisar por nome ou email..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="flex-1 max-w-md"
              />
              <Select value={filtroCargo} onValueChange={setFiltroCargo}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos os cargos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos os cargos</SelectItem>
                  <SelectItem value="superior">Superior</SelectItem>
                  <SelectItem value="gerencia_unidades">Gerência de Unidades</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="pos_venda">Pós Venda</SelectItem>
                  <SelectItem value="terapeuta">Terapeuta</SelectItem>
                  <SelectItem value="recepcao">Recepção</SelectItem>
                  <SelectItem value="funcionario">Funcionário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Unidades</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuariosFiltrados
                  .filter(usuario => {
                    // Filtro de busca
                    if (busca) {
                      const termo = busca.toLowerCase();
                      const matchBusca = usuario.full_name?.toLowerCase().includes(termo) || 
                                         usuario.email?.toLowerCase().includes(termo);
                      if (!matchBusca) return false;
                    }
                    
                    // Filtro de cargo
                    if (filtroCargo) {
                      const cargo = usuario.cargo || (usuario.role === "admin" ? "administrador" : "funcionario");
                      if (cargo !== filtroCargo) return false;
                    }
                    
                    return true;
                  })
                  .map(usuario => {
                  const isCurrentUser = usuario.id === usuarioAtual.id;
                  const cargo = usuario.cargo || (usuario.role === "admin" ? "administrador" : "funcionario");
                  
                  return (
                    <TableRow key={usuario.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            cargo === "administrador" || cargo === "superior" ? "bg-blue-100" : 
                            cargo === "gerencia_unidades" ? "bg-purple-100" : 
                            cargo === "financeiro" ? "bg-green-100" :
                            cargo === "vendedor" ? "bg-orange-100" :
                            cargo === "pos_venda" ? "bg-pink-100" :
                            "bg-gray-100"
                          }`}>
                            {cargo === "administrador" || cargo === "superior" ? (
                              <Shield className="w-4 h-4 text-blue-600" />
                            ) : cargo === "gerencia_unidades" ? (
                              <Building2 className="w-4 h-4 text-purple-600" />
                            ) : cargo === "financeiro" ? (
                              <FileSpreadsheet className="w-4 h-4 text-green-600" />
                            ) : cargo === "vendedor" ? (
                              <DollarSign className="w-4 h-4 text-orange-600" />
                            ) : cargo === "pos_venda" ? (
                              <FileSpreadsheet className="w-4 h-4 text-pink-600" />
                            ) : (
                              <User className="w-4 h-4 text-gray-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            {editandoNome === usuario.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={novoNome}
                                  onChange={(e) => setNovoNome(e.target.value)}
                                  className="h-8 text-sm"
                                  placeholder="Nome completo"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSalvarNome(usuario);
                                    } else if (e.key === 'Escape') {
                                      handleCancelarEdicao();
                                    }
                                  }}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSalvarNome(usuario)}
                                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleCancelarEdicao}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="font-medium">{usuario.full_name}</div>
                                {(usuarioAtual?.cargo === "superior" || usuarioAtual?.role === "admin") && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditarNome(usuario)}
                                    className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            )}
                            {isCurrentUser && !editandoNome && (
                              <Badge variant="secondary" className="text-xs mt-1">Você</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-3 h-3" />
                          {usuario.email}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Select
                          value={cargo}
                          onValueChange={(value) => handleAtualizarCargo(usuario, value)}
                          disabled={isCurrentUser}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(usuarioAtual?.cargo === "administrador" || usuarioAtual?.cargo === "superior" || usuarioAtual?.role === "admin") && (
                              <SelectItem value="superior">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-3 h-3" />
                                  Superior
                                </div>
                              </SelectItem>
                            )}
                            <SelectItem value="recepcao">
                              <div className="flex items-center gap-2">
                                <User className="w-3 h-3" />
                                Recepção
                              </div>
                             </SelectItem>
                            <SelectItem value="terapeuta">
                              <div className="flex items-center gap-2">
                                <User className="w-3 h-3" />
                                Terapeuta
                              </div>
                            </SelectItem>
                             {(usuarioAtual?.cargo === "administrador" || usuarioAtual?.cargo === "superior" || usuarioAtual?.role === "admin") && (
                              <>
                                <SelectItem value="gerencia_unidades">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-3 h-3" />
                                    Gerência de Unidades
                                  </div>
                                </SelectItem>
                                <SelectItem value="financeiro">
                                  <div className="flex items-center gap-2">
                                    <FileSpreadsheet className="w-3 h-3" />
                                    Financeiro
                                  </div>
                                </SelectItem>
                                <SelectItem value="vendedor">
                                  <div className="flex items-center gap-2">
                                    <DollarSign className="w-3 h-3" />
                                    Vendedor
                                  </div>
                                </SelectItem>
                                <SelectItem value="pos_venda">
                                  <div className="flex items-center gap-2">
                                    <FileSpreadsheet className="w-3 h-3" />
                                    Pós Venda
                                  </div>
                                </SelectItem>
                                <SelectItem value="funcionario">
                                  <div className="flex items-center gap-2">
                                    <User className="w-3 h-3" />
                                    Funcionário
                                  </div>
                                </SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell>
                       {cargo === "administrador" || cargo === "superior" ? (
                         <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                           Todas as unidades
                         </Badge>
                       ) : cargo === "gerencia_unidades" || cargo === "financeiro" || cargo === "vendedor" || cargo === "pos_venda" ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="text-left justify-start">
                                {Array.isArray(usuario.unidades_acesso) && usuario.unidades_acesso?.length > 0 ? (
                                  <>
                                    {usuario.unidades_acesso.map(uid => {
                                      const unidade = unidades.find(u => u.id === uid);
                                      return unidade?.nome;
                                    }).filter(Boolean).join(", ") || "Selecionar unidades"}
                                  </>
                                ) : (
                                  <span className="text-gray-400">Nenhuma unidade</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64" align="start">
                              <div className="space-y-3">
                                <Label className="text-sm font-semibold">Unidades Permitidas</Label>
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2 pb-2 border-b">
                                    <Checkbox
                                      id={`${usuario.id}-todas`}
                                      checked={usuario.unidades_acesso?.length === unidades.length && unidades.length > 0}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          handleAtualizarUnidades(usuario, unidades.map(u => u.id));
                                        } else {
                                          handleAtualizarUnidades(usuario, []);
                                        }
                                      }}
                                    />
                                    <label
                                      htmlFor={`${usuario.id}-todas`}
                                      className="text-sm cursor-pointer flex-1 font-semibold"
                                    >
                                      Todas as unidades
                                    </label>
                                  </div>
                                  {unidades.map(unidade => (
                                    <div key={unidade.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`${usuario.id}-${unidade.id}`}
                                        checked={usuario.unidades_acesso?.includes(unidade.id)}
                                        onCheckedChange={() => handleToggleUnidade(usuario, unidade.id)}
                                      />
                                      <label
                                        htmlFor={`${usuario.id}-${unidade.id}`}
                                        className="text-sm cursor-pointer flex-1"
                                      >
                                        {unidade.nome}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="text-left justify-start">
                                {Array.isArray(usuario.unidades_acesso) && usuario.unidades_acesso?.length > 0 ? (
                                  <>
                                    {usuario.unidades_acesso.map(uid => {
                                      const unidade = unidades.find(u => u.id === uid);
                                      return unidade?.nome;
                                    }).filter(Boolean).join(", ") || "Selecionar unidades"}
                                  </>
                                ) : (
                                  <span className="text-gray-400">Nenhuma unidade</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64" align="start">
                              <div className="space-y-3">
                                <Label className="text-sm font-semibold">Unidades Permitidas</Label>
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2 pb-2 border-b">
                                    <Checkbox
                                      id={`${usuario.id}-todas`}
                                      checked={Array.isArray(usuario.unidades_acesso) && usuario.unidades_acesso?.length === unidades.length && unidades.length > 0}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          handleAtualizarUnidades(usuario, unidades.map(u => u.id));
                                        } else {
                                          handleAtualizarUnidades(usuario, []);
                                        }
                                      }}
                                    />
                                    <label
                                      htmlFor={`${usuario.id}-todas`}
                                      className="text-sm cursor-pointer flex-1 font-semibold"
                                    >
                                      Todas as unidades
                                    </label>
                                  </div>
                                  {unidades.map(unidade => (
                                    <div key={unidade.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`${usuario.id}-${unidade.id}`}
                                        checked={Array.isArray(usuario.unidades_acesso) && usuario.unidades_acesso?.includes(unidade.id)}
                                        onCheckedChange={() => handleToggleUnidade(usuario, unidade.id)}
                                      />
                                      <label
                                        htmlFor={`${usuario.id}-${unidade.id}`}
                                        className="text-sm cursor-pointer flex-1"
                                      >
                                        {unidade.nome}
                                      </label>
                                    </div>
                                  ))}
                                  </div>
                                  </div>
                                  </PopoverContent>
                                  </Popover>
                                  )}
                                  </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={usuario.ativo !== false}
                            onCheckedChange={() => handleToggleAtivo(usuario)}
                            disabled={isCurrentUser}
                          />
                          <span className="text-sm text-gray-600">
                            {usuario.ativo !== false ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {abaSelecionada === "pendentes" ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleAprovarUsuario(usuario)}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleRejeitar(usuario)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Rejeitar
                            </Button>
                          </div>
                        ) : (
                          <Badge 
                            variant={cargo === "administrador" || cargo === "superior" || cargo === "gerencia_unidades" || cargo === "financeiro" || cargo === "vendedor" || cargo === "terapeuta" || cargo === "pos_venda" ? "default" : "secondary"} 
                            className={
                              cargo === "gerencia_unidades" ? "bg-purple-600" : 
                              cargo === "financeiro" ? "bg-green-600" : 
                              cargo === "vendedor" ? "bg-orange-600" :
                              cargo === "terapeuta" ? "bg-teal-600" :
                              cargo === "pos_venda" ? "bg-pink-600" :
                              cargo === "superior" ? "bg-blue-500" : ""
                            }
                          >
                            {cargo === "administrador" || cargo === "superior" ? "Superior" : 
                            cargo === "gerencia_unidades" ? "Gerência" : 
                            cargo === "financeiro" ? "Financeiro" : 
                            cargo === "vendedor" ? "Vendedor" :
                            cargo === "terapeuta" ? "Terapeuta" :
                            cargo === "pos_venda" ? "Pós Venda" :
                            "Funcionário"}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {usuariosFiltrados.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <UserPlus className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="font-medium">
                  {abaSelecionada === "pendentes" ? "Nenhum usuário pendente" : "Nenhum usuário aprovado"}
                </p>
                <p className="text-sm mt-2">
                  {abaSelecionada === "pendentes" 
                    ? "Todos os usuários foram aprovados" 
                    : "Não há usuários cadastrados"}
                </p>
              </div>
            )}
            </Table>
            </CardContent>
            </Card>

            {/* Modal de Aprovação com Configuração de Cargo */}
        {usuarioParaConfigCargo && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Aprovar e Configurar Cargo</CardTitle>
                <p className="text-sm text-gray-600 mt-2">{usuarioParaConfigCargo.full_name}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Select value={cargoSelecionado} onValueChange={setCargoSelecionado}>
                    <SelectTrigger id="cargo">
                      <SelectValue placeholder="Selecione um cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recepcao">Recepção</SelectItem>
                      <SelectItem value="terapeuta">Terapeuta</SelectItem>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="pos_venda">Pós Venda</SelectItem>
                      <SelectItem value="gerencia_unidades">Gerência</SelectItem>
                      <SelectItem value="superior">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Unidades de Acesso</Label>
                  <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                    {unidades.map(unidade => (
                      <div key={unidade.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`unidade-${unidade.id}`}
                          checked={unidadesSelecionadas.includes(unidade.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setUnidadesSelecionadas([...unidadesSelecionadas, unidade.id]);
                            } else {
                              setUnidadesSelecionadas(unidadesSelecionadas.filter(id => id !== unidade.id));
                            }
                          }}
                          className="rounded"
                        />
                        <Label htmlFor={`unidade-${unidade.id}`} className="cursor-pointer">
                          {unidade.nome}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <div className="p-6 flex gap-2 justify-end border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setUsuarioParaConfigCargo(null);
                    setCargoSelecionado("");
                    setUnidadesSelecionadas([]);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleConfirmarCargo(usuarioParaConfigCargo)}
                >
                  Aprovar Usuário
                </Button>
              </div>
            </Card>
          </div>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Diferenças entre Cargos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Superior</h3>
                </div>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>• Pode gerenciar usuários</li>
                  <li>• Pode trocar cargos (exceto Admin/Superior)</li>
                  <li>• Acesso a todas as unidades</li>
                  <li>• Pode bloquear/desbloquear agenda</li>
                  <li>• Acesso completo ao sistema</li>
                </ul>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-purple-900">Gerência de Unidades</h3>
                </div>
                <ul className="space-y-2 text-sm text-purple-800">
                  <li>• Pode bloquear e desbloquear a agenda</li>
                  <li>• Acesso às unidades permitidas</li>
                  <li>• Pode gerenciar usuários e terapeutas</li>
                  <li>• Pode editar agenda mesmo bloqueada</li>
                  <li>• Permissões de superior nas unidades</li>
                </ul>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">Financeiro</h3>
                </div>
                <ul className="space-y-2 text-sm text-green-800">
                  <li>• Acesso ao botão Superior</li>
                  <li>• Pode ver apenas o Histórico</li>
                  <li>• Acesso às unidades permitidas</li>
                  <li>• Não pode editar agendamentos</li>
                  <li>• Apenas visualização de dados</li>
                </ul>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                  <h3 className="font-semibold text-orange-900">Vendedor</h3>
                </div>
                <ul className="space-y-2 text-sm text-orange-800">
                  <li>• Aparece automaticamente em relatórios</li>
                  <li>• Pode criar e editar agendamentos</li>
                  <li>• Não pode bloquear a agenda</li>
                  <li>• Acesso às unidades permitidas</li>
                  <li>• Visível na aba "Por Vendedor"</li>
                </ul>
              </div>

              <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-indigo-900">Recepção</h3>
                </div>
                <ul className="space-y-2 text-sm text-indigo-800">
                  <li>• Pode criar e editar agendamentos</li>
                  <li>• Não pode bloquear a agenda</li>
                  <li>• Não pode editar quando bloqueada</li>
                  <li>• Acesso às unidades permitidas</li>
                  <li>• Acesso básico ao sistema</li>
                </ul>
              </div>

              <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-5 h-5 text-teal-600" />
                  <h3 className="font-semibold text-teal-900">Terapeuta</h3>
                </div>
                <ul className="space-y-2 text-sm text-teal-800">
                  <li>• Acesso vinculado ao email da Configuração de Terapeutas</li>
                  <li>• Vê apenas seus próprios agendamentos</li>
                  <li>• Pode ver detalhes dos pacientes</li>
                  <li>• Não pode bloquear agenda</li>
                  <li>• Acesso limitado ao sistema</li>
                </ul>
              </div>

              <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                <div className="flex items-center gap-2 mb-3">
                  <FileSpreadsheet className="w-5 h-5 text-pink-600" />
                  <h3 className="font-semibold text-pink-900">Pós Venda</h3>
                </div>
                <ul className="space-y-2 text-sm text-pink-800">
                  <li>• Acesso aos Relatórios/Planilha</li>
                  <li>• Pode criar e editar agendamentos</li>
                  <li>• Acesso às unidades permitidas</li>
                  <li>• Não pode bloquear a agenda</li>
                  <li>• Não pode editar quando bloqueada</li>
                </ul>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Funcionário</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Pode criar e editar agendamentos</li>
                  <li>• Não pode bloquear a agenda</li>
                  <li>• Não pode editar quando bloqueada</li>
                  <li>• Não pode gerenciar usuários</li>
                  <li>• Acesso limitado às unidades permitidas</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}