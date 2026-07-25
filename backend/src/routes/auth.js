const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../db");
const { requireAuth } = require("../middleware/auth");
const { logAction } = require("../services/audit");

const router = express.Router();

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MINUTOS = 15;

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Informe e-mail e senha." });
  }

  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase().trim()]);
  const user = rows[0];

  const registrarTentativa = (success) =>
    pool.query(
      "INSERT INTO login_attempts (email, success, ip, user_agent) VALUES ($1, $2, $3, $4)",
      [email, success, req.ip, req.headers["user-agent"] || null]
    );

  if (!user) {
    await registrarTentativa(false);
    return res.status(401).json({ error: "E-mail ou senha inválidos." });
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return res.status(423).json({
      error: `Conta bloqueada temporariamente por excesso de tentativas. Tente novamente após ${new Date(
        user.locked_until
      ).toLocaleTimeString("pt-BR")}.`,
    });
  }

  if (user.status !== "ativo") {
    await registrarTentativa(false);
    return res.status(403).json({ error: "Usuário inativo. Fale com o administrador." });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    await registrarTentativa(false);
    const tentativas = user.failed_logins + 1;
    if (tentativas >= MAX_TENTATIVAS) {
      const lockedUntil = new Date(Date.now() + BLOQUEIO_MINUTOS * 60 * 1000);
      await pool.query(
        "UPDATE users SET failed_logins = 0, locked_until = $2 WHERE id = $1",
        [user.id, lockedUntil]
      );
      return res.status(423).json({
        error: `Muitas tentativas incorretas. Conta bloqueada por ${BLOQUEIO_MINUTOS} minutos.`,
      });
    }
    await pool.query("UPDATE users SET failed_logins = $2 WHERE id = $1", [user.id, tentativas]);
    return res.status(401).json({ error: "E-mail ou senha inválidos." });
  }

  await registrarTentativa(true);
  await pool.query(
    "UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = now() WHERE id = $1",
    [user.id]
  );

  const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "12h",
  });

  await logAction(
    { user, ip: req.ip, headers: req.headers },
    { action: "login", entity: "usuario", entityId: user.id }
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      cargo: user.cargo,
    },
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT rp.module_key, rp.can_view, rp.can_edit, rp.can_delete
     FROM role_permissions rp WHERE rp.role = $1`,
    [req.user.role]
  );
  res.json({ user: req.user, permissions: rows });
});

router.post("/logout", requireAuth, async (req, res) => {
  await logAction(req, { action: "logout", entity: "usuario", entityId: req.user.id });
  res.json({ ok: true });
});

module.exports = router;
