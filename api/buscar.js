// api/buscar.js — Casa dos Dados
const API_KEY = process.env.CASA_DADOS_KEY || "64b4a4ee0c6a8f0c68c1fd3b8a802377edaa123d2de0dba7afb356bd8d165b55c496506456420da93d6483203b2713d322e658fca01e62ff3cd86b6476cbf043";
const BASE    = "https://api.casadosdados.com.br";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ erro: "Método não permitido" });

  try {
    const { municipio, codigo_atividade_principal, bairro } = req.body;
    const H = { "api-key": API_KEY, "Content-Type": "application/json" };

    // ── TENTATIVA 1: v5 com celular ──────────────────────────
    const pesqBody = {
      codigo_atividade_principal: codigo_atividade_principal || [],
      situacao_cadastral: ["ATIVA"],
      municipio: municipio || [],
      ...(bairro && bairro.length ? { bairro } : {}),
      mais_filtros: {
        somente_celular: true,
        somente_matriz:  true,
      },
      limite: 20,
      pagina: 1,
    };

    const pesqResp = await fetch(`${BASE}/v5/cnpj/pesquisa?tipo_resultado=completo`, {
      method: "POST", headers: H,
      body: JSON.stringify(pesqBody),
    });
    const pesqData = await pesqResp.json();

    if (pesqData?.cnpjs?.length > 0) {
      return res.status(200).json({
        sucesso: true,
        cnpjs: pesqData.cnpjs,
        total: pesqData.total || pesqData.cnpjs.length,
        fonte: "v5-celular"
      });
    }

    // ── TENTATIVA 2: v5 sem filtro de telefone ───────────────
    const pesqBody2 = {
      codigo_atividade_principal: codigo_atividade_principal || [],
      situacao_cadastral: ["ATIVA"],
      municipio: municipio || [],
      ...(bairro && bairro.length ? { bairro } : {}),
      mais_filtros: {
        somente_matriz: true,
      },
      limite: 20,
      pagina: 1,
    };

    const pesqResp2 = await fetch(`${BASE}/v5/cnpj/pesquisa?tipo_resultado=completo`, {
      method: "POST", headers: H,
      body: JSON.stringify(pesqBody2),
    });
    const pesqData2 = await pesqResp2.json();

    if (pesqData2?.cnpjs?.length > 0) {
      return res.status(200).json({
        sucesso: true,
        cnpjs: pesqData2.cnpjs,
        total: pesqData2.total || pesqData2.cnpjs.length,
        fonte: "v5-sem-filtro"
      });
    }

    // ── TENTATIVA 3: v4 com celular ──────────────────────────
    const v4Body = {
      query: {
        termo: [],
        atividade_principal: (codigo_atividade_principal||[]).map(c=>({codigo:c})),
        natureza_juridica: [],
        uf: [],
        municipio: (municipio||[]).map(m=>({descricao:m})),
        bairro: (bairro||[]).map(b=>({nome:b})),
        situacao_cadastral: "ATIVA",
        cep: [], ddd: [],
      },
      range_query: {
        data_abertura: { lte:null, gte:null },
        capital_social: { lte:null, gte:null },
      },
      extras: {
        somente_mei: false,
        excluir_mei: false,
        com_email: false,
        incluir_atividade_secundaria: false,
        com_contato_telefonico: true,
        somente_fixo: false,
        somente_celular: true,
        somente_matriz: true,
        somente_filial: false,
      },
      page: 1,
    };

    const v4Resp = await fetch(`${BASE}/v2/public/cnpj/search`, {
      method: "POST", headers: H,
      body: JSON.stringify(v4Body),
    });
    const v4Data = await v4Resp.json();

    if (v4Data?.data?.length > 0) {
      return res.status(200).json({
        sucesso: true,
        cnpjs: v4Data.data,
        total: v4Data.count || v4Data.data.length,
        fonte: "v4-celular"
      });
    }

    // ── TENTATIVA 4: v4 sem filtro de telefone ───────────────
    const v4Body2 = {
      query: {
        termo: [],
        atividade_principal: (codigo_atividade_principal||[]).map(c=>({codigo:c})),
        natureza_juridica: [],
        uf: [],
        municipio: (municipio||[]).map(m=>({descricao:m})),
        bairro: (bairro||[]).map(b=>({nome:b})),
        situacao_cadastral: "ATIVA",
        cep: [], ddd: [],
      },
      range_query: {
        data_abertura: { lte:null, gte:null },
        capital_social: { lte:null, gte:null },
      },
      extras: {
        somente_mei: false,
        excluir_mei: false,
        com_email: false,
        incluir_atividade_secundaria: false,
        com_contato_telefonico: false,
        somente_fixo: false,
        somente_celular: false,
        somente_matriz: true,
        somente_filial: false,
      },
      page: 1,
    };

    const v4Resp2 = await fetch(`${BASE}/v2/public/cnpj/search`, {
      method: "POST", headers: H,
      body: JSON.stringify(v4Body2),
    });
    const v4Data2 = await v4Resp2.json();

    if (v4Data2?.data?.length > 0) {
      return res.status(200).json({
        sucesso: true,
        cnpjs: v4Data2.data,
        total: v4Data2.count || v4Data2.data.length,
        fonte: "v4-sem-filtro"
      });
    }

    return res.status(200).json({
      sucesso: true,
      cnpjs: [],
      total: 0,
      fonte: "sem-resultado",
    });

  } catch (e) {
    console.error("buscar.js erro:", e.message);
    return res.status(500).json({ erro: "Erro interno", detalhe: e.message });
  }
}
