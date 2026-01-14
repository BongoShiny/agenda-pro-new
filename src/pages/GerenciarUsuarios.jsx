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
      
      // Redirecionar se não for admin
      if (user.cargo !== "administrador" && user.role !== "admin") {
        window.location.href = createPageUrl("Agenda");
      }
    };
    carregarUsuario();
  }, []);

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const users = await base44.entities.User.list("full_name");
      return users;
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
    mutationFn: async ({ id, dados }) => {
      console.error("🔄 [MUTATION] Enviando dados para User.update:", { id, dados });
      const resultado = await base44.entities.User.update(id, dados);
      console.error("🔄 [MUTATION] Resultado da atualização:", resultado);
      return resultado;
    },
    onSuccess: async () => {
      console.error("🔄 [MUTATION SUCCESS] Invalidando queries...");
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      await queryClient.refetchQueries({ queryKey: ['usuarios'] });
      console.error("🔄 [MUTATION SUCCESS] Refetch concluído!");
    },
    onError: (error) => {
      console.error("🔄 [MUTATION ERROR]", error);
    }
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
    
    // Se mudou para "administrador", garantir que tem role admin
    const dadosAtualizacao = { cargo: novoCargo };
    if (novoCargo === "administrador") {
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
    
    console.error("🔧🔧🔧 ==================== SALVANDO UNIDADES ==================== 🔧🔧🔧");
    console.error("PRE-SALVAR:");
    console.error("  usuario.id:", usuario.id);
    console.error("  usuario.email:", usuario.email);
    console.error("  usuario.unidades_acesso ANTES:", JSON.stringify(usuario.unidades_acesso));
    console.error("  unidadesIds a salvar:", JSON.stringify(unidadesIds));
    console.error("  Tipo de unidadesIds:", typeof unidadesIds);
    console.error("  É array?", Array.isArray(unidadesIds));
    
    const dados = { unidades_acesso: unidadesIds };
    console.error("📦 OBJETO A SER ENVIADO:", JSON.stringify(dados));
    
    await atualizarUsuarioMutation.mutateAsync({
      id: usuario.id,
      dados: dados
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
                            cargo === "terapeuta" ? "bg-teal-100" :
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
                            ) : cargo === "terapeuta" ? (
                              <User className="w-4 h-4 text-teal-600" />
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
                            {(usuarioAtual?.cargo === "administrador" || usuarioAtual?.role === "admin") && (
                              <SelectItem value="administrador">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-3 h-3" />
                                  Administrador
                                </div>
                              </SelectItem>
                            )}
                            <SelectItem value="recepcao">
                             <div className="flex items-center gap-2">
                               <User className="w-3 h-3" />
                               Recepção
                             </div>
                            </SelectItem>
                            {(usuarioAtual?.cargo === "administrador" || usuarioAtual?.role === "admin") && (
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
                                <SelectItem value="terapeuta">
                                  <div className="flex items-center gap-2">
                                    <User className="w-3 h-3" />
                                    Terapeuta
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
                        {cargo === "administrador" ? (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            Todas as unidades
                          </Badge>
                        ) : cargo === "gerencia_unidades" ? (
                          // GERÊNCIA DE UNIDADES: Obrigatório selecionar APENAS UMA unidade
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className={`text-left justify-start ${!usuario.unidades_acesso?.length ? 'border-red-300 bg-red-50' : ''}`}
                              >
                                {usuario.unidades_acesso?.length === 1 ? (
                                  <span className="text-green-700 font-medium">
                                    {unidades.find(u => u.id === usuario.unidades_acesso[0])?.nome}
                                  </span>
                                ) : usuario.unidades_acesso?.length > 0 ? (
                                  <span className="text-orange-700 font-medium">
                                    ⚠️ {usuario.unidades_acesso.length} unidades (selecionar apenas 1)
                                  </span>
                                ) : (
                                  <span className="text-red-600 font-semibold">⚠️ Selecionar unidade</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64" align="start">
                              <div className="space-y-3">
                                <Label className="text-sm font-semibold text-red-900">Selecione UMA Clínica para Gerenciar</Label>
                                <p className="text-xs text-gray-500 mb-3">⚠️ Gerentes podem gerenciar apenas UMA unidade por vez</p>
                                <div className="space-y-2">
                                  {unidades.map(unidade => (
                                    <div key={unidade.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`${usuario.id}-${unidade.id}`}
                                        checked={usuario.unidades_acesso?.includes(unidade.id)}
                                        onCheckedChange={(checked) => {
                                          // Sempre deselecionar outras e selecionar apenas a clicada
                                          if (checked) {
                                            handleAtualizarUnidades(usuario, [unidade.id]);
                                          } else {
                                            handleAtualizarUnidades(usuario, []);
                                          }
                                        }}
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
                        ) : cargo === "financeiro" || cargo === "vendedor" || cargo === "terapeuta" ? (
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
                          variant={cargo === "administrador" || cargo === "gerencia_unidades" || cargo === "financeiro" || cargo === "vendedor" || cargo === "terapeuta" ? "default" : "secondary"} 
                          className={
                            cargo === "gerencia_unidades" ? "bg-purple-600" : 
                            cargo === "financeiro" ? "bg-green-600" : 
                            cargo === "vendedor" ? "bg-orange-600" :
                            cargo === "terapeuta" ? "bg-teal-600" :
                            cargo === "administrador" ? "bg-blue-500" : ""
                          }
                        >
                          {cargo === "administrador" ? "Administrador" : 
                          cargo === "gerencia_unidades" ? "Gerência" : 
                          cargo === "financeiro" ? "Financeiro" : 
                          cargo === "vendedor" ? "Vendedor" :
                          cargo === "terapeuta" ? "Terapeuta" :
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Administrador</h3>
                </div>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>• Pode gerenciar usuários</li>
                  <li>• Pode trocar todos os cargos</li>
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
                  <li>• Acesso APENAS às unidades atribuídas</li>
                  <li>• Pode gerenciar terapeutas de suas unidades</li>
                  <li>• Pode ver histórico e relatórios de suas unidades</li>
                  <li>• Pode editar agenda de suas unidades</li>
                  <li>• Acesso limitado às unidades específicas</li>
                </ul>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">Financeiro</h3>
                </div>
                <ul className="space-y-2 text-sm text-green-800">
                  <li>• Acesso ao botão Administrador</li>
                  <li>• Pode ver Histórico e Relatórios Financeiros</li>
                  <li>• Acesso às unidades permitidas</li>
                  <li>• Pode editar dados financeiros</li>
                  <li>• Foco em análise financeira</li>
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
                  <li>• Vê apenas seus próprios atendimentos</li>
                  <li>• Pode editar seus agendamentos</li>
                  <li>• Acesso às unidades onde atende</li>
                  <li>• Foco no atendimento aos pacientes</li>
                  <li>• Acesso restrito à sua agenda</li>
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