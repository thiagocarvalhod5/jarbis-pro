// api/buscar.js — Casa dos Dados com Polling de Arquivo
// Chave via variável de ambiente (seguro)
const API_KEY = process.env.CASA_DADOS_KEY || "64b4a4ee0c6a8f0c68c1fd3b8a802377edaa123d2de0dba7afb356bd8d165b55c496506456420da93d6483203b2713d322e658fca01e62ff3cd86b6476cbf043";
const BASE    = "https://api.casadosdados.com.br";

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ erro: "Método não permitido" });

  try {
    const { municipio, codigo_atividade_principal, bairro } = req.body;

    const H = { "api-key": API_KEY, "Content-Type": "application/json" };

    // ── PASSO 1: Pesquisa direta v5 ──────────────────────────
    const pesqBody = {
      codigo_atividade_principal: codigo_atividade_principal || [],
      situacao_cadastral: ["ATIVA"],
      municipio: municipio || [],
      ...(bairro && bairro.length ? { bairro } : {}),
      mais_filtros: {
        com_telefone:       true,
        somente_matriz:     true,
        excluir_email_contab: true,
      },
      limite: 20,
      pagina: 1,
    };

    const pesqResp = await fetch(`${BASE}/v5/cnpj/pesquisa?tipo_resultado=completo`, {
      method: "POST", headers: H,
      body: JSON.stringify(pesqBody),
    });
    const pesqData = await pesqResp.json();

    // Se v5 retornou dados direto — usa eles
    if (pesqData?.cnpjs?.length > 0) {
      return res.status(200).json({
        sucesso: true,
        cnpjs: pesqData.cnpjs,
        total: pesqData.total || pesqData.cnpjs.length,
        fonte: "v5-direto"
      });
    }

    // ── PASSO 2: Gera arquivo via v5 para obter UUID ─────────
    const gerarBody = {
      total_linhas: 50,
      nome: "protons-prospect",
      tipo: "json",
      pesquisa: {
        codigo_atividade_principal: codigo_atividade_principal || [],
        situacao_cadastral: ["ATIVA"],
        municipio: municipio || [],
        ...(bairro && bairro.length ? { bairro } : {}),
        mais_filtros: {
          com_telefone:   true,
          somente_matriz: true,
        },
      },
    };

    const gerarResp = await fetch(`${BASE}/v5/cnpj/pesquisa/arquivo`, {
      method: "POST", headers: H,
      body: JSON.stringify(gerarBody),
    });
    const gerarData = await gerarResp.json();
    const uuid = gerarData?.arquivo_uuid || gerarData?.uuid || null;

    // ── PASSO 3: Polling — aguarda arquivo ficar pronto ──────
    if (uuid) {
      let link = null;
      let tentativas = 0;
      const maxTentativas = 12; // até 60 segundos

      while (!link && tentativas < maxTentativas) {
        await sleep(5000); // aguarda 5 segundos
        tentativas++;

        const checkResp = await fetch(`${BASE}/v4/public/cnpj/pesquisa/arquivo/${uuid}`, {
          headers: H,
        });
        const checkData = await checkResp.json();

        if (checkData?.link) {
          link = checkData.link;
        }
      }

      if (link) {
        // Baixa e processa o arquivo JSON
        const arquivoResp = await fetch(link);
        const arquivoData = await arquivoResp.json().catch(async()=>{
          // Tenta como texto CSV se não for JSON
          const texto = await arquivoResp.text();
          return { raw: texto };
        });

        const cnpjs = Array.isArray(arquivoData)
          ? arquivoData
          : arquivoData?.data || arquivoData?.cnpjs || [];

        return res.status(200).json({
          sucesso: true,
          cnpjs,
          total: cnpjs.length,
          fonte: "v5-arquivo"
        });
      }
    }

    // ── FALLBACK: v4 pesquisa direta ─────────────────────────
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
      method: "POST", headers: H,
      body: JSON.stringify(v4Body),
    });
    const v4Data = await v4Resp.json();

    if (v4Data?.data?.length > 0) {
      return res.status(200).json({
        sucesso: true,
        cnpjs: v4Data.data,
        total: v4Data.count || v4Data.data.length,
        fonte: "v4"
      });
    }

    // Sem resultados
    return res.status(200).json({
      sucesso: true,
      cnpjs: [],
      total: 0,
      fonte: "sem-resultado",
      debug: {
        v5_status: pesqResp.status,
        v5_total: pesqData?.total,
        v5_erro: pesqData?.erro || pesqData?.message,
        v4_status: v4Resp.status,
        v4_count: v4Data?.count,
        uuid: uuid || "não gerado",
      }
    });

  } catch (e) {
    console.error("buscar.js erro:", e.message);
    return res.status(500).json({ erro: "Erro interno", detalhe: e.message });
  }
}
