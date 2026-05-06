// api/pagar.js — Cria cobrança PIX no Asaas
const ASAAS_KEY = process.env.ASAAS_KEY || "$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmM2OWU0YTNmLWVmYTQtNDhjOC04ZmU3LTdjNDczMDIzOGI0Yzo6JGFhY2hfNjBhZmMyMTQtZGQ5ZS00ZDI4LTgwN2UtZTdmNWVmNTJmNDZl";
const ASAAS_URL = "https://api.asaas.com/v3";

const PACOTES = {
  20:  { valor: 27.00,  creditos: 20,  descricao: "Protons Prospect - 20 contatos" },
  50:  { valor: 47.00,  creditos: 50,  descricao: "Protons Prospect - 50 contatos" },
  200: { valor: 147.00, creditos: 200, descricao: "Protons Prospect - 200 contatos" },
};

const H = { "access_token": ASAAS_KEY, "Content-Type": "application/json" };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ erro: "Método não permitido" });

  try {
    const { email, nome, creditos, cpf } = req.body || {};
    if (!email || !creditos) return res.status(400).json({ erro: "Email e creditos sao obrigatorios" });

    const pacote = PACOTES[Number(creditos)];
    if (!pacote) return res.status(400).json({ erro: "Pacote invalido. Use 20, 50 ou 200" });

    // 1. Busca cliente existente pelo externalReference (email)
    let clienteId = null;
    try {
      const bResp = await fetch(`${ASAAS_URL}/customers?externalReference=${encodeURIComponent(email)}&limit=1`, { headers: H });
      const bData = await bResp.json();
      clienteId = bData?.data?.[0]?.id || null;
    } catch {}

    // 2. Cria cliente se não existir
    if (!clienteId) {
      const clienteBody = {
        name: (nome || email.split("@")[0]).slice(0, 100),
        email: email.toLowerCase().trim(),
        externalReference: email,
      };
      // CPF melhora aprovação no Asaas
      if (cpf) clienteBody.cpfCnpj = cpf.replace(/\D/g, "");

      const cResp = await fetch(`${ASAAS_URL}/customers`, {
        method: "POST", headers: H,
        body: JSON.stringify(clienteBody),
      });
      const cData = await cResp.json();
      console.log("Cliente Asaas:", JSON.stringify(cData));
      if (!cData.id) return res.status(500).json({ erro: "Erro ao criar cliente no Asaas", detalhe: cData });
      clienteId = cData.id;
    }

    // 3. Cria cobrança PIX
    const vencimento = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split("T")[0];
    const pResp = await fetch(`${ASAAS_URL}/payments`, {
      method: "POST", headers: H,
      body: JSON.stringify({
        customer:          clienteId,
        billingType:       "PIX",
        value:             pacote.valor,
        dueDate:           vencimento,
        description:       pacote.descricao,
        externalReference: email,
      }),
    });
    const pData = await pResp.json();
    console.log("Cobranca Asaas:", JSON.stringify(pData));
    if (!pData.id) return res.status(500).json({ erro: "Erro ao gerar cobranca PIX", detalhe: pData });

    // 4. Busca QR Code PIX
    let pixPayload = "", pixQrcode = "";
    try {
      const qResp = await fetch(`${ASAAS_URL}/payments/${pData.id}/pixQrCode`, { headers: H });
      const qData = await qResp.json();
      pixPayload = qData.payload    || "";
      pixQrcode  = qData.encodedImage || "";
    } catch {}

    return res.status(200).json({
      ok:              true,
      cobranca_id:     pData.id,
      valor:           pacote.valor,
      creditos:        pacote.creditos,
      pix_copia_cola:  pixPayload,
      pix_qrcode:      pixQrcode,
      link_pagamento:  pData.invoiceUrl || "",
      vencimento,
    });

  } catch (e) {
    console.error("pagar.js erro:", e.message);
    return res.status(500).json({ erro: "Erro interno", detalhe: e.message });
  }
}
