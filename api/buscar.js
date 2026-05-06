export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });

  try {
    // Tenta v2 primeiro (mais estável)
    const body = req.body;
    const bodyV2 = {
      query: {
        termo: body.municipio || [],
        atividade_principal: body.codigo_atividade_principal || [],
        natureza_juridica: [],
        uf: [],
        municipio: body.municipio || [],
        bairro: body.bairro || [],
        situacao_cadastral: "ATIVA",
        cep: [],
        ddd: []
      },
      range_query: {
        data_abertura: { lte: null, gte: null },
        capital_social: { lte: null, gte: null }
      },
      extras: {
        somente_mei: false,
        excluir_mei: false,
        com_email: false,
        incluir_atividade_secundaria: false,
        com_contato_telefonico: true,
        somente_fixo: false,
        somente_celular: false,
        somente_matriz: false,
        somente_filial: false
      },
      page: 1
    };

    const resposta = await fetch("https://api.casadosdados.com.br/v2/public/cnpj/pesquisa", {
      method: "POST",
      headers: {
        "api-key": "64b4a4ee0c6a8f0c68c1fd3b8a802377edaa123d2de0dba7afb356bd8d165b55c496506456420da93d6483203b2713d322e658fca01e62ff3cd86b6476cbf043",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyV2),
    });

    const data = await resposta.json();
    return res.status(200).json(data);

  } catch (erro) {
    return res.status(500).json({ erro: "Erro ao buscar empresas", detalhe: erro.message });
  }
}
