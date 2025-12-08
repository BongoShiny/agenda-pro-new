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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
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
    const unidadesAntigas = usuario.unidades_acesso || [];
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
    const unidadesAtuais = usuario.unidades_acesso || [];
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
    if (novoNome.trim() === "") {
      alert("O nome não pode estar vazio");
      return;
    }

    await atualizarUsuarioMutation.mutateAsync({
      id: usuario.id,
      dados: { full_name: novoNome.trim() }
    });

    // Registrar no log
    await base44.entities.LogAcao.create({
      tipo: "editou_usuario",
      usuario_email: usuarioAtual?.email,
      descricao: `Alterou nome de "${usuario.full_name}" para "${novoNome.trim()}" (${usuario.email})`,
      entidade_tipo: "Usuario",
      entidade_id: usuario.id,
      dados_antigos: JSON.stringify({ full_name: usuario.full_name }),
      dados_novos: JSON.stringify({ full_name: novoNome.trim() })
    });

    setEditandoNome(null);
    setNovoNome("");
  };

  const handleCancelarEdicao = () => {
    setEditandoNome(null);
    setNovoNome("");
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
            <strong>Como convidar novos usuários:</strong> Vá até o Dashboard → clique em "Convidar usuário" no menu lateral. 
            Após o convite, você poderá configurar o cargo e permissões do novo usuário aqui.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Usuários do Sistema</span>
              <Badge variant="secondary">{usuarios.length} usuários</Badge>
            </CardTitle>
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
                {usuarios.map(usuario => {
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
                                  autoFocus
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
                       ) : cargo === "gerencia_unidades" || cargo === "financeiro" || cargo === "vendedor" ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="text-left justify-start">
                                {usuario.unidades_acesso?.length > 0 ? (
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
                                {usuario.unidades_acesso?.length > 0 ? (
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
                        <Badge 
                          variant={cargo === "administrador" || cargo === "superior" || cargo === "gerencia_unidades" || cargo === "financeiro" || cargo === "vendedor" ? "default" : "secondary"} 
                          className={
                            cargo === "gerencia_unidades" ? "bg-purple-600" : 
                            cargo === "financeiro" ? "bg-green-600" : 
                            cargo === "vendedor" ? "bg-orange-600" :
                            cargo === "superior" ? "bg-blue-500" : ""
                          }
                        >
                          {cargo === "administrador" || cargo === "superior" ? "Superior" : 
                          cargo === "gerencia_unidades" ? "Gerência" : 
                          cargo === "financeiro" ? "Financeiro" : 
                          cargo === "vendedor" ? "Vendedor" :
                          "Funcionário"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {usuarios.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <UserPlus className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="font-medium">Nenhum usuário cadastrado</p>
                <p className="text-sm mt-2">Convide usuários através do Dashboard</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Diferenças entre Cargos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
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