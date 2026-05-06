// api/pagar.js
const ASAAS_KEY = "$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmM2OWU0YTNmLWVmYTQtNDhjOC04ZmU3LTdjNDczMDIzOGI0Yzo6JGFhY2hfNjBhZmMyMTQtZGQ5ZS00ZDI4LTgwN2UtZTdmNWVmNTJmNDZl";
const ASAAS_URL = "https://api.asaas.com/v3";

const PACOTES = {
  20:  { valor: 27.00,  creditos: 20,  descricao: "Prótons Prospect — 20 contatos" },
  50:  { valor: 47.00,  creditos: 50,  descricao: "Prótons Prospect — 50 contatos" },
  200: { valor: 147.00, creditos: 200, descricao: "Prótons Prospect — 200 contatos" },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });

  try {
    const { email, nome, creditos, cpf } = req.body;
    if (!email || !creditos) return res.status(400).json({ erro: "Email e créditos obrigatórios" });

    const pacote = PACOTES[Number(creditos)];
    if (!pacote) return res.status(400).json({ erro: "Pacote inválido" });

    // Busca cliente existente
    const buscaResp = await fetch(`${ASAAS_URL}/customers?email=${encodeURIComponent(email)}&limit=1`, {
      headers: { "access_token": ASAAS_KEY },
    });
    const buscaData = await buscaResp.json();
    let clienteId = buscaData?.data?.[0]?.id;

    // Cria cliente se não existir
    if (!clienteId) {
      const body = { name: nome || email.split("@")[0], email, externalReference: email };
      if (cpf) body.cpfCnpj = cpf.replace(/\D/g, "");
      const cr = await fetch(`${ASAAS_URL}/customers`, {
        method: "POST",
        headers: { "access_token": ASAAS_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const c = await cr.json();
      if (!c.id) return res.status(500).json({ erro: "Erro ao criar cliente", detalhe: c });
      clienteId = c.id;
    }

    // Cria cobrança PIX
    const pr = await fetch(`${ASAAS_URL}/payments`, {
      method: "POST",
      headers: { "access_token": ASAAS_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: clienteId,
        billingType: "PIX",
        value: pacote.valor,
        dueDate: new Date(Date.now() + 24*60*60*1000).toISOString().split("T")[0],
        description: pacote.descricao,
        externalReference: email,
      }),
    });
    const cobranca = await pr.json();
    if (!cobranca.id) return res.status(500).json({ erro: "Erro ao gerar PIX", detalhe: cobranca });

    // QR Code
    const qr = await fetch(`${ASAAS_URL}/payments/${cobranca.id}/pixQrCode`, {
      headers: { "access_token": ASAAS_KEY },
    });
    const pix = await qr.json();

    return res.status(200).json({
      ok: true,
      cobranca_id: cobranca.id,
      valor: pacote.valor,
      creditos: pacote.creditos,
      pix_copia_cola: pix.payload || "",
      pix_qrcode: pix.encodedImage || "",
      link_pagamento: cobranca.invoiceUrl || "",
    });

  } catch (e) {
    return res.status(500).json({ erro: "Erro interno", detalhe: e.message });
  }
}
