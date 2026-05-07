import { useState, useRef, useEffect } from "react";

// ── CONFIG ────────────────────────────────────────────────────
const SUPA_URL = "https://hrqhqqakvkdkapfijhij.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhycWhxcWFrdmtka2FwZmlqaGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDc1OTYsImV4cCI6MjA5MzU4MzU5Nn0.5YM_CUIuaSmb4lZngDXqJdEuPbGF53F5Qc9nbXLkk2k";
const GOLD     = "#F5C518";
const GOLD2    = "#C9A227";
const DARK     = "#1a1a1a";

// ── UTILS ─────────────────────────────────────────────────────
const fmt  = v => (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const hoje = () => new Date().toLocaleDateString("pt-BR");
const uid  = () => Date.now().toString(36)+Math.random().toString(36).slice(2,6);

// ── SUPABASE ──────────────────────────────────────────────────
const SH = {"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Content-Type":"application/json"};
async function dbGet(t,c,v){try{const r=await fetch(`${SUPA_URL}/rest/v1/${t}?${c}=eq.${encodeURIComponent(v)}&select=*&order=criado_em.desc`,{headers:SH});return await r.json();}catch{return[];}}
async function dbIns(t,d){try{const r=await fetch(`${SUPA_URL}/rest/v1/${t}`,{method:"POST",headers:{...SH,"Prefer":"return=representation"},body:JSON.stringify(d)});const j=await r.json();return Array.isArray(j)?j[0]:j;}catch{return null;}}

async function fazerLogin(email,senha){
  const rows=await dbGet("usuarios","email",email.toLowerCase().trim());
  if(!rows||rows.length===0)return{erro:"E-mail não encontrado."};
  const u=rows[0];
  if(u.senha!==senha)return{erro:"Senha incorreta."};
  return{usuario:u};
}

async function fazerCadastro(nome,email,senha){
  const ex=await dbGet("usuarios","email",email.toLowerCase().trim());
  if(ex&&ex.length>0)return{erro:"E-mail já cadastrado."};
  const u=await dbIns("usuarios",{nome,email:email.toLowerCase().trim(),senha,plano:"gratis",assinatura_ativa:false,creditos_prospeccao:5});
  if(!u)return{erro:"Erro ao criar conta."};
  return{usuario:u};
}

// ── BUSCA DE EMPRESAS (VIA VERCEL API) ────────────────────────
const CNAES={
  arquitetura:["7111100"],engenharia:["7112000"],
  construtora:["4120400","4399103"],imobiliaria:["6821801","6821802"],
  industria:["2899199","2812200"],comercio:["4789099","4744001"],
  hospital:["8610101","8630501"],escola:["8513900","8520100"],
  condominio:["8112500","6810202"],supermercado:["4711301","4711302"]
};

async function buscarEmpresas(municipio, bairro, seg){
  try {
    const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().trim();
    const body = {
      filters: {
        municipio: [norm(municipio)],
        codigo_atividade_principal: CNAES[seg] || ["7111100"],
        situacao_cadastral: "ATIVA"
      }
    };
    if(bairro) body.filters.bairro = [norm(bairro)];

    const r = await fetch("/api/buscar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if(!r.ok) return null;
    return await r.json();
  } catch(e) {
    console.error("Erro de busca:", e);
    return null;
  }
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [tela, setTela] = useState("prospecção");
  const [loading, setLoading] = useState(false);

  // Estados da Busca
  const [cid, setCid] = useState("");
  const [bai, setBai] = useState("");
  const [seg, setSeg] = useState("arquitetura");
  const [resultados, setResultados] = useState([]);

  useEffect(() => {
    const saved = sessionStorage.getItem("protons_u");
    if(saved) setUser(JSON.parse(saved));
  }, []);

  async function executarBusca() {
    if(!cid) return alert("Digite ao menos a cidade!");
    setLoading(true);
    const res = await buscarEmpresas(cid, bai, seg);
    setLoading(false);
    
    if(res && res.data && res.data.cnpj) {
      setResultados(res.data.cnpj);
    } else {
      alert("Nenhuma empresa encontrada ou erro no servidor.");
    }
  }

  if(!user) return <TelaLogin onLogin={setUser} />;

  return (
    <div style={{minHeight:"100vh", background:"#f5f5f5", fontFamily:"'Nunito', sans-serif"}}>
      <style>{CSS}</style>
      
      {/* Header */}
      <header style={{background:DARK, padding:20, color:GOLD, textAlign:"center", boxShadow:"0 4px 10px rgba(0,0,0,0.2)"}}>
        <h1 style={{margin:0, fontSize:22, fontWeight:900}}>⚡ PRÓTONS PROSPECT</h1>
        <p style={{margin:0, fontSize:12, color:"#aaa"}}>Olá, {user.nome} | Créditos: {user.creditos_prospeccao || 0}</p>
      </header>

      {/* Menu Rápido */}
      <nav style={{display:"flex", overflowX:"auto", gap:10, padding:15, background:"#fff"}}>
        <button onClick={()=>setTela("prospecção")} className={tela==="prospecção"?"btn btn-gold":"btn btn-ghost"}>🔍 Busca</button>
        <button onClick={()=>setTela("calculadora")} className={tela==="calculadora"?"btn btn-gold":"btn btn-ghost"}>⚡ Calc</button>
        <button onClick={()=>setTela("financeiro")} className={tela==="financeiro"?"btn btn-gold":"btn btn-ghost"}>💰 Finan</button>
      </nav>

      {/* Conteúdo */}
      <main style={{padding:15}}>
        {tela === "prospecção" && (
          <div className="fadeUp">
            <div className="card" style={{padding:20, marginBottom:20}}>
              <label className="lbl">Cidade</label>
              <input className="inp" value={cid} onChange={e=>setCid(e.target.value)} placeholder="Ex: São Paulo" />
              
              <label className="lbl" style={{marginTop:15}}>Bairro (Opcional)</label>
              <input className="inp" value={bai} onChange={e=>setBai(e.target.value)} placeholder="Ex: Centro" />
              
              <label className="lbl" style={{marginTop:15}}>Segmento</label>
              <select className="sel" value={seg} onChange={e=>setSeg(e.target.value)}>
                {Object.keys(CNAES).map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>

              <button onClick={executarBusca} className="btn btn-gold" style={{width:"100%", marginTop:20, height:50}} disabled={loading}>
                {loading ? "BUSCANDO..." : "BUSCAR EMPRESAS"}
              </button>
            </div>

            {resultados.map((emp, i) => (
              <div key={i} className="card" style={{padding:15, marginBottom:10, borderLeft:`5px solid ${GOLD}`}}>
                <div style={{fontWeight:800, fontSize:15}}>{emp.razao_social}</div>
                <div style={{fontSize:13, color:"#666"}}>{emp.bairro} - {emp.municipio}</div>
                <div style={{marginTop:10, display:"flex", gap:10}}>
                   <button className="btn btn-wa" onClick={()=>window.open(`https://wa.me/55${emp.numero_ddd}${emp.numero_telefone}`, '_blank')}>
                     WhatsApp
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tela === "calculadora" && <div className="card" style={{padding:20}}>Funcionalidade Calculadora (Ativa)</div>}
      </main>
    </div>
  );
}

// ── COMPONENTE LOGIN ──────────────────────────────────────────
function TelaLogin({onLogin}){
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleLogin() {
    setCarregando(true);
    const res = await fazerLogin(email, senha);
    setCarregando(false);
    if(res.erro) alert(res.erro);
    else {
      sessionStorage.setItem("protons_u", JSON.stringify(res.usuario));
      onLogin(res.usuario);
    }
  }

  return (
    <div style={{height:"100vh", background:DARK, display:"flex", alignItems:"center", justifyContent:"center", padding:20}}>
      <div className="card" style={{padding:30, width:"100%", maxWidth:400, textAlign:"center"}}>
        <div style={{fontSize:40, marginBottom:10}}>⚡</div>
        <h2 style={{margin:"0 0 20px 0"}}>PRÓTONS LOGIN</h2>
        <input className="inp" placeholder="E-mail" onChange={e=>setEmail(e.target.value)} />
        <input className="inp" type="password" placeholder="Senha" style={{marginTop:10}} onChange={e=>setSenha(e.target.value)} />
        <button onClick={handleLogin} className="btn btn-gold" style={{width:"100%", marginTop:20, height:50}}>
          {carregando ? "ENTRANDO..." : "ENTRAR"}
        </button>
      </div>
    </div>
  );
}

// ── CSS ───────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&display=swap');
  .card { background:#fff; border-radius:15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); overflow:hidden; }
  .inp { width:100%; padding:12px; border:1px solid #ddd; border-radius:10px; outline:none; }
  .sel { width:100%; padding:12px; border:1px solid #ddd; border-radius:10px; background:#fff; }
  .lbl { font-size:11px; font-weight:800; color:#888; display:block; margin-bottom:5px; }
  .btn { border:none; border-radius:10px; padding:10px 20px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; }
  .btn-gold { background:${GOLD}; color:${DARK}; }
  .btn-ghost { background:#eee; color:#666; }
  .btn-wa { background:#25D366; color:#fff; width:100%; }
  .fadeUp { animation: fup 0.4s ease; }
  @keyframes fup { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
`;
