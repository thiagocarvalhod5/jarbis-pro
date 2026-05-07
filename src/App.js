import React, { useState, useEffect } from "react";

// --- CONFIGURAÇÕES ---
const GOLD = "#F5C518";
const DARK = "#1a1a1a";

export default function App() {
  const [user, setUser] = useState(null);
  const [tela, setTela] = useState("prospeccao");
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState([]);
  
  // Estados de busca
  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");
  const [segmento, setSegmento] = useState("");

  // Simulação de login para manter o design
  useEffect(() => {
    const logado = sessionStorage.getItem("jarvis_user");
    if (logado) setUser(JSON.parse(logado));
  }, []);

  async function handleBusca() {
    if (!cidade) return alert("Por favor, digite uma cidade.");
    setLoading(true);
    try {
      const res = await fetch("/api/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          municipio: [cidade.toUpperCase()],
          bairro: bairro ? [bairro.toUpperCase()] : [],
          codigo_atividade_principal: segmento ? [segmento] : ["7111100"] 
        })
      });
      const json = await res.json();
      if (json.data && json.data.cnpj) {
        setResultados(json.data.cnpj);
      } else {
        alert("Nenhum resultado encontrado.");
      }
    } catch (e) {
      alert("Erro ao conectar. Verifique a cidade e tente novamente.");
    }
    setLoading(false);
  }

  return (
    <div style={styles.container}>
      <style>{CSS_DESIGN}</style>
      
      {/* Header Original */}
      <header style={styles.header}>
        <div style={styles.logo}>⚡ JARVIS PRO</div>
      </header>

      {/* Área de Busca (Filtros) */}
      <main style={styles.main}>
        <div className="card-busca">
          <div className="input-group">
            <label>CIDADE (OBRIGATÓRIO)</label>
            <input 
              value={cidade} 
              onChange={e => setCidade(e.target.value)} 
              placeholder="Ex: Manaus"
            />
          </div>
          
          <div className="input-group">
            <label>BAIRRO (OPCIONAL)</label>
            <input 
              value={bairro} 
              onChange={e => setBairro(e.target.value)} 
              placeholder="Ex: Centro, Boa Viagem..."
            />
          </div>

          <div style={styles.gridCategorias}>
             <button onClick={() => setSegmento("7111100")} className={segmento === "7111100" ? "btn-cat active" : "btn-cat"}>📐 Arquitetos</button>
             <button onClick={() => setSegmento("7112000")} className={segmento === "7112000" ? "btn-cat active" : "btn-cat"}>⚙️ Engenheiros</button>
             <button onClick={() => setSegmento("4120400")} className={segmento === "4120400" ? "btn-cat active" : "btn-cat"}>🏗️ Construtoras</button>
             <button onClick={() => setSegmento("6821801")} className={segmento === "6821801" ? "btn-cat active" : "btn-cat"}>🏠 Imobiliárias</button>
          </div>

          <button onClick={handleBusca} style={styles.btnBusca} disabled={loading}>
            {loading ? "BUSCANDO..." : "🔍 Buscar Novamente"}
          </button>
        </div>

        {/* Lista de Resultados conforme o Design Original */}
        <div style={{marginTop: 20}}>
          {resultados.map((item, i) => (
            <div key={i} className="empresa-card">
              <div className="empresa-info">
                <strong>{item.razao_social}</strong>
                <span>{item.endereco?.bairro} - {item.endereco?.municipio}</span>
              </div>
              <button className="btn-whatsapp">WhatsApp</button>
            </div>
          ))}
        </div>
      </main>

      {/* Menu Inferior Original */}
      <footer style={styles.footer}>
        <div className="nav-item">🏠<br/>Início</div>
        <div className="nav-item active">📡<br/>Prospecção</div>
        <div className="nav-item">📋<br/>OS</div>
        <div className="nav-item">👥<br/>Clientes</div>
        <div className="nav-item">⚡<br/>Calc</div>
      </footer>
    </div>
  );
}

// --- ESTILOS CSS (O DESIGN QUE VOCÊ TINHA) ---
const styles = {
  container: { background: "#f0f0f0", minHeight: "100vh", paddingBottom: "80px", fontFamily: 'sans-serif' },
  header: { background: DARK, padding: "15px", textAlign: "center", color: GOLD, boxShadow: "0 2px 5px rgba(0,0,0,0.2)" },
  logo: { fontWeight: "bold", fontSize: "18px", letterSpacing: "1px" },
  main: { padding: "15px" },
  gridCategorias: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "15px" },
  btnBusca: { width: "100%", background: GOLD, border: "none", padding: "15px", borderRadius: "10px", fontWeight: "bold", marginTop: "20px", cursor: "pointer", fontSize: "16px" },
  footer: { position: "fixed", bottom: 0, width: "100%", background: "#fff", display: "flex", justifyContent: "space-around", padding: "10px 0", borderTop: "1px solid #ddd" }
};

const CSS_DESIGN = `
  .card-busca { background: #fff; padding: 20px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
  .input-group label { display: block; font-size: 10px; font-weight: bold; color: #888; margin-bottom: 5px; margin-top: 10px; }
  .input-group input { width: 100%; padding: 12px; border: 1px solid #eee; border-radius: 8px; background: #fafafa; outline: none; box-sizing: border-box; }
  .btn-cat { background: #fff; border: 1px solid #eee; padding: 12px; border-radius: 10px; font-size: 12px; text-align: left; cursor: pointer; transition: 0.2s; }
  .btn-cat.active { border: 2px solid ${GOLD}; background: #fffdf0; }
  .empresa-card { background: #fff; padding: 15px; border-radius: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border-left: 5px solid ${GOLD}; }
  .empresa-info { display: flex; flex-direction: column; max-width: 70%; }
  .empresa-info strong { font-size: 14px; color: #333; text-transform: uppercase; }
  .empresa-info span { font-size: 12px; color: #777; }
  .btn-whatsapp { background: #25D366; color: #fff; border: none; padding: 8px 12px; border-radius: 8px; font-weight: bold; font-size: 12px; }
  .nav-item { text-align: center; font-size: 10px; color: #888; cursor: pointer; }
  .nav-item.active { color: ${GOLD}; border-top: 2px solid ${GOLD}; padding-top: 8px; }
`;
