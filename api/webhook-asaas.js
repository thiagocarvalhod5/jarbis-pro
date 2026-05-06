// api/webhook-asaas.js
// Recebe confirmação de pagamento do Asaas e libera créditos no Supabase

const SUPA_URL  = process.env.REACT_APP_SUPA_URL || "https://hrqhqqakvkdkapfijhij.supabase.co";
const SUPA_KEY  = process.env.REACT_APP_SUPA_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhycWhxcWFrdmtka2FwZmlqaGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDc1OTYsImV4cCI6MjA5MzU4MzU5Nn0.5YM_CUIuaSmb4lZngDXqJdEuPbGF53F5Qc9nbXLkk2k";

const SH = {
  apikey: SUPA_KEY,
  Authorization: "Bearer " + SUPA_KEY,
  "Content-Type": "application/json",
};

// Créditos por valor pago
function creditosPorValor(valor) {
  const v = Number(valor);
  if (v >= 147) return 200;
  if (v >= 47)  return 50;
  if (v >= 27)  return 20;
  return 0;
}

async function dbGet(table, col, val) {
  const r = await fetch(
    `${SUPA_URL}/rest/v1/${table}?${col}=eq.${encodeURIComponent(val)}&select=*`,
    { headers: SH }
  );
  return r.json();
}

async function dbUpdate(table, col, val, data) {
  return fetch(
    `${SUPA_URL}/rest/v1/${table}?${col}=eq.${encodeURIComponent(val)}`,
    { method: "PATCH", headers: { ...SH, Prefer: "return=representation" }, body: JSON.stringify(data) }
  );
}

async function dbInsert(table, data) {
  return fetch(
    `${SUPA_URL}/rest/v1/${table}`,
    { method: "POST", headers: { ...SH, Prefer: "return=representation" }, body: JSON.stringify(data) }
  );
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, asaas-access-token");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ erro: "Método não permitido" });

  try {
    const evento   = req.body;
    const event    = evento?.event || "";
    const pagamento = evento?.payment || {};

    console.log("Webhook recebido:", event, "| Status:", pagamento.status, "| Valor:", pagamento.value);

    // Só processa pagamentos confirmados/recebidos
    if (!["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"].includes(event)) {
      return res.status(200).json({ ok: true, msg: "Evento ignorado: " + event });
    }

    const valor    = Number(pagamento.value || pagamento.netValue || 0);
    const creditos = creditosPorValor(valor);

    if (creditos === 0) {
      console.warn("Valor sem pacote correspondente:", valor);
      return res.status(200).json({ ok: true, msg: "Valor R$" + valor + " não corresponde a pacote" });
    }

    // Email do cliente (externalReference = email cadastrado no app)
    const email = (pagamento.externalReference || "").toLowerCase().trim();

    if (!email || !email.includes("@")) {
      // Registra para revisão manual
      await dbInsert("pagamentos", {
        asaas_id: pagamento.id,
        valor, creditos,
        status: "pendente_vinculo",
        referencia: pagamento.externalReference || "",
        criado_em: new Date().toISOString(),
      });
      return res.status(200).json({ ok: true, msg: "Email não identificado — registrado para revisão" });
    }

    // Busca usuário
    const usuarios = await dbGet("usuarios", "email", email);
    if (!usuarios?.length) {
      console.warn("Usuário não encontrado:", email);
      return res.status(200).json({ ok: true, msg: "Usuário não encontrado: " + email });
    }

    const usuario        = usuarios[0];
    const creditosAtual  = Number(usuario.creditos_prospeccao || 0);
    const creditosNovo   = creditosAtual + creditos;

    // Atualiza créditos + ativa plano PRO
    await dbUpdate("usuarios", "email", email, {
      creditos_prospeccao: creditosNovo,
      plano: "pro",
      assinatura_ativa: true,
      atualizado_em: new Date().toISOString(),
    });

    // Registra pagamento
    await dbInsert("pagamentos", {
      usuario_id:       usuario.id,
      asaas_id:         pagamento.id,
      email,
      valor,
      creditos,
      creditos_anterior: creditosAtual,
      creditos_novo:     creditosNovo,
      status:           "pago",
      criado_em:        new Date().toISOString(),
    });

    console.log(`✅ ${email} | +${creditos} créditos | Total: ${creditosNovo}`);
    return res.status(200).json({
      ok: true,
      email,
      creditos_adicionados: creditos,
      creditos_total: creditosNovo,
    });

  } catch (erro) {
    console.error("Erro webhook:", erro.message);
    return res.status(500).json({ erro: "Erro interno", detalhe: erro.message });
  }
}


