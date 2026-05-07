// api/buscar.js — Versão Final Jarvis Pro (Padrão Pesquisa Avançada V5)
const API_KEY = process.env.CASA_DADOS_KEY || "3190d01bb2c40704162354e15d634c35a83fa8a064d0845f114c28cb8c3970da52b392aaf002b981924eb36f3bef1d0169f441557dbc70caafde0b56d508fa51";

export default async function handler(req, res) {
    // Configurações de segurança para permitir que o App fale com a API
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();

    try {
        const { municipio, codigo_atividade_principal, bairro } = req.body;

        // Configuração dos Cabeçalhos (Headers) conforme seu Request
        const myHeaders = {
            "api-key": API_KEY,
            "Content-Type": "application/json"
        };

        // Montagem do corpo da requisição (raw) seguindo exatamente o seu exemplo
        const raw = JSON.stringify({
            "codigo_atividade_principal": codigo_atividade_principal || [],
            "situacao_cadastral": ["ATIVA"],
            "municipio": municipio ? [municipio.toUpperCase()] : [],
            "bairro": bairro ? [bairro.toUpperCase()] : [],
            "mais_filtros": {
                "somente_matriz": true,
                "somente_celular": true,
                "com_telefone": true
            },
            "limite": 20, // Traz 20 resultados por vez
            "pagina": 1
        });

        // Chamada para a URL oficial de pesquisa V5 que você enviou
        // Adicionamos ?tipo_resultado=completo para garantir que venham os dados de contato
        const response = await fetch("https://api.casadosdados.com.br/v5/cnpj/pesquisa?tipo_resultado=completo", {
            method: 'POST',
            headers: myHeaders,
            body: raw,
            redirect: 'follow'
        });

        const result = await response.json();

        // Enviando os dados organizados de volta para o seu site
        return res.status(200).json({
            sucesso: true,
            data: { 
                cnpj: result.cnpjs || [] 
            }
        });

    } catch (error) {
        console.error('Erro Jarvis API:', error);
        return res.status(500).json({ erro: "Erro ao conectar com a base de dados" });
    }
}
