import React, { useState, useEffect, useRef } from "react";

// ── CONFIGURAÇÕES ──────────────────────────────────────────────
const GOLD = "#F5C518";
const GOLD2 = "#C9A227";
const DARK = "#1a1a1a";

// ── COMPONENTE PRINCIPAL ───────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [tela, setTela] = useState("prospeccao");
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");
  const [segmento, setSegmento] = useState("arquitetura");

  // Simulação de usuário logado
  useEffect(() => {
    setUser({ nome: "Usuário", creditos: 50 });
  }, []);

  // ── FUNÇÃO DE BUSCA (API V5) ────────────────────────────────
  async function buscarEmpresas() {
    if (!cidade) return alert("Digite a cidade para buscar.");
    setLoading(true);
    try {
      const response = await fetch("/api/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          municipio: cidade, // O backend tratará como lista e Uppercase
          bairro: bairro,
          codigo_atividade_principal: getCNAE(segmento)
        })
      });
      const res = await response.json();
      if (res.data && res.data.cnpj) {
        setResultados(res.data.cnpj);
      } else {
        setResultados([]);
        alert("Nenhuma empresa encontrada com esses filtros.");
      }
    } catch (error) {
      alert("Erro ao conectar na API. Verifique sua chave.");
    }
    setLoading(false);
  }

  function getCNAE(s) {
    const table = {
      arquitetura: ["7111100"],
      engenharia: ["7112000"],
      construtora: ["4120400"],
      imobiliaria: ["6821801"]
    };
    return table[s] || ["7111100"];
  }

  // ── RENDERIZAÇÃO ─────────────────────────────────────────────
  return (
    <div style={styles.container}>
      <style>{CSS_GLOBAL}</style>
      
      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.logo}>⚡ PRÓTONS PROSPECT</div>
        <div style={styles.creditos}>🪙 {user?.creditos} créditos</div>
      </header>

      <main style={styles.main}>
        {tela === "prospeccao" && (
          <div className="fade-in">
            <h2 style={styles.tituloSecao}>📡 Prospecção Avançada</h2>
            
            {/* BOX DE BUSCA */}
            <div className="card-busca">
              <label className="lbl">CIDADE</label>
              <input 
                className="inp" 
                value={cidade} 
                onChange={e => setCidade(e.target.value)} 
                placeholder="Ex: São Paulo"
              />
              
              <label className="lbl">BAIRRO (OPCIONAL)</label>
              <input 
                className="inp" 
                value={bairro} 
                onChange={e => setBairro(e.target.value)} 
                placeholder="Ex: Centro"
              />

              <label className="lbl">SEGMENTO</label>
              <div className="grid-segs">
                {["arquitetura", "engenharia", "construtora", "imobiliaria"].map(s => (
                  <button 
                    key={s}
                    onClick={() => setSegmento(s)}
                    className={segmento === s ? "btn-seg active" : "btn-seg"}
                  >
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>

              <button className="btn-principal" onClick={buscarEmpresas} disabled={loading}>
                {loading ? "BUSCANDO..." : "🔍 BUSCAR EMPRESAS"}
              </button>
            </div>

            {/* LISTAGEM */}
            <div style={{marginTop: 20}}>
              {resultados.map((emp, i) => (
                <div key={i} className="card-empresa">
                  <div style={{flex: 1}}>
                    <div className="emp-nome">{emp.razao_social}</div>
                    <div className="emp-sub">{emp.endereco?.bairro} - {emp.endereco?.municipio}</div>
                  </div>
                  <button className="btn-wa" onClick={() => window.open(`https://wa.me/55${emp.ddd}${emp.telefone}`)}>
                    WhatsApp
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tela === "calc" && <CalculadoraEletrica />}
      </main>

      {/* MENU INFERIOR */}
      <nav style={styles.nav}>
        <div onClick={() => setTela("prospeccao")} className={tela === "prospeccao" ? "nav-item active" : "nav-item"}>📡<br/>Prospect</div>
        <div onClick={() => setTela("calc")} className={tela === "calc" ? "nav-item active" : "nav-item"}>⚡<br/>Calculadora</div>
        <div className="nav-item">📋<br/>OS</div>
        <div className="nav-item">👤<br/>Perfil</div>
      </nav>
    </div>
  );
}

// ── COMPONENTE CALCULADORA ─────────────────────────────────────
function CalculadoraEletrica() {
  return (
    <div className="fade-in">
      <h2 style={styles.tituloSecao}>⚡ Dimensionamento NBR 5410</h2>
      <div className="card-busca">
        <p style={{fontSize: 13, color: "#666"}}>Selecione o tipo de carga para calcular cabo e disjuntor.</p>
        <div className="grid-segs" style={{marginTop: 15}}>
          <button className="btn-seg">TOMADAS</button>
          <button className="btn-seg">CHUVEIRO</button>
          <button className="btn-seg">AR COND.</button>
          <button className="btn-seg">MOTORES</button>
        </div>
        <div style={{marginTop: 20, textAlign: 'center', color: '#999', fontSize: 12}}>
          Funcionalidade de cálculo em processamento...
        </div>
      </div>
    </div>
  );
}

// ── ESTILOS ───────────────────────────────────────────────────
const styles = {
  container: { background: "#F4F4F4", minHeight: "100vh", paddingBottom: "100px" },
  header: { background: DARK, padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 10px rgba(0,0,0,0.3)" },
  logo: { color: GOLD, fontWeight: "900", fontSize: "18px" },
  creditos: { background: GOLD, padding: "5px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" },
  main: { padding: "15px" },
  tituloSecao: { fontSize: "16px", fontWeight: "800", color: "#333", marginBottom: "15px" },
  nav: { position: "fixed", bottom: 0, width: "100%", background: "#FFF", display: "flex", justifyContent: "space-around", padding: "12px 0", borderTop: "1px solid #DDD" }
};

const CSS_GLOBAL = `
  .fade-in { animation: fadeIn 0.5s ease-in; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .card-busca { background: #FFF; padding: 20px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
  .lbl { font-size: 10px; font-weight: 800; color: #999; display: block; margin-bottom: 5px; margin-top: 15px; }
  .inp { width: 100%; padding: 15px; border-radius: 12px; border: 1px solid #EEE; background: #FAFAFA; font-size: 15px; box-sizing: border-box; }
  .grid-segs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .btn-seg { padding: 12px; border-radius: 10px; border: 1px solid #EEE; background: #FFF; font-size: 11px; font-weight: bold; cursor: pointer; }
  .btn-seg.active { background: #FFFDF0; border: 2px solid ${GOLD}; color: ${GOLD2}; }
  .btn-principal { width: 100%; background: linear-gradient(135deg, ${GOLD}, ${GOLD2}); border: none; padding: 18px; border-radius: 15px; color: #1a1a1a; font-weight: 900; font-size: 15px; margin-top: 20px; cursor: pointer; }
  .card-empresa { background: #FFF; padding: 15px; border-radius: 15px; margin-bottom: 12px; display: flex; align-items: center; border-left: 5px solid ${GOLD}; }
  .emp-nome { font-size: 13px; font-weight: 800; color: #333; text-transform: uppercase; }
  .emp-sub { font-size: 11px; color: #888; }
  .btn-wa { background: #25D366; color: #FFF; border: none; padding: 10px 15px; border-radius: 10px; font-weight: bold; font-size: 12px; }
  .nav-item { text-align: center; font-size: 10px; color: #BBB; font-weight: bold; cursor: pointer; }
  .nav-item.active { color: ${GOLD2}; }
`;
