export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });

  try {
    const { municipio, codigo_atividade_principal, bairro } = req.body;

    // Formato correto da API v5 Casa dos Dados
    const bodyV5 = {
      codigo_atividade_principal: codigo_atividade_principal || [],
      situacao_cadastral: ["ATIVA"],
      municipio: municipio || [],
      ...(bairro && bairro.length > 0 ? { bairro } : {}),
      matriz_filial: "MATRIZ",
      limite: 20,
      pagina: 1
    };

    const resposta = await fetch("https://api.casadosdados.com.br/v5/cnpj/pesquisa", {
      method: "POST",
      headers: {
        "api-key": "64b4a4ee0c6a8f0c68c1fd3b8a802377edaa123d2de0dba7afb356bd8d165b55c496506456420da93d6483203b2713d322e658fca01e62ff3cd86b6476cbf043",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyV5),
    });

    const data = await resposta.json();
    return res.status(200).json(data);

  } catch (erro) {
    return res.status(500).json({ erro: "Erro ao buscar empresas", detalhe: erro.message });
  }
}
