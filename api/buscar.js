// api/buscar.js — Proxy Casa dos Dados com polling de arquivo
const API_KEY = "64b4a4ee0c6a8f0c68c1fd3b8a802377edaa123d2de0dba7afb356bd8d165b55c496506456420da93d6483203b2713d322e658fca01e62ff3cd86b6476cbf043";
const BASE    = "https://api.casadosdados.com.br";

async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ erro: "Método não permitido" });

  try {
    const { municipio, codigo_atividade_principal, bairro } = req.body;

    // ── PASSO 1: Pesquisa direta v5 ──────────────────────────
    const pesqBody = {
      codigo_atividade_principal: codigo_atividade_principal || [],
      situacao_cadastral: ["ATIVA"],
      municipio: municipio || [],
      ...(bairro && bairro.length ? { bairro } : {}),
      mais_filtros: {
        com_telefone: true,
        somente_matriz: true,
        excluir_email_contab: true,
      },
      limite: 20,
      pagina: 1,
    };

    const pesqResp = await fetch(`${BASE}/v5/cnpj/pesquisa?tipo_resultado=completo`, {
      method: "POST",
      headers: { "api-key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(pesqBody),
    });

    const pesqData = await pesqResp.json();
    console.log("v5 status:", pesqResp.status, "total:", pesqData?.total, "cnpjs:", pesqData?.cnpjs?.length);

    // Se retornou dados direto, usa eles
    if (pesqData?.cnpjs && pesqData.cnpjs.length > 0) {
      return res.status(200).json({ sucesso: true, cnpjs: pesqData.cnpjs, total: pesqData.total, fonte: "v5-direto" });
    }

    // ── PASSO 2: Tenta v4 como fallback ──────────────────────
    const v4Body = {
      query: {
        termo: [],
        atividade_principal: (codigo_atividade_principal || []).map(c => ({ codigo: c })),
        natureza_juridica: [],
        uf: [],
        municipio: (municipio || []).map(m => ({ codigo: m, descricao: m })),
        bairro: (bairro || []).map(b => ({ nome: b })),
        situacao_cadastral: "ATIVA",
        cep: [],
        ddd: [],
      },
      range_query: {
        data_abertura: { lte: null, gte: null },
        capital_social: { lte: null, gte: null },
      },
      extras: {
        somente_mei: false,
        excluir_mei: true,
        com_email: false,
        incluir_atividade_secundaria: false,
        com_contato_telefonico: true,
        somente_fixo: false,
        somente_celular: false,
        somente_matriz: true,
        somente_filial: false,
      },
      page: 1,
    };

    const v4Resp = await fetch(`${BASE}/v2/public/cnpj/search`, {
      method: "POST",
      headers: { "api-key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(v4Body),
    });

    const v4Data = await v4Resp.json();
    console.log("v4 status:", v4Resp.status, "data:", JSON.stringify(v4Data).slice(0, 200));

    if (v4Data?.data && v4Data.data.length > 0) {
      return res.status(200).json({ sucesso: true, cnpjs: v4Data.data, total: v4Data.count || v4Data.data.length, fonte: "v4" });
    }

    // Retorna o que tiver mesmo que vazio para diagnóstico
    return res.status(200).json({
      sucesso: true,
      cnpjs: [],
      total: 0,
      fonte: "sem-resultado",
      debug_v5: { status: pesqResp.status, total: pesqData?.total, erro: pesqData?.erro || pesqData?.message },
      debug_v4: { status: v4Resp.status, count: v4Data?.count, erro: v4Data?.erro || v4Data?.message },
    });

  } catch (erro) {
    console.error("Erro buscar.js:", erro.message);
    return res.status(500).json({ erro: "Erro interno", detalhe: erro.message });
  }
}