// Pacotes de créditos por valor
function creditosPorValor(valor) {
  if (valor >= 147) return 200;
  if (valor >= 47)  return 50;
  if (valor >= 27)  return 20;
  return 0;
}

async function supabaseGet(table, col, val) {
  const r = await fetch(
    `${SUPA_URL}/rest/v1/${table}?${col}=eq.${encodeURIComponent(val)}&select=*`,
    { headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY } }
  );
  return r.json();
}

async function supabaseUpdate(table, col, val, data) {
  return fetch(
    `${SUPA_URL}/rest/v1/${table}?${col}=eq.${encodeURIComponent(val)}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPA_KEY,
        Authorization: "Bearer " + SUPA_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(data),
    }
  );
}

async function supabaseInsert(table, data) {
  return fetch(`${SUPA_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SUPA_KEY,
      Authorization: "Bearer " + SUPA_KEY,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(data),
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, asaas-access-token");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });

  try {
    // Validar token do Asaas
    const token = req.headers["asaas-access-token"];
    if (token && token !== WEBHOOK_TOKEN) {
      console.warn("Token inválido:", token);
      return res.status(401).json({ erro: "Token inválido" });
    }

    const evento = req.body;
    console.log("Webhook Asaas recebido:", evento?.event, evento?.payment?.status);

    // Só processa pagamentos confirmados
    if (
      evento?.event !== "PAYMENT_RECEIVED" &&
      evento?.event !== "PAYMENT_CONFIRMED"
    ) {
      return res.status(200).json({ ok: true, msg: "Evento ignorado: " + evento?.event });
    }

    const pagamento = evento?.payment;
    if (!pagamento) return res.status(400).json({ erro: "Pagamento não encontrado" });

    const valor = Number(pagamento.value || pagamento.netValue || 0);
    const creditos = creditosPorValor(valor);

    if (creditos === 0) {
      console.warn("Valor não corresponde a nenhum pacote:", valor);
      return res.status(200).json({ ok: true, msg: "Valor não reconhecido: R$" + valor });
    }

    // Busca email do cliente no Asaas pelo externalReference ou customer
    const emailRef =
      pagamento.externalReference ||
      pagamento.description ||
      "";

    // Tenta extrair email da referência
    const emailMatch = emailRef.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : null;

    if (!email) {
      console.warn("Email não encontrado na referência:", emailRef);
      // Registra pagamento sem usuario vinculado para revisão manual
      await supabaseInsert("pagamentos", {
        asaas_id: pagamento.id,
        valor,
        creditos,
        status: "pendente_vinculo",
        referencia: emailRef,
        criado_em: new Date().toISOString(),
      });
      return res.status(200).json({ ok: true, msg: "Pagamento registrado — email não identificado" });
    }

    // Busca usuário pelo email
    const usuarios = await supabaseGet("usuarios", "email", email.toLowerCase());
    if (!usuarios || usuarios.length === 0) {
      console.warn("Usuário não encontrado:", email);
      return res.status(200).json({ ok: true, msg: "Usuário não encontrado: " + email });
    }

    const usuario = usuarios[0];
    const creditosAtuais = Number(usuario.creditos_prospeccao || 0);
    const novoTotal = creditosAtuais + creditos;

    // Atualiza créditos do usuário
    await supabaseUpdate("usuarios", "email", email.toLowerCase(), {
      creditos_prospeccao: novoTotal,
      plano: "pro",
      assinatura_ativa: true,
    });

    // Registra pagamento
    await supabaseInsert("pagamentos", {
      usuario_id: usuario.id,
      asaas_id: pagamento.id,
      email: email.toLowerCase(),
      valor,
      creditos,
      creditos_anterior: creditosAtuais,
      creditos_novo: novoTotal,
      status: "pago",
      criado_em: new Date().toISOString(),
    });

    console.log(`✅ Créditos liberados: ${email} +${creditos} = ${novoTotal} total`);
    return res.status(200).json({
      ok: true,
      email,
      creditos_adicionados: creditos,
      creditos_total: novoTotal,
    });

  } catch (erro) {
    console.error("Erro webhook:", erro);
    return res.status(500).json({ erro: "Erro interno", detalhe: erro.message });
  }
}
