import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";

export function AccountPage({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  const [sent, setSent] = useState(false);
  usePageTitle(isLogin ? "Fazer login" : "Cadastre-se");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="container account">
      <div className="account-card">
        <h1>{isLogin ? "Fazer login" : "Criar conta"}</h1>
        {sent ? (
          <p className="account-success">
            {isLogin ? "Login realizado com sucesso!" : "Cadastro realizado! Bem-vindo(a) à Breck Imports."}
          </p>
        ) : (
          <form onSubmit={submit} className="account-form">
            {!isLogin && (
              <label>
                Nome
                <input name="name" autoComplete="name" required />
              </label>
            )}
            <label>
              E-mail
              <input type="email" name="email" autoComplete="email" required />
            </label>
            {!isLogin && (
              <label>
                Telefone
                <input type="tel" name="phone" autoComplete="tel" placeholder="(11) 99999-9999" />
              </label>
            )}
            <label>
              Senha
              <input
                type="password"
                name="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                minLength={6}
                required
              />
            </label>
            <button type="submit" className="btn btn-primary btn-block">
              {isLogin ? "Entrar" : "Criar conta"}
            </button>
          </form>
        )}
        <p className="account-switch">
          {isLogin ? (
            <>
              Ainda não tem conta? <Link to="/conta/cadastro">Cadastre-se</Link>
            </>
          ) : (
            <>
              Já tem conta? <Link to="/conta/login">Fazer login</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
