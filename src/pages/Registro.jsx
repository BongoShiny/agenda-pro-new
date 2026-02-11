import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

export default function RegistroPage() {
  const [aba, setAba] = useState("login"); // login ou criar
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nome, setNome] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validações
    if (!nome.trim()) {
      setError("Nome é obrigatório");
      return;
    }
    if (!email.trim()) {
      setError("Email é obrigatório");
      return;
    }
    if (!password || password.length < 6) {
      setError("Senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      // Registrar novo usuário via função backend
      const response = await fetch("/api/functions/registrarUsuario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
          full_name: nome.trim(),
          cargo: "recepcao",
          unidades_acesso: [],
          aprovado: false
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erro ao registrar usuário");
        return;
      }

      setSucesso(true);
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Cadastro Realizado!</h2>
            <p className="text-gray-600 mb-2">
              Sua conta foi criada com sucesso.
            </p>
            <p className="text-lg font-semibold text-blue-600 mb-2">
              ⏳ Aguardando aprovação
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Um administrador irá revisar seu cadastro e definir seu cargo. Você receberá acesso em breve.
            </p>
            <p className="text-xs text-gray-500">Você será redirecionado para login...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Criar Conta</CardTitle>
          <p className="text-center text-sm text-gray-600 mt-2">
            Preencha os dados para solicitar acesso ao sistema
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome completo"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme sua senha"
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? "Cadastrando..." : "Criar Conta"}
            </Button>

            <p className="text-center text-sm text-gray-600">
              Já possui conta?{" "}
              <button
                type="button"
                onClick={() => window.location.href = "/"}
                className="text-blue-600 hover:underline font-semibold"
              >
                Voltar ao login
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}