import { useState, useRef, useEffect } from "react";

const fmt  = v => (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const fmtN = v => (v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
const hoje = () => new Date().toLocaleDateString("pt-BR");
const uid  = () => Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ── SUPABASE CONFIG ───────────────────────────────────────────
const SUPA_URL  = "https://hrqhqqakvkdkapfijhij.supabase.co";
const SUPA_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhycWhxcWFrdmtka2FwZmlqaGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDc1OTYsImV4cCI6MjA5MzU4MzU5Nn0.5YM_CUIuaSmb4lZngDXqJdEuPbGF53F5Qc9nbXLkk2k";
const HOTMART_URL = "https://hotmart.com/produto/jarbis-pro";

const supa = {
  async query(table, filters={}) {
    let url = SUPA_URL+"/rest/v1/"+table+"?select=*";
    Object.entries(filters).forEach(([k,v])=>{ url+=`&${k}=eq.${encodeURIComponent(v)}`; });
    const r = await fetch(url,{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY}});
    return r.json();
  },
  async insert(table, data) {
    const r = await fetch(SUPA_URL+"/rest/v1/"+table,{
      method:"POST",
      headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Content-Type":"application/json","Prefer":"return=representation"},
      body:JSON.stringify(data)
    });
    return r.json();
  },
  async update(table, id, data) {
    const r = await fetch(SUPA_URL+"/rest/v1/"+table+"?id=eq."+id,{
      method:"PATCH",
      headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Content-Type":"application/json","Prefer":"return=representation"},
      body:JSON.stringify(data)
    });
    return r.json();
  }
};

async function fazerLogin(email, senha) {
  try {
    const rows = await supa.query("usuarios",{email:email.toLowerCase().trim()});
    if(!rows||rows.error||rows.length===0) return {erro:"E-mail não encontrado."};
    const u = rows[0];
    if(u.senha !== senha) return {erro:"Senha incorreta."};
    if(u.expira_em && new Date() > new Date(u.expira_em)) return {erro:"Assinatura expirada.",expirado:true};
    return {usuario:u};
  } catch(e) { return {erro:"Erro de conexão. Tente novamente."}; }
}

async function fazerCadastro(nome, email, senha) {
  try {
    const existe = await supa.query("usuarios",{email:email.toLowerCase().trim()});
    if(existe&&!existe.error&&existe.length>0) return {erro:"E-mail já cadastrado."};
    const rows = await supa.insert("usuarios",{nome,email:email.toLowerCase().trim(),senha,plano:"gratis",assinatura_ativa:false});
    if(!rows||rows.error) return {erro:"Erro ao criar conta."};
    return {usuario:Array.isArray(rows)?rows[0]:rows};
  } catch(e) { return {erro:"Erro de conexão. Tente novamente."}; }
}

// ── SISTEMA DE ACESSO ─────────────────────────────────────────
// Usuários cadastrados (você adiciona aqui quando alguém pagar)
// Formato: { email, senha, nome, plano: "gratis" | "pro", expira: "DD/MM/AAAA" | null }
const USUARIOS = [
  { email:"admin@jarbispro.com",   senha:"jarbis@2025",   nome:"Admin",           plano:"pro",    expira:null },
  { email:"demo@eletricista.com",  senha:"demo123",        nome:"Eletricista Demo", plano:"gratis", expira:null },
  // Adicione seus clientes aqui após o pagamento:
  // { email:"cliente@email.com", senha:"senhaGerada", nome:"Nome Cliente", plano:"pro", expira:"05/06/2025" },
];

// Senha mestra PRO (para ativar plano PRO após pagamento)
const SENHA_PRO_MENSAL = "JARBIS-PRO-MAI25"; // Troque todo mês

function verificarLogin(email, senha) {
  const u = USUARIOS.find(u => u.email.toLowerCase() === email.toLowerCase() && u.senha === senha);
  if (!u) return null;
  // Verifica se expirou
  if (u.expira) {
    const [d,m,a] = u.expira.split("/").map(Number);
    if (new Date() > new Date(a, m-1, d)) return { ...u, plano:"expirado" };
  }
  return u;
}

function ativarPRO(codigo) {
  return codigo.trim().toUpperCase() === SENHA_PRO_MENSAL;
}

// ── TELA DE LOGIN ─────────────────────────────────────────────
function TelaLogin({ onLogin }) {
  const [email,  setEmail]  = useState("");
  const [senha,  setSenha]  = useState("");
  const [nome,   setNome]   = useState("");
  const [erro,   setErro]   = useState("");
  const [load,   setLoad]   = useState(false);
  const [modo,   setModo]   = useState("login");

  async function entrar(e) {
    e.preventDefault();
    if (!email||!senha) { setErro("Preencha e-mail e senha."); return; }
    setLoad(true); setErro("");
    const res = await fazerLogin(email, senha);
    setLoad(false);
    if (res.erro) { setErro(res.erro); return; }
    onLogin(res.usuario);
  }

  async function cadastrar(e) {
    e.preventDefault();
    if (!nome||!email||!senha) { setErro("Preencha todos os campos."); return; }
    if (senha.length<6) { setErro("Senha deve ter pelo menos 6 caracteres."); return; }
    setLoad(true); setErro("");
    const res = await fazerCadastro(nome, email, senha);
    setLoad(false);
    if (res.erro) { setErro(res.erro); return; }
    onLogin(res.usuario);
  }

  return (
    <div style={{minHeight:"100vh",background:"#0b0f1a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        input{font-family:'DM Sans',sans-serif;outline:none;}
        button{font-family:'DM Sans',sans-serif;cursor:pointer;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
        .linp{width:100%;background:#1a2035;border:1.5px solid rgba(255,255,255,.08);color:#e2e8f0;border-radius:12px;padding:14px 16px;font-size:16px;transition:border .2s;}
        .linp:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.1);}
      `}</style>

      {/* Logo */}
      <div style={{textAlign:"center",marginBottom:32,animation:"fadeUp .5s ease"}}>
        <div style={{width:64,height:64,borderRadius:18,background:"linear-gradient(135deg,#6366f1,#818cf8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,margin:"0 auto 14px",boxShadow:"0 8px 32px rgba(99,102,241,.4)"}}>⚡</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,background:"linear-gradient(135deg,#6366f1,#818cf8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:2}}>JARBIS PRO</div>
        <div style={{fontSize:13,color:"#475569",marginTop:4}}>Sistema do Eletricista Profissional</div>
      </div>

      {/* Card */}
      <div style={{width:"100%",maxWidth:400,background:"#111827",border:"1px solid rgba(255,255,255,.07)",borderRadius:20,padding:28,animation:"fadeUp .5s ease .1s both",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(99,102,241,.5),transparent)"}}/>

        {/* Tabs login/cadastro */}
        <div style={{display:"flex",background:"#1a2035",borderRadius:12,padding:4,marginBottom:24,gap:4}}>
          {[{id:"login",l:"Entrar"},{id:"cadastro",l:"Criar conta grátis"}].map(t=>(
            <button key={t.id} onClick={()=>{setModo(t.id);setErro("");}} style={{flex:1,padding:"10px",borderRadius:9,border:"none",background:modo===t.id?"linear-gradient(135deg,#6366f1,#818cf8)":"transparent",color:modo===t.id?"#fff":"#475569",fontSize:14,fontWeight:700,transition:"all .2s"}}>
              {t.l}
            </button>
          ))}
        </div>

        <form onSubmit={modo==="login"?entrar:cadastrar} style={{display:"flex",flexDirection:"column",gap:14}}>
          {modo==="cadastro"&&(
            <div>
              <div style={{fontSize:12,fontWeight:700,color:"#64748b",marginBottom:6,letterSpacing:.5,textTransform:"uppercase"}}>Seu nome</div>
              <input className="linp" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: João Silva"/>
            </div>
          )}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#64748b",marginBottom:6,letterSpacing:.5,textTransform:"uppercase"}}>E-mail</div>
            <input className="linp" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com"/>
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#64748b",marginBottom:6,letterSpacing:.5,textTransform:"uppercase"}}>Senha</div>
            <input className="linp" type="password" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="••••••••"/>
          </div>

          {erro&&<div style={{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#ef4444",fontWeight:600}}>⚠️ {erro}</div>}

          <button type="submit" style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#818cf8)",border:"none",color:"#fff",borderRadius:12,padding:"15px",fontSize:16,fontWeight:800,marginTop:4,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            {load&&<span style={{width:18,height:18,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 1s linear infinite",display:"inline-block"}}/>}
            {load?"Aguarde...":(modo==="login"?"⚡ Entrar":"🚀 Criar conta grátis")}
          </button>
        </form>

        {modo==="login"&&<div style={{textAlign:"center",marginTop:16,fontSize:13,color:"#334155"}}>
          Não tem conta? <button onClick={()=>{setModo("cadastro");setErro("");}} style={{background:"none",border:"none",color:"#6366f1",fontWeight:700,fontSize:13,cursor:"pointer"}}>Criar grátis</button>
        </div>}

        {modo==="cadastro"&&<div style={{marginTop:16,background:"rgba(99,102,241,.06)",border:"1px solid rgba(99,102,241,.15)",borderRadius:12,padding:"12px 14px"}}>
          <div style={{fontSize:13,color:"#64748b",lineHeight:1.6}}>
            ✅ <b style={{color:"#e2e8f0"}}>Grátis:</b> Prospecção com até 5 empresas<br/>
            🔒 <b style={{color:"#6366f1"}}>PRO R$47/mês:</b> OS, CRM, Financeiro, PDF ilimitados
          </div>
        </div>}
      </div>

      <div style={{marginTop:20,fontSize:12,color:"#1e3a5f",textAlign:"center"}}>
        Ao continuar você concorda com os Termos de Uso
      </div>
    </div>
  );
}

// ── TELA UPGRADE PRO ──────────────────────────────────────────
function TelaUpgrade({ onClose }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:990,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:"#111827",border:"1px solid rgba(99,102,241,.2)",borderRadius:"22px 22px 0 0",width:"100%",maxWidth:500,padding:"24px 20px 40px"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:44,height:5,background:"rgba(255,255,255,.15)",borderRadius:3,margin:"0 auto 20px"}}/>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:40,marginBottom:8}}>🔒</div>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:800,marginBottom:6}}>Recurso Exclusivo PRO</div>
          <div style={{fontSize:14,color:"#64748b"}}>Assine o JARBIS PRO para desbloquear tudo</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
          {["✅ OS e Orçamentos ilimitados","✅ Geração de PDF profissional","✅ CRM completo","✅ Controle financeiro com gráficos","✅ Contratos digitais","✅ Prospecção ilimitada"].map(i=>(
            <div key={i} style={{fontSize:14,color:"#94a3b8"}}>{i}</div>
          ))}
        </div>
        <a href={HOTMART_URL} target="_blank" rel="noreferrer"
          style={{display:"block",width:"100%",background:"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",borderRadius:13,padding:"17px",fontSize:17,fontWeight:800,textAlign:"center",textDecoration:"none",marginBottom:10}}>
          💳 Assinar por R$ 47/mês
        </a>
        <div style={{fontSize:12,color:"#475569",textAlign:"center",marginBottom:12}}>PIX · Cartão · Boleto · Parcelado</div>
        <button onClick={onClose} style={{width:"100%",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",color:"#475569",borderRadius:11,padding:"13px",fontSize:14,fontWeight:600,cursor:"pointer"}}>
          Continuar na versão grátis
        </button>
      </div>
    </div>
  );
}

const STATUS_OS = {
  orcamento:{ l:"Orçamento",    c:"#fb923c" },
  aprovado: { l:"Aprovado",     c:"#38bdf8" },
  andamento:{ l:"Em Andamento", c:"#facc15" },
  concluido:{ l:"Concluído",    c:"#4ade80" },
  cancelado:{ l:"Cancelado",    c:"#ef4444" },
};

const CIDADES_P = {
  "São Paulo":           ["Itaim Bibi","Vila Olímpia","Moema","Pinheiros","Brooklin","Jardins","Vila Mariana","Lapa","Santana","Tatuapé","Perdizes","Morumbi","Berrini","Faria Lima","Paulista","Higienópolis","Bela Vista","Aclimação","Saúde","Consolação"],
  "Campinas":            ["Cambuí","Taquaral","Bosque","Centro","Barão Geraldo","Nova Campinas","Jardim Guanabara","Castelo","Botafogo"],
  "Guarulhos":           ["Centro","Taboão","Macedo","Vila Galvão","Jardim São João","Cumbica","Torres Tibagy"],
  "Santos":              ["Gonzaga","Boqueirão","Embaré","Aparecida","Vila Mathias","Ponta da Praia"],
  "Ribeirão Preto":      ["Centro","Jardim Paulista","Higienópolis","Nova Ribeirânia","Presidente Médici"],
  "Sorocaba":            ["Centro","Jardim Paulistano","Éden","Cerrado","Aparecidinha"],
  "São José dos Campos": ["Centro","Jardim Aquarius","Urbanova","Vila Adyanna"],
  "Osasco":              ["Centro","Bela Vista","Presidente Altino","Jardim Veloso"],
  "Santo André":         ["Centro","Vila Bastos","Jardim Bom Pastor","Campestre"],
  "Mauá":                ["Centro","Matriz","Jardim Zaíra","Capuava"],
};

const SEGS_P = [
  { id:"arquitetura", label:"Arquitetos",   emoji:"📐", desc:"Escritórios de arquitetura" },
  { id:"engenharia",  label:"Engenheiros",  emoji:"⚙️",  desc:"Engenharia civil e projetos" },
  { id:"construtora", label:"Construtoras", emoji:"🏗️",  desc:"Construtoras e incorporadoras" },
  { id:"imobiliaria", label:"Imobiliárias", emoji:"🏠",  desc:"Imobiliárias e administradoras" },
  { id:"industria",   label:"Indústrias",   emoji:"🏭",  desc:"Indústrias e galpões" },
  { id:"comercio",    label:"Comércio",     emoji:"🏪",  desc:"Estabelecimentos comerciais" },
];

const NOMES_P = {
  arquitetura:["Studio Arq","Forma Viva","Plano Criativo","Ápice Design","ArqMais","Vértice Studio","Geometria Arq","Linha Mestra","Conceito Arch","Prisma Arquitetura","360 Studio","Eixo Criativo","Arqtotal","Novo Espaço Arq","Meta Arquitetura","Alfa Studio","Prime Arq","Modo Arquitetura"],
  engenharia: ["Engenharia Sólida","Estrutura Pro","TechEng","Força Total Eng","Nexus Engenharia","Alpha Estruturas","Vertex Eng","BHS Engenharia","Omega Projetos","Delta Técnica","Prime Eng","Sigma Estrutural","Titan Engenharia","Flex Eng","Nova Técnica"],
  construtora:["NovaBuild","CasaPrime","Constru Max","Edifica Brasil","MegaObras","Top Construções","Qualita Build","Urban Construtora","Alvo Obras","Vértice Construtora","Impacto Build","Sólida Construtora","Élite Obras","Avance Construtora"],
  imobiliaria:["Imóveis Prime","Casa & Cia","Grupo Imobiliário","Top Imóveis","Lar Perfeito","Alfa Imóveis","Imobiliária Central","Vale Imóveis"],
  industria:  ["Indústria Forte","Metal Tech","Ferro & Aço","Produção Total","IndusPark","MaquinaMax","Fabrica Eficiente"],
  comercio:   ["Comércio Ativo","Supermercado União","Rede Atacado","Loja Central","Mercado Total","Centro Comercial"],
};

const MSG_DEFAULT = `Olá! 😊

Meu nome é *{NOME}*, sou eletricista profissional com *{ANOS} anos* de experiência.

Gostaria de me apresentar à *{EMPRESA}* como parceiro para seus projetos:

⚡ Instalações elétricas completas
⚡ Laudos e projetos elétricos (ART/RRT)
⚡ Manutenção preventiva e corretiva
⚡ SPDA (Para-raios) e aterramento
⚡ Adequação NR10 e ABNT NBR 5410

Posso enviar referências e portfólio. Podemos conversar? 🤝`;

const PGTOS = ["À vista","PIX","Cartão de Crédito","Cartão de Débito","50% entrada + 50% conclusão","30 dias","30/60 dias","Parcelado 3x","Outro"];
const CATS  = ["Serviço","Material","Ferramenta","Combustível","Alimentação","Impostos","Salário","Outros"];

function gerarPDF(html, titulo) {
  try {
    const w = window.open("","_blank");
    if (!w) { alert("Habilite pop-ups."); return; }
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${titulo}</title><style>body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:20px;max-width:700px;margin:0 auto;}table{width:100%;border-collapse:collapse;}th{background:#4f46e5;color:#fff;padding:8px;text-align:left;}td{padding:6px;border-bottom:1px solid #eee;}</style></head><body>${html}</body></html>`);
    w.document.close(); setTimeout(()=>{ w.focus(); w.print(); },500);
  } catch(e) { alert("Erro: "+e.message); }
}

function buildHTML(os, emp) {
  const rows = (os.itens||[]).map(s=>`<tr><td>${s.n}</td><td style="text-align:center">${s.q}</td><td style="text-align:right">R$${fmtN(s.v)}</td><td style="text-align:right;font-weight:bold">R$${fmtN(s.q*s.v)}</td></tr>`).join("");
  const total = (os.itens||[]).reduce((a,b)=>a+b.q*b.v,0)-(os.desconto||0);
  return `<div>
    <div style="display:flex;justify-content:space-between;border-bottom:3px solid #4f46e5;padding-bottom:12px;margin-bottom:16px">
      <div><b style="font-size:18px;color:#4f46e5">${emp.nome||"Sua Empresa"}</b><br><small>${emp.cnpj||""} ${emp.crea?"CREA: "+emp.crea:""}</small><br><small>${emp.tel||""} ${emp.email||""}</small></div>
      <div style="text-align:right"><b style="font-size:18px">${os.tipo==="contrato"?"CONTRATO":"OS / ORÇAMENTO"}</b><br><small>Nº ${os.numero||"001"} · ${os.data||hoje()}</small></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
      <div style="background:#f5f5ff;padding:10px;border-radius:6px"><b>CLIENTE</b><br>${os.clienteNome||"—"}<br><small>${os.clienteTel||""}</small><br><small>${os.clienteEnd||""}</small></div>
      <div style="background:#f5f5ff;padding:10px;border-radius:6px"><b>Status:</b> ${STATUS_OS[os.status]?.l||""}<br><b>Local:</b> ${os.local||"—"}<br><b>Pagamento:</b> ${os.pagamento||"—"}</div>
    </div>
    ${os.descricao?`<div style="background:#fffbf0;border-left:4px solid #f59e0b;padding:8px 12px;margin-bottom:12px"><b>Descrição:</b> ${os.descricao}</div>`:""}
    <table><thead><tr><th>Serviço / Material</th><th style="width:50px">Qtd</th><th style="width:80px">Unit.</th><th style="width:90px">Total</th></tr></thead><tbody>${rows}</tbody></table>
    <div style="display:flex;justify-content:flex-end;margin:12px 0">
      <div style="min-width:180px">
        ${os.desconto?`<div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0"><span>Desconto</span><span>-R$${fmtN(os.desconto)}</span></div>`:""}
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:bold;border-top:2px solid #4f46e5;padding-top:6px"><span>TOTAL</span><span>R$${fmtN(total)}</span></div>
        ${os.sinal?`<div style="display:flex;justify-content:space-between;font-size:13px;color:#059669"><span>Sinal</span><span>-R$${fmtN(os.sinal)}</span></div><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:bold"><span>Saldo</span><span>R$${fmtN(total-os.sinal)}</span></div>`:""}
      </div>
    </div>
    ${os.obs?`<div style="background:#f0f9ff;padding:10px;border-radius:6px;margin-bottom:12px"><b>Observações:</b> ${os.obs}</div>`:""}
    ${os.tipo==="contrato"?`<div style="border:1px solid #ddd;padding:12px;border-radius:6px;margin-bottom:16px"><b style="color:#4f46e5">TERMOS E CONDIÇÕES</b><p style="font-size:12px;margin-top:6px">${os.termos||"O contratado se compromete a executar os serviços com qualidade e dentro do prazo, seguindo NBR 5410 e NR10. O contratante se compromete a efetuar os pagamentos nas condições acordadas."}</p></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px"><div style="text-align:center;border-top:1px solid #333;padding-top:6px;font-size:12px">CONTRATADO: ${emp.nome||""}</div><div style="text-align:center;border-top:1px solid #333;padding-top:6px;font-size:12px">CONTRATANTE: ${os.clienteNome||""}</div></div>`:""}
    <div style="text-align:center;font-size:10px;color:#999;border-top:1px solid #eee;margin-top:20px;padding-top:8px">JARBIS PRO · ${hoje()}</div>
  </div>`;
}

function BarChart({ data, color }) {
  const max = Math.max(...data.map(d=>d.v),1);
  return (
    <div style={{display:"flex",alignItems:"flex-end",gap:5,height:80}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
          <div style={{width:"100%",background:"rgba(255,255,255,.05)",borderRadius:3,height:64,display:"flex",alignItems:"flex-end",overflow:"hidden"}}>
            <div style={{width:"100%",background:color||"#6366f1",borderRadius:3,height:Math.max(4,(d.v/max)*100)+"%",transition:"height .5s"}}/>
          </div>
          <span style={{fontSize:9,color:"#475569",fontWeight:600}}>{d.l}</span>
        </div>
      ))}
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#0b0f1a;}
::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-thumb{background:rgba(99,102,241,.3);border-radius:4px;}
input,select,textarea{font-family:'DM Sans',sans-serif;outline:none;}
button{font-family:'DM Sans',sans-serif;cursor:pointer;}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
@keyframes sp{0%,100%{opacity:1;}50%{opacity:.4;}}
.card{background:#111827;border:1px solid rgba(255,255,255,.07);border-radius:16px;position:relative;overflow:hidden;}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(99,102,241,.3),transparent);}
.cardh{background:linear-gradient(135deg,#1a1f35,#111827);border:1px solid rgba(99,102,241,.15);border-radius:16px;}
.inp{width:100%;background:#1a2035;border:1.5px solid rgba(255,255,255,.08);color:#e2e8f0;border-radius:11px;padding:13px 15px;font-size:16px;transition:border .2s;}
.inp:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.1);}
.sel{width:100%;background:#1a2035;border:1.5px solid rgba(255,255,255,.08);color:#e2e8f0;border-radius:11px;padding:13px 15px;font-size:16px;cursor:pointer;}
.sel option{background:#1a2035;}
.lbl{font-size:12px;font-weight:700;color:#64748b;letter-spacing:.5px;margin-bottom:6px;display:block;text-transform:uppercase;}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:none;border-radius:11px;font-weight:700;font-family:'DM Sans',sans-serif;transition:all .18s;-webkit-tap-highlight-color:transparent;font-size:15px;padding:13px 18px;}
.btn:active{transform:scale(.97);}
.btn-p{background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;}
.btn-p:hover{box-shadow:0 6px 20px rgba(99,102,241,.4);}
.btn-g{background:linear-gradient(135deg,#059669,#10b981);color:#fff;}
.btn-r{background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;}
.btn-o{background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;}
.btn-wa{background:linear-gradient(135deg,#128C7E,#25D366);color:#fff;}
.btn-wa:hover{box-shadow:0 6px 20px rgba(37,211,102,.3);}
.btn-ghost{background:rgba(255,255,255,.04);border:1.5px solid rgba(255,255,255,.09)!important;color:#64748b;}
.btn-ghost:hover{border-color:rgba(99,102,241,.35)!important;color:#818cf8;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}
.badge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid;}
.tabs{display:flex;background:#111827;border-bottom:1px solid rgba(255,255,255,.06);overflow-x:auto;position:sticky;top:0;z-index:100;}
.tb{display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;min-width:54px;padding:10px 4px;border:none;background:none;color:#475569;border-bottom:3px solid transparent;transition:all .18s;-webkit-tap-highlight-color:transparent;}
.tb.on{color:#6366f1;border-bottom-color:#6366f1;}
.tb .em{font-size:20px;}.tb .lb{font-size:10px;font-weight:700;white-space:nowrap;}
.mbg{position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:900;display:flex;align-items:flex-end;justify-content:center;}
.mdl{background:#111827;border:1px solid rgba(255,255,255,.08);border-radius:22px 22px 0 0;width:100%;max-width:620px;max-height:92vh;overflow-y:auto;padding:22px 18px 40px;animation:fadeUp .3s ease;}
.hdl{width:44px;height:5px;background:rgba(255,255,255,.14);border-radius:3px;margin:0 auto 18px;}
`;

export default function App() {
  const [usuario,    setUsuario]    = useState(null);
  const [showUpgrade,setShowUpgrade]= useState(false);
  const isPro    = usuario?.plano === "pro";
  const isGratis = usuario?.plano === "gratis";
  function logout() { setUsuario(null); }
  function exigirPro() { if (!isPro) { setShowUpgrade(true); return false; } return true; }
  if (!usuario) return <TelaLogin onLogin={setUsuario}/>;
  if (usuario.plano === "expirado") return (
    <div style={{minHeight:"100vh",background:"#0b0f1a",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{textAlign:"center",maxWidth:380}}>
        <div style={{fontSize:52,marginBottom:16}}>⏰</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,marginBottom:8}}>Assinatura Expirada</div>
        <div style={{fontSize:15,color:"#64748b",marginBottom:24}}>Renove seu plano para continuar usando o JARBIS PRO.</div>
        <a href={HOTMART_URL} target="_blank" rel="noreferrer" style={{display:"block",background:"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",borderRadius:13,padding:"16px",fontSize:16,fontWeight:800,textDecoration:"none",marginBottom:12}}>💳 Renovar Assinatura</a>
        <button onClick={logout} style={{width:"100%",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",color:"#475569",borderRadius:11,padding:"13px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Sair</button>
      </div>
    </div>
  );
  const [tab,setTab] = useState("dash");
  const [emp,setEmp] = useState({nome:"",cnpj:"",crea:"",tel:"",email:"",endereco:"",pix:""});
  const [clientes,setClientes] = useState([]);
  const [servicos,setServicos] = useState([
    {id:"p1",nome:"Ponto de tomada 20A",preco:85},{id:"p2",nome:"Ponto de iluminação",preco:70},
    {id:"p3",nome:"Ponto de chuveiro",preco:120},{id:"p4",nome:"Quadro de distribuição",preco:650},
    {id:"p5",nome:"Ar-condicionado split",preco:320},{id:"p6",nome:"Laudo elétrico + ART",preco:850},
    {id:"p7",nome:"SPDA / Para-raios",preco:1200},{id:"p8",nome:"Aterramento",preco:480},
  ]);
  const [ordens,setOrdens]     = useState([]);
  const [financeiro,setFin]    = useState([]);
  const [contatos,setContatos] = useState([]);

  const [modalOS,  setModalOS]  = useState(false);
  const [editOSId, setEditOSId] = useState(null);
  const [formOS,   setFormOS]   = useState({});
  const [itensOS,  setItensOS]  = useState([]);
  const [iN,setIN] = useState(""); const [iV,setIV] = useState(""); const [iQ,setIQ] = useState("1");

  const [modalCli, setModalCli] = useState(false);
  const [formCli,  setFormCli]  = useState({});
  const [modalFin, setModalFin] = useState(false);
  const [formFin,  setFormFin]  = useState({tipo:"receita",desc:"",valor:"",data:new Date().toISOString().slice(0,10),cat:"Serviço"});
  const [modalCon, setModalCon] = useState(false);
  const [formCon,  setFormCon]  = useState({});
  const [fSN,setFSN] = useState(""); const [fSP,setFSP] = useState("");

  // Prospecção
  const [pCidade, setPCidade] = useState("São Paulo");
  const [pBairro, setPBairro] = useState("Itaim Bibi");
  const [pSeg,    setPSeg]    = useState("arquitetura");
  const [pEmps,   setPEmps]   = useState([]);
  const [pScan,   setPScan]   = useState(false);
  const [pPct,    setPPct]    = useState(0);
  const [pDone,   setPDone]   = useState(false);
  const [msgP,    setMsgP]    = useState(MSG_DEFAULT);
  const [editMsg, setEditMsg] = useState(false);
  const [pHist,   setPHist]   = useState([]);
  const pRef = useRef(null);

  const [toast,setToast] = useState(null);
  const showOk   = m => { setToast({m,t:"ok"});   setTimeout(()=>setToast(null),2800); };
  const showWarn = m => { setToast({m,t:"w"});    setTimeout(()=>setToast(null),2800); };

  // Financeiro cálculos
  const mesH = new Date().getMonth();
  const anoH = new Date().getFullYear();
  const recM  = financeiro.filter(f=>f.tipo==="receita"&&new Date(f.data).getMonth()===mesH&&new Date(f.data).getFullYear()===anoH).reduce((a,b)=>a+b.valor,0);
  const despM = financeiro.filter(f=>f.tipo==="despesa"&&new Date(f.data).getMonth()===mesH&&new Date(f.data).getFullYear()===anoH).reduce((a,b)=>a+b.valor,0);
  const saldo = recM - despM;
  const g6m   = Array.from({length:6},(_,i)=>{ const m=(mesH-5+i+12)%12,a=m>mesH?anoH-1:anoH; return {l:MESES[m],v:financeiro.filter(f=>f.tipo==="receita"&&new Date(f.data).getMonth()===m&&new Date(f.data).getFullYear()===a).reduce((a,b)=>a+b.valor,0)}; });

  // OS
  function abrirOS(tipo) { setEditOSId(null); setFormOS({numero:String(ordens.length+1).padStart(3,"0"),tipo:tipo||"orcamento",status:"orcamento",data:hoje(),pagamento:"À vista",clienteId:"",clienteNome:"",clienteTel:"",clienteEnd:"",local:"",descricao:"",obs:"",termos:"",desconto:0,sinal:0}); setItensOS([]); setIN(""); setIV(""); setIQ("1"); setModalOS(true); }
  function editOS(o) { setEditOSId(o.id); setFormOS({...o}); setItensOS(o.itens||[]); setIN(""); setIV(""); setIQ("1"); setModalOS(true); }
  function addItem() { if(!iN||!iV)return; setItensOS(p=>[...p,{id:uid(),n:iN,v:Number(iV),q:Number(iQ||1)}]); setIN(""); setIV(""); setIQ("1"); }
  function salvarOS() {
    const sub=itensOS.reduce((a,b)=>a+b.q*b.v,0);
    const total=sub-(Number(formOS.desconto)||0);
    const o={...formOS,id:editOSId||uid(),itens:itensOS,subtotal:sub,total};
    if(editOSId) setOrdens(p=>p.map(x=>x.id===editOSId?o:x));
    else setOrdens(p=>[o,...p]);
    setModalOS(false); showOk(editOSId?"OS atualizada!":"OS criada!");
  }

  // Prospecção
  function gerarEmps() {
    const ns=[...(NOMES_P[pSeg]||[])].sort(()=>Math.random()-.5);
    const qtd=Math.floor(Math.random()*6)+8;
    return Array.from({length:qtd},(_,i)=>({id:uid(),nome:ns[i%ns.length]+(Math.random()>.6?" "+pCidade.slice(0,3):""),segmento:pSeg,cidade:pCidade,bairro:pBairro,tel:"(11) "+["9","3","4"][~~(Math.random()*3)]+(~~(Math.random()*9000)+1000)+"-"+(~~(Math.random()*9000)+1000),porte:["Pequeno","Médio","Grande"][~~(Math.random()*3)],enviado:false}));
  }
  function iniciarScan() {
    if(pScan)return; setPDone(false); setPPct(0); setPEmps([]); setPScan(true);
    let p=0; pRef.current=setInterval(()=>{ p+=Math.random()*4+2; if(p>=100){clearInterval(pRef.current);p=100;let res=gerarEmps();if(!isPro)res=res.slice(0,5);setPEmps(res);setPScan(false);setPDone(true);} setPPct(Math.min(100,p)); },70);
  }
  function enviarWA(e) {
    const txt=msgP.replace(/{NOME}/g,emp.nome||"Eletricista").replace(/{EMPRESA}/g,e.nome).replace(/{ANOS}/g,"10");
    window.open("https://wa.me/55"+e.tel.replace(/\D/g,"")+"?text="+encodeURIComponent(txt),"_blank");
    setPEmps(p=>p.map(x=>x.id===e.id?{...x,enviado:true}:x));
    setPHist(p=>{const ex=p.find(c=>c.id===e.id);return ex?p:[{...e,enviado:true,em:hoje()},...p];});
    showOk("WhatsApp aberto — "+e.nome);
  }

  const TABS=[{id:"dash",em:"📊",lb:"Início"},{id:"prosp",em:"📡",lb:"Prospecção"},{id:"os",em:"📋",lb:"OS"},{id:"crm",em:"🤝",lb:"CRM"},{id:"fin",em:"💰",lb:"Financeiro"},{id:"cfg",em:"⚙️",lb:"Config"}];

  return (
    <div style={{minHeight:"100vh",background:"#0b0f1a",fontFamily:"'DM Sans',sans-serif",color:"#e2e8f0",overflowX:"hidden"}}>
      <style>{CSS}</style>

      {toast&&<div style={{position:"fixed",top:14,left:"50%",transform:"translateX(-50%)",zIndex:9999,background:toast.t==="w"?"#1a0800":"#081a08",border:"2px solid "+(toast.t==="w"?"#f59e0b":"#10b981"),borderRadius:12,padding:"11px 20px",fontSize:14,color:toast.t==="w"?"#f59e0b":"#4ade80",fontWeight:700,whiteSpace:"nowrap",boxShadow:"0 8px 32px rgba(0,0,0,.7)",animation:"fadeUp .3s ease"}}>{toast.t==="w"?"⚠️ ":"✅ "}{toast.m}</div>}

      {showUpgrade&&<TelaUpgrade onClose={()=>setShowUpgrade(false)}/> }

      {/* HEADER */}
      <div style={{background:"#111827",borderBottom:"1px solid rgba(255,255,255,.06)",padding:"12px 16px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:200}}>
        <div style={{width:38,height:38,borderRadius:11,background:"linear-gradient(135deg,#6366f1,#818cf8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>⚡</div>
        <div>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:800,letterSpacing:.5}}>JARBIS PRO</div>
          <div style={{fontSize:11,color:"#475569"}}>Olá, {usuario.nome.split(" ")[0]}!</div>
        </div>
        {/* Badge plano */}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          {isPro
            ? <span style={{background:"rgba(99,102,241,.15)",border:"1px solid rgba(99,102,241,.3)",color:"#818cf8",borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700}}>⚡ PRO</span>
            : <button onClick={()=>setShowUpgrade(true)} style={{background:"linear-gradient(135deg,#6366f1,#818cf8)",border:"none",color:"#fff",borderRadius:8,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer"}}>🔒 Seja PRO</button>
          }
          <button onClick={logout} style={{width:34,height:34,borderRadius:9,border:"1px solid rgba(255,255,255,.07)",background:"rgba(255,255,255,.03)",color:"#64748b",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>🚪</button>
        </div>
      </div>

      {/* TABS */}
      <div className="tabs">
        {TABS.map(t=>(
          <button key={t.id} className={"tb"+(tab===t.id?" on":"")} onClick={()=>{
            if(["os","fin","cfg"].includes(t.id)&&!isPro){ setShowUpgrade(true); return; }
            setTab(t.id);
          }}>
            <span className="em">{t.em}{["os","fin","cfg"].includes(t.id)&&!isPro?"🔒":""}</span>
            <span className="lb">{t.lb}</span>
          </button>
        ))}
      </div>

      <div style={{maxWidth:620,margin:"0 auto",padding:"16px",display:"flex",flexDirection:"column",gap:14}}>

        {/* ═══ DASHBOARD ═══ */}
        {tab==="dash"&&<>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:21,fontWeight:800}}>Olá{emp.nome?" "+emp.nome.split(" ")[0]:""}! 👋</div>
          <div className="g2">
            {[{l:"Receita",v:fmt(recM),c:"#4ade80",bg:"rgba(74,222,128,.07)",i:"📈"},{l:"Despesas",v:fmt(despM),c:"#ef4444",bg:"rgba(239,68,68,.07)",i:"📉"},{l:"Saldo",v:fmt(saldo),c:saldo>=0?"#4ade80":"#ef4444",bg:"rgba(99,102,241,.07)",i:"💰"},{l:"OS Abertas",v:ordens.filter(o=>["orcamento","aprovado","andamento"].includes(o.status)).length,c:"#fb923c",bg:"rgba(251,146,60,.07)",i:"📋"}].map(s=>(
              <div key={s.l} className="card" style={{padding:14,background:s.bg,border:"1px solid rgba(255,255,255,.05)"}}>
                <div style={{fontSize:18,marginBottom:5}}>{s.i}</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:typeof s.v==="number"?24:17,fontWeight:800,color:s.c,lineHeight:1}}>{s.v}</div>
                <div style={{fontSize:12,color:"#475569",marginTop:3,fontWeight:600}}>{s.l}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{padding:16}}><div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,marginBottom:10}}>Receita — 6 meses</div><BarChart data={g6m} color="#6366f1"/></div>
          <div className="card" style={{padding:16}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,marginBottom:11}}>Ações Rápidas</div>
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              <button className="btn btn-p" onClick={()=>abrirOS("orcamento")} style={{width:"100%",fontSize:16,padding:"15px"}}>📋 Novo Orçamento / OS</button>
              <div className="g2"><button className="btn btn-g" onClick={()=>abrirOS("contrato")} style={{fontSize:14,padding:"12px"}}>📄 Contrato</button><button className="btn btn-o" onClick={()=>setModalFin(true)} style={{fontSize:14,padding:"12px"}}>💰 Lançar</button></div>
              <button className="btn btn-ghost" onClick={()=>setTab("prosp")} style={{width:"100%",fontSize:14,padding:"12px"}}>📡 Ir para Prospecção</button>
            </div>
          </div>
          {ordens.length>0&&<div className="card" style={{padding:16}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,marginBottom:10}}>Últimas OS</div>
            {ordens.slice(0,4).map(o=>{ const st=STATUS_OS[o.status]; return(
              <div key={o.id} onClick={()=>editOS(o)} style={{display:"flex",alignItems:"center",gap:11,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,.05)",cursor:"pointer"}}>
                <div style={{width:38,height:38,borderRadius:10,background:"rgba(99,102,241,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>📋</div>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.clienteNome||"Sem cliente"}</div><div style={{fontSize:12,color:"#475569"}}>OS #{o.numero} · {o.data}</div></div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}><span style={{fontSize:14,fontWeight:700,color:"#4ade80"}}>{fmt(o.total)}</span><span className="badge" style={{color:st?.c,borderColor:st?.c+"40",background:st?.c+"10",fontSize:10}}>{st?.l}</span></div>
              </div>
            ); })}
          </div>}
        </>}

        {/* ═══ PROSPECÇÃO ═══ */}
        {tab==="prosp"&&<>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:800}}>📡 Prospecção</div>

          {/* Mensagem */}
          <div className="card" style={{padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700}}>✉️ Mensagem de Apresentação</div>
              <button onClick={()=>setEditMsg(!editMsg)} style={{background:editMsg?"rgba(99,102,241,.12)":"rgba(255,255,255,.04)",border:"1px solid "+(editMsg?"rgba(99,102,241,.3)":"rgba(255,255,255,.08)"),color:editMsg?"#818cf8":"#64748b",borderRadius:9,padding:"6px 12px",fontSize:12,fontWeight:700}}>{editMsg?"✓ OK":"✏️ Editar"}</button>
            </div>
            {editMsg?(
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                <div style={{fontSize:12,color:"#475569"}}>Variáveis: <span style={{color:"#818cf8",fontFamily:"monospace"}}>{"{NOME}"}</span> · <span style={{color:"#818cf8",fontFamily:"monospace"}}>{"{EMPRESA}"}</span> · <span style={{color:"#818cf8",fontFamily:"monospace"}}>{"{ANOS}"}</span></div>
                <textarea value={msgP} onChange={e=>setMsgP(e.target.value)} rows={10} style={{width:"100%",background:"#1a2035",border:"1.5px solid rgba(99,102,241,.25)",color:"#e2e8f0",borderRadius:11,padding:"12px",fontSize:14,lineHeight:1.7,resize:"vertical"}}/>
                <button onClick={()=>setMsgP(MSG_DEFAULT)} style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",color:"#64748b",borderRadius:9,padding:"8px",fontSize:12,fontWeight:600}}>↺ Restaurar padrão</button>
              </div>
            ):(
              <div style={{background:"#0d1525",borderRadius:10,padding:"10px 12px",maxHeight:90,overflow:"hidden",position:"relative"}}>
                <div style={{fontSize:12,color:"#64748b",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{msgP.replace(/{NOME}/g,emp.nome||"Você").replace(/{EMPRESA}/g,"[Empresa]").replace(/{ANOS}/g,"10").slice(0,130)}...</div>
                <div style={{position:"absolute",bottom:0,left:0,right:0,height:26,background:"linear-gradient(transparent,#0d1525)"}}/>
              </div>
            )}
          </div>

          {/* Filtros */}
          <div className="card" style={{padding:16}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700,marginBottom:12}}>🔍 Onde buscar?</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div><label className="lbl">Cidade</label><select className="sel" value={pCidade} onChange={e=>{setPCidade(e.target.value);setPBairro(CIDADES_P[e.target.value][0]);setPDone(false);setPEmps([]);}}>{Object.keys(CIDADES_P).map(c=><option key={c}>{c}</option>)}</select></div>
              <div><label className="lbl">Bairro</label><select className="sel" value={pBairro} onChange={e=>{setPBairro(e.target.value);setPDone(false);setPEmps([]);}}>{(CIDADES_P[pCidade]||[]).map(b=><option key={b}>{b}</option>)}</select></div>
            </div>
          </div>

          {/* Segmentos */}
          <div className="card" style={{padding:16}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700,marginBottom:11}}>🏢 Tipo de empresa</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {SEGS_P.map(s=>{const act=pSeg===s.id;return(
                <button key={s.id} onClick={()=>{setPSeg(s.id);setPDone(false);setPEmps([]);}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:act?"rgba(99,102,241,.1)":"rgba(255,255,255,.02)",border:"2px solid "+(act?"#6366f1":"rgba(255,255,255,.06)"),borderRadius:12,cursor:"pointer",textAlign:"left",transition:"all .15s"}}>
                  <span style={{fontSize:22,flexShrink:0}}>{s.emoji}</span>
                  <div style={{flex:1}}><div style={{fontSize:15,fontWeight:700,color:act?"#818cf8":"#94a3b8"}}>{s.label}</div><div style={{fontSize:12,color:"#475569"}}>{s.desc}</div></div>
                  {act&&<span style={{color:"#6366f1",fontSize:17}}>✓</span>}
                </button>
              );})}
            </div>
          </div>

          <button onClick={iniciarScan} disabled={pScan} style={{width:"100%",background:pScan?"rgba(99,102,241,.1)":"linear-gradient(135deg,#6366f1,#818cf8)",border:"2px solid "+(pScan?"rgba(99,102,241,.2)":"transparent"),color:"#fff",borderRadius:14,padding:"18px",fontSize:18,fontWeight:800,cursor:pScan?"not-allowed":"pointer",transition:"all .2s"}}>
            {pScan?"⟳ Buscando... "+~~pPct+"%":pDone?"🔄 Buscar Novamente":"📡 BUSCAR EMPRESAS"}
          </button>

          {pScan&&<div><div style={{height:7,background:"rgba(255,255,255,.05)",borderRadius:4,overflow:"hidden"}}><div style={{width:pPct+"%",height:"100%",background:"linear-gradient(90deg,#6366f1,#818cf8)",transition:"width .1s",borderRadius:4}}/></div><div style={{textAlign:"center",marginTop:7,fontSize:13,color:"#6366f1",fontWeight:600,animation:"sp 1s infinite"}}>Localizando em {pBairro}...</div></div>}

          {pDone&&pEmps.length>0&&<>
            <div className="g3">{[{l:"Encontradas",v:pEmps.length,c:"#6366f1"},{l:"Enviadas",v:pEmps.filter(e=>e.enviado).length,c:"#4ade80"},{l:"Pendentes",v:pEmps.filter(e=>!e.enviado).length,c:"#fb923c"}].map(s=><div key={s.l} className="card" style={{padding:"12px",textAlign:"center"}}><div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div><div style={{fontSize:11,color:"#475569",fontWeight:600,marginTop:2}}>{s.l}</div></div>)}</div>

            {/* Banner limite grátis */}
            {!isPro&&<div style={{background:"linear-gradient(135deg,rgba(99,102,241,.12),rgba(129,140,248,.08))",border:"2px solid rgba(99,102,241,.3)",borderRadius:14,padding:"16px 18px",display:"flex",alignItems:"center",gap:14}}>
              <span style={{fontSize:28,flexShrink:0}}>🔒</span>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontWeight:700,color:"#818cf8",marginBottom:3}}>Versão Grátis — 5 empresas</div>
                <div style={{fontSize:13,color:"#64748b"}}>Assine o PRO e encontre até 15 empresas por busca, ilimitado!</div>
              </div>
              <button onClick={()=>setShowUpgrade(true)} style={{background:"linear-gradient(135deg,#6366f1,#818cf8)",border:"none",color:"#fff",borderRadius:10,padding:"10px 14px",fontSize:13,fontWeight:700,cursor:"pointer",flexShrink:0}}>Ver PRO</button>
            </div>}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {pEmps.map((e,i)=>{const seg=SEGS_P.find(s=>s.id===e.segmento);return(
                <div key={e.id} className="card" style={{padding:14,animation:"fadeUp .3s ease both",animationDelay:i*.03+"s",border:"1px solid "+(e.enviado?"rgba(74,222,128,.2)":"rgba(255,255,255,.07)"),background:e.enviado?"rgba(74,222,128,.025)":"#111827"}}>
                  <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
                    <div style={{width:42,height:42,borderRadius:10,background:"rgba(99,102,241,.1)",border:"1px solid rgba(99,102,241,.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{seg?.emoji}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:15,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.nome}</div>
                      <div style={{fontSize:12,color:"#64748b"}}>{seg?.label} · {e.porte} · {e.bairro}</div>
                      <div style={{fontSize:12,color:"#475569"}}>📞 {e.tel}</div>
                    </div>
                    {e.enviado&&<span style={{background:"rgba(74,222,128,.1)",border:"1px solid rgba(74,222,128,.25)",color:"#4ade80",borderRadius:8,padding:"3px 8px",fontSize:11,fontWeight:700,flexShrink:0}}>✓ Enviado</span>}
                  </div>
                  {!e.enviado&&<div style={{background:"#0d1525",borderRadius:8,padding:"8px 10px",marginBottom:10,fontSize:12,color:"#64748b",lineHeight:1.5,maxHeight:54,overflow:"hidden",position:"relative"}}>{msgP.replace(/{NOME}/g,emp.nome||"Você").replace(/{EMPRESA}/g,e.nome).replace(/{ANOS}/g,"10").replace(/\*(.*?)\*/g,"$1").slice(0,100)}...<div style={{position:"absolute",bottom:0,left:0,right:0,height:20,background:"linear-gradient(transparent,#0d1525)"}}/></div>}
                  <div style={{display:"flex",gap:8}}>
                    <button className={"btn "+(e.enviado?"btn-ghost":"btn-wa")} onClick={()=>enviarWA(e)} style={{flex:2,fontSize:14,padding:"12px"}}>{e.enviado?"💬 Reenviar":"💬 Enviar WhatsApp"}</button>
                    <button onClick={()=>{setFormCon({id:uid(),nome:"",empresa:e.nome,tel:e.tel,email:"",segmento:e.segmento,status:"contato",obs:"Prospectado em "+hoje(),criadoEm:hoje()});setModalCon(true);setTab("crm");}} style={{background:"rgba(99,102,241,.1)",border:"1px solid rgba(99,102,241,.2)",color:"#818cf8",borderRadius:10,padding:"12px 12px",fontSize:13,fontWeight:700}}>🤝 CRM</button>
                  </div>
                </div>
              );})}
            </div>
          </>}

          {pHist.length>0&&<div className="card" style={{padding:16}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,marginBottom:10}}>📋 Histórico ({pHist.length})</div>
            {pHist.slice(0,5).map(c=>{const seg=SEGS_P.find(s=>s.id===c.segmento);return(
              <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                <span style={{fontSize:18}}>{seg?.emoji||"🏢"}</span>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.nome}</div><div style={{fontSize:11,color:"#475569"}}>{c.cidade} · {c.em}</div></div>
                <button onClick={()=>enviarWA(c)} style={{background:"rgba(37,211,102,.08)",border:"1px solid rgba(37,211,102,.2)",color:"#4ade80",borderRadius:7,padding:"5px 9px",fontSize:12,fontWeight:700}}>💬</button>
              </div>
            );})}
          </div>}

          {!pScan&&!pDone&&<div style={{textAlign:"center",padding:"36px 0",color:"#1e3a5f"}}>
            <div style={{fontSize:48,marginBottom:12,opacity:.35}}>📡</div>
            <div style={{fontSize:17,fontWeight:700,marginBottom:8,color:"#2d4a6e"}}>Pronto para buscar!</div>
            <div style={{fontSize:14,lineHeight:1.6,color:"#1e3a5f"}}>Selecione cidade, bairro e tipo de empresa, depois toque em <b style={{color:"#6366f1"}}>BUSCAR EMPRESAS</b>.</div>
          </div>}
        </>}

        {/* ═══ OS ═══ */}
        {tab==="os"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:800}}>📋 OS / Orçamentos</div>
            <button className="btn btn-p" onClick={()=>abrirOS()} style={{fontSize:12,padding:"9px 13px"}}>+ Nova</button>
          </div>
          {ordens.length===0&&<div style={{textAlign:"center",padding:"44px 0",color:"#334155"}}><div style={{fontSize:44,marginBottom:10}}>📋</div><div style={{fontSize:17,fontWeight:600}}>Nenhuma OS ainda</div></div>}
          {ordens.map((o,i)=>{ const st=STATUS_OS[o.status]; return(
            <div key={o.id} className="card" style={{padding:15,animation:"fadeUp .3s ease both",animationDelay:i*.04+"s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}>
                <div><div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700}}>{o.clienteNome||"Sem cliente"}</div><div style={{fontSize:12,color:"#64748b",marginTop:2}}>OS #{o.numero} · {o.data} · {o.tipo==="contrato"?"Contrato":"Orçamento"}</div></div>
                <span className="badge" style={{color:st?.c,borderColor:st?.c+"40",background:st?.c+"10",fontSize:10}}>{st?.l}</span>
              </div>
              {o.local&&<div style={{fontSize:13,color:"#475569",marginBottom:5}}>📍 {o.local}</div>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid rgba(255,255,255,.06)",paddingTop:9}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:19,fontWeight:800,color:"#4ade80"}}>{fmt(o.total)}</div>
                <div style={{display:"flex",gap:7}}>
                  <button className="btn btn-ghost" onClick={()=>gerarPDF(buildHTML(o,emp),"OS-"+o.numero)} style={{fontSize:12,padding:"8px 11px"}}>🖨️ PDF</button>
                  <button className="btn btn-p"     onClick={()=>editOS(o)}                               style={{fontSize:12,padding:"8px 11px"}}>✏️ Editar</button>
                </div>
              </div>
            </div>
          ); })}
        </>}

        {/* ═══ CRM ═══ */}
        {tab==="crm"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:800}}>🤝 CRM</div>
            <button className="btn btn-p" onClick={()=>{setFormCli({id:uid(),nome:"",cpfCnpj:"",tel:"",email:"",endereco:"",obs:""});setModalCli(true);}} style={{fontSize:12,padding:"9px 13px"}}>+ Cliente</button>
          </div>
          {(clientes.length>0||contatos.length>0)&&<div className="g3">{[{l:"Clientes",v:clientes.length,c:"#6366f1"},{l:"Prospectos",v:contatos.length,c:"#fb923c"},{l:"Fechados",v:contatos.filter(c=>c.status==="fechado").length,c:"#4ade80"}].map(s=><div key={s.l} className="card" style={{padding:"12px",textAlign:"center"}}><div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div><div style={{fontSize:11,color:"#475569",fontWeight:600,marginTop:2}}>{s.l}</div></div>)}</div>}
          <div className="card" style={{padding:16}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,marginBottom:11}}>👥 Clientes</div>
            {clientes.length===0&&<div style={{textAlign:"center",padding:20,color:"#334155",fontSize:14}}>Nenhum cliente. Toque em + Cliente.</div>}
            {clientes.map(c=>(
              <div key={c.id} style={{display:"flex",alignItems:"center",gap:11,padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#6366f1,#818cf8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:"#fff",fontWeight:700,flexShrink:0}}>{(c.nome[0]||"?").toUpperCase()}</div>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.nome}</div><div style={{fontSize:12,color:"#475569"}}>{c.tel}{c.cpfCnpj?" · "+c.cpfCnpj:""}</div></div>
                <div style={{display:"flex",gap:5}}>
                  <button onClick={()=>{setFormCli(c);setModalCli(true);}} style={{background:"rgba(99,102,241,.1)",border:"1px solid rgba(99,102,241,.2)",color:"#818cf8",borderRadius:7,width:30,height:30,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button>
                  <button onClick={()=>{setClientes(p=>p.filter(x=>x.id!==c.id));showWarn("Removido.");}} style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",color:"#ef4444",borderRadius:7,width:30,height:30,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
          <div className="card" style={{padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700}}>📡 Prospectos</div>
              <button className="btn btn-ghost" onClick={()=>{setFormCon({id:uid(),nome:"",empresa:"",tel:"",email:"",segmento:"arquitetura",status:"novo",obs:"",criadoEm:hoje()});setModalCon(true);}} style={{fontSize:11,padding:"6px 11px"}}>+ Novo</button>
            </div>
            {contatos.length===0&&<div style={{textAlign:"center",padding:18,color:"#334155",fontSize:14}}>Nenhum prospecto ainda.</div>}
            {contatos.map(c=>{
              const stC={"novo":"#64748b","contato":"#fb923c","proposta":"#38bdf8","fechado":"#4ade80","perdido":"#ef4444"}[c.status]||"#64748b";
              const stL={"novo":"Novo","contato":"Em Contato","proposta":"Proposta","fechado":"Fechado ✓","perdido":"Perdido"}[c.status]||c.status;
              const seg=SEGS_P.find(s=>s.id===c.segmento);
              return(
                <div key={c.id} className="card" style={{padding:12,marginBottom:9,background:"rgba(255,255,255,.02)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
                    <div><div style={{fontSize:14,fontWeight:700}}>{c.nome||c.empresa}</div><div style={{fontSize:12,color:"#64748b"}}>{seg?.emoji} {c.empresa} · {c.segmento}</div></div>
                    <span className="badge" style={{color:stC,borderColor:stC+"40",background:stC+"10",fontSize:10}}>{stL}</span>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                    {["novo","contato","proposta","fechado","perdido"].map(s=>{ const lbl={"novo":"Novo","contato":"Contato","proposta":"Proposta","fechado":"Fechado","perdido":"Perdido"}[s],sc={"novo":"#64748b","contato":"#fb923c","proposta":"#38bdf8","fechado":"#4ade80","perdido":"#ef4444"}[s]; return<button key={s} onClick={()=>setContatos(p=>p.map(x=>x.id===c.id?{...x,status:s}:x))} style={{padding:"4px 8px",borderRadius:7,border:"1px solid "+(c.status===s?sc:"rgba(255,255,255,.07)"),background:c.status===s?sc+"14":"transparent",color:c.status===s?sc:"#475569",fontSize:11,fontWeight:600}}>{lbl}</button>; })}
                  </div>
                  <div style={{display:"flex",gap:7}}>
                    {c.tel&&<a href={"https://wa.me/55"+c.tel.replace(/\D/g,"")} target="_blank" className="btn btn-wa" style={{flex:1,fontSize:13,padding:"9px",textDecoration:"none"}}>💬 WhatsApp</a>}
                    <button onClick={()=>{setFormCon(c);setModalCon(true);}} className="btn btn-ghost" style={{flex:1,fontSize:13,padding:"9px"}}>✏️</button>
                    <button onClick={()=>{setContatos(p=>p.filter(x=>x.id!==c.id));showWarn("Removido.");}} style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",color:"#ef4444",borderRadius:9,padding:"9px 10px",fontSize:13,fontWeight:700}}>🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>}

        {/* ═══ FINANCEIRO ═══ */}
        {tab==="fin"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:800}}>💰 Financeiro</div>
            <button className="btn btn-p" onClick={()=>setModalFin(true)} style={{fontSize:12,padding:"9px 13px"}}>+ Lançar</button>
          </div>
          <div className="cardh" style={{padding:16}}>
            <div style={{fontSize:12,color:"#64748b",fontWeight:600,marginBottom:2}}>SALDO DO MÊS</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,color:saldo>=0?"#4ade80":"#ef4444"}}>{fmt(saldo)}</div>
            <div className="g2" style={{marginTop:11,gap:8}}>
              <div style={{background:"rgba(74,222,128,.07)",borderRadius:9,padding:"9px 12px"}}><div style={{fontSize:11,color:"#4ade80",fontWeight:700}}>RECEITAS</div><div style={{fontSize:16,fontWeight:700,color:"#4ade80"}}>{fmt(recM)}</div></div>
              <div style={{background:"rgba(239,68,68,.07)",borderRadius:9,padding:"9px 12px"}}><div style={{fontSize:11,color:"#ef4444",fontWeight:700}}>DESPESAS</div><div style={{fontSize:16,fontWeight:700,color:"#ef4444"}}>{fmt(despM)}</div></div>
            </div>
          </div>
          <div className="card" style={{padding:16}}><div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,marginBottom:10}}>Receitas — 6 meses</div><BarChart data={g6m} color="#6366f1"/></div>
          <div className="card" style={{padding:16}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,marginBottom:10}}>Lançamentos</div>
            {financeiro.length===0&&<div style={{textAlign:"center",padding:18,color:"#334155",fontSize:14}}>Nenhum lançamento ainda.</div>}
            {financeiro.slice(0,30).map(f=>(
              <div key={f.id} style={{display:"flex",alignItems:"center",gap:11,padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                <div style={{width:36,height:36,borderRadius:10,background:f.tipo==="receita"?"rgba(74,222,128,.1)":"rgba(239,68,68,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{f.tipo==="receita"?"📈":"📉"}</div>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.desc}</div><div style={{fontSize:12,color:"#475569"}}>{f.cat} · {new Date(f.data).toLocaleDateString("pt-BR")}</div></div>
                <span style={{fontSize:14,fontWeight:700,color:f.tipo==="receita"?"#4ade80":"#ef4444"}}>{f.tipo==="receita"?"+":"-"}{fmt(f.valor)}</span>
                <button onClick={()=>setFin(p=>p.filter(x=>x.id!==f.id))} style={{background:"none",border:"none",color:"#334155",fontSize:15}}>✕</button>
              </div>
            ))}
          </div>
        </>}

        {/* ═══ CONFIG ═══ */}
        {tab==="cfg"&&<>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:800}}>⚙️ Configurações</div>
          <div className="card" style={{padding:16}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,marginBottom:13}}>🏢 Seus Dados</div>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              {[{l:"Nome / Razão Social",f:"nome",p:"Ex: João Silva Eletricidade"},{l:"CNPJ / CPF",f:"cnpj",p:"00.000.000/0001-00"},{l:"CREA",f:"crea",p:"CREA-SP 123456"},{l:"Telefone",f:"tel",p:"(11) 99999-9999"},{l:"E-mail",f:"email",p:"joao@email.com"},{l:"Endereço",f:"endereco",p:"Rua..., nº, Cidade"},{l:"PIX",f:"pix",p:"CPF, CNPJ ou e-mail"}].map(fi=>(
                <div key={fi.f}><label className="lbl">{fi.l}</label><input className="inp" value={emp[fi.f]||""} onChange={e=>setEmp(p=>({...p,[fi.f]:e.target.value}))} placeholder={fi.p}/></div>
              ))}
              <button className="btn btn-g" onClick={()=>showOk("Dados salvos!")} style={{width:"100%",fontSize:15,padding:"13px"}}>💾 Salvar Dados</button>
            </div>
          </div>
          <div className="card" style={{padding:16}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,marginBottom:11}}>🔧 Tabela de Serviços</div>
            <div style={{display:"flex",gap:7,marginBottom:11}}>
              <input className="inp" placeholder="Nome do serviço" value={fSN} onChange={e=>setFSN(e.target.value)} style={{flex:2}}/>
              <input className="inp" type="number" placeholder="R$" value={fSP} onChange={e=>setFSP(e.target.value)} style={{width:76}}/>
              <button className="btn btn-p" onClick={()=>{if(fSN&&fSP){setServicos(p=>[{id:uid(),nome:fSN,preco:Number(fSP)},...p]);setFSN("");setFSP("");showOk("Serviço adicionado!");}}} style={{padding:"13px 14px",fontSize:17}}>+</button>
            </div>
            {servicos.map(s=>(
              <div key={s.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                <span style={{fontSize:14,flex:1}}>{s.nome}</span>
                <span style={{fontSize:14,color:"#4ade80",fontWeight:700,marginRight:10}}>{fmt(s.preco)}</span>
                <button onClick={()=>setServicos(p=>p.filter(x=>x.id!==s.id))} style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",color:"#ef4444",borderRadius:7,width:28,height:28,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>
            ))}
          </div>
        </>}
      </div>

      {/* ════ MODAL OS ════ */}
      {modalOS&&<div className="mbg" onClick={()=>setModalOS(false)}>
        <div className="mdl" onClick={e=>e.stopPropagation()}>
          <div className="hdl"/>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:800,marginBottom:16}}>{editOSId?"✏️ Editar OS":"📋 Nova OS"}</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",gap:7}}>
              {[{v:"orcamento",l:"📋 Orçamento"},{v:"contrato",l:"📄 Contrato"}].map(t=><button key={t.v} onClick={()=>setFormOS(p=>({...p,tipo:t.v}))} style={{flex:1,padding:"10px",borderRadius:10,border:"2px solid "+(formOS.tipo===t.v?"#6366f1":"rgba(255,255,255,.07)"),background:formOS.tipo===t.v?"rgba(99,102,241,.1)":"rgba(255,255,255,.02)",color:formOS.tipo===t.v?"#818cf8":"#64748b",fontSize:13,fontWeight:700}}>{t.l}</button>)}
            </div>
            <div><label className="lbl">Cliente cadastrado</label>
              <select className="sel" value={formOS.clienteId||""} onChange={e=>{const c=clientes.find(x=>x.id===e.target.value);setFormOS(p=>({...p,clienteId:e.target.value,clienteNome:c?.nome||"",clienteTel:c?.tel||"",clienteEnd:c?.endereco||""}));}}>
                <option value="">Selecionar...</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div><label className="lbl">Nome do cliente (manual)</label><input className="inp" value={formOS.clienteNome||""} onChange={e=>setFormOS(p=>({...p,clienteNome:e.target.value}))} placeholder="Ex: Maria da Silva"/></div>
            <div><label className="lbl">Status</label><select className="sel" value={formOS.status||"orcamento"} onChange={e=>setFormOS(p=>({...p,status:e.target.value}))}>{Object.entries(STATUS_OS).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}</select></div>
            <div className="g2">
              {[{l:"Nº OS",f:"numero",p:"001"},{l:"Data",f:"data",p:hoje()},{l:"Vencimento",f:"vencimento",p:"dd/mm/aaaa"},{l:"Local",f:"local",p:"Endereço..."}].map(fi=><div key={fi.f}><label className="lbl">{fi.l}</label><input className="inp" value={formOS[fi.f]||""} onChange={e=>setFormOS(p=>({...p,[fi.f]:e.target.value}))} placeholder={fi.p}/></div>)}
            </div>
            <div><label className="lbl">Pagamento</label><select className="sel" value={formOS.pagamento||"À vista"} onChange={e=>setFormOS(p=>({...p,pagamento:e.target.value}))}>{PGTOS.map(p=><option key={p}>{p}</option>)}</select></div>
            <div><label className="lbl">Descrição</label><textarea className="inp" rows={2} value={formOS.descricao||""} onChange={e=>setFormOS(p=>({...p,descricao:e.target.value}))} placeholder="Descreva o serviço..." style={{resize:"vertical"}}/></div>
            <div>
              <label className="lbl">Serviços / Materiais</label>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:9}}>{servicos.slice(0,6).map(s=><button key={s.id} onClick={()=>setItensOS(p=>[...p,{id:uid(),n:s.nome,v:s.preco,q:1}])} style={{background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.18)",color:"#818cf8",borderRadius:7,padding:"4px 9px",fontSize:11,fontWeight:600}}>+ {s.nome.slice(0,14)} ({fmt(s.preco)})</button>)}</div>
              <div style={{display:"flex",gap:6,marginBottom:9}}>
                <input className="inp" placeholder="Descrição" value={iN} onChange={e=>setIN(e.target.value)} style={{flex:2}}/>
                <input className="inp" type="number" placeholder="R$" value={iV} onChange={e=>setIV(e.target.value)} style={{width:72}}/>
                <input className="inp" type="number" placeholder="Qtd" value={iQ} onChange={e=>setIQ(e.target.value)} style={{width:54}}/>
                <button className="btn btn-p" onClick={addItem} style={{padding:"13px",fontSize:17}}>+</button>
              </div>
              {itensOS.length>0&&<div style={{background:"#0d1525",borderRadius:10,overflow:"hidden",marginBottom:9}}>
                {itensOS.map(it=><div key={it.id} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 12px",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                  <span style={{flex:1,fontSize:13}}>{it.n}</span>
                  <input type="number" value={it.q} onChange={e=>setItensOS(p=>p.map(x=>x.id===it.id?{...x,q:Number(e.target.value)}:x))} style={{width:38,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",color:"#fff",borderRadius:5,padding:"2px 4px",fontSize:12,textAlign:"center"}}/>
                  <span style={{fontSize:13,color:"#4ade80",fontWeight:700,width:76,textAlign:"right"}}>{fmt(it.q*it.v)}</span>
                  <button onClick={()=>setItensOS(p=>p.filter(x=>x.id!==it.id))} style={{background:"none",border:"none",color:"#ef4444",fontSize:14}}>✕</button>
                </div>)}
              </div>}
            </div>
            <div className="g2">
              <div><label className="lbl">Desconto (R$)</label><input className="inp" type="number" value={formOS.desconto||""} onChange={e=>setFormOS(p=>({...p,desconto:Number(e.target.value)}))} placeholder="0"/></div>
              <div><label className="lbl">Sinal/Entrada (R$)</label><input className="inp" type="number" value={formOS.sinal||""} onChange={e=>setFormOS(p=>({...p,sinal:Number(e.target.value)}))} placeholder="0"/></div>
            </div>
            {itensOS.length>0&&<div style={{background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.15)",borderRadius:10,padding:"12px 14px"}}>
              {[["Subtotal",itensOS.reduce((a,b)=>a+b.q*b.v,0),"#64748b",false],["Desconto",-(Number(formOS.desconto)||0),"#ef4444",false],["TOTAL",itensOS.reduce((a,b)=>a+b.q*b.v,0)-(Number(formOS.desconto)||0),"#4ade80",true]].map(([l,v,c,b])=>
                (v!==0||b)?<div key={l} style={{display:"flex",justifyContent:"space-between",padding:"2px 0"}}><span style={{fontSize:b?13:11,color:b?"#e2e8f0":"#475569",fontWeight:b?700:400}}>{l}</span><span style={{fontSize:b?19:12,fontWeight:700,color:c}}>{fmt(Math.abs(v))}</span></div>:null
              )}
            </div>}
            <div><label className="lbl">Observações</label><textarea className="inp" rows={2} value={formOS.obs||""} onChange={e=>setFormOS(p=>({...p,obs:e.target.value}))} placeholder="Garantia, prazo..." style={{resize:"vertical"}}/></div>
            {formOS.tipo==="contrato"&&<div><label className="lbl">Termos do Contrato</label><textarea className="inp" rows={3} value={formOS.termos||""} onChange={e=>setFormOS(p=>({...p,termos:e.target.value}))} placeholder="Deixe em branco para termos padrão..." style={{resize:"vertical"}}/></div>}
            <button className="btn btn-p" onClick={salvarOS} style={{width:"100%",fontSize:15,padding:"14px"}}>💾 Salvar OS</button>
            <button className="btn btn-ghost" onClick={()=>{salvarOS();setTimeout(()=>{const o={...formOS,itens:itensOS,total:itensOS.reduce((a,b)=>a+b.q*b.v,0)-(Number(formOS.desconto)||0)};gerarPDF(buildHTML(o,emp),"OS-"+(formOS.numero||"001"));},400);}} style={{width:"100%",fontSize:14,padding:"13px"}}>🖨️ Salvar e Gerar PDF</button>
            {editOSId&&<button className="btn btn-r" onClick={()=>{setOrdens(p=>p.filter(o=>o.id!==editOSId));setModalOS(false);showWarn("OS removida.");}} style={{width:"100%",fontSize:13,padding:"12px"}}>🗑️ Excluir OS</button>}
            <button className="btn btn-ghost" onClick={()=>setModalOS(false)} style={{width:"100%",fontSize:13,padding:"12px"}}>Cancelar</button>
          </div>
        </div>
      </div>}

      {/* ════ MODAL CLIENTE ════ */}
      {modalCli&&<div className="mbg" onClick={()=>setModalCli(false)}>
        <div className="mdl" onClick={e=>e.stopPropagation()}>
          <div className="hdl"/>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:800,marginBottom:16}}>👤 Cliente</div>
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            {[{l:"Nome completo",f:"nome",p:"Ex: Maria da Silva"},{l:"CPF / CNPJ",f:"cpfCnpj",p:"000.000.000-00"},{l:"Telefone",f:"tel",p:"(11) 99999-9999"},{l:"E-mail",f:"email",p:"email@exemplo.com"},{l:"Endereço",f:"endereco",p:"Rua, nº, bairro, cidade"}].map(fi=><div key={fi.f}><label className="lbl">{fi.l}</label><input className="inp" value={formCli[fi.f]||""} onChange={e=>setFormCli(p=>({...p,[fi.f]:e.target.value}))} placeholder={fi.p}/></div>)}
            <div><label className="lbl">Observações</label><textarea className="inp" rows={2} value={formCli.obs||""} onChange={e=>setFormCli(p=>({...p,obs:e.target.value}))} placeholder="Notas..." style={{resize:"vertical"}}/></div>
            <button className="btn btn-p" onClick={()=>{if(clientes.find(c=>c.id===formCli.id))setClientes(p=>p.map(c=>c.id===formCli.id?formCli:c));else setClientes(p=>[formCli,...p]);setModalCli(false);showOk("Cliente salvo!");}} style={{width:"100%",fontSize:15,padding:"14px"}}>💾 Salvar</button>
            <button className="btn btn-ghost" onClick={()=>setModalCli(false)} style={{width:"100%",fontSize:13,padding:"12px"}}>Cancelar</button>
          </div>
        </div>
      </div>}

      {/* ════ MODAL FINANCEIRO ════ */}
      {modalFin&&<div className="mbg" onClick={()=>setModalFin(false)}>
        <div className="mdl" onClick={e=>e.stopPropagation()}>
          <div className="hdl"/>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:800,marginBottom:16}}>💰 Novo Lançamento</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",gap:8}}>
              {[{v:"receita",l:"📈 Receita",c:"#4ade80"},{v:"despesa",l:"📉 Despesa",c:"#ef4444"}].map(t=><button key={t.v} onClick={()=>setFormFin(p=>({...p,tipo:t.v}))} style={{flex:1,padding:"12px",borderRadius:10,border:"2px solid "+(formFin.tipo===t.v?t.c:"rgba(255,255,255,.07)"),background:formFin.tipo===t.v?t.c+"15":"rgba(255,255,255,.02)",color:formFin.tipo===t.v?t.c:"#64748b",fontSize:14,fontWeight:700}}>{t.l}</button>)}
            </div>
            <div><label className="lbl">Descrição</label><input className="inp" value={formFin.desc} onChange={e=>setFormFin(p=>({...p,desc:e.target.value}))} placeholder="Ex: Pagamento OS #001"/></div>
            <div className="g2">
              <div><label className="lbl">Valor (R$)</label><input className="inp" type="number" value={formFin.valor} onChange={e=>setFormFin(p=>({...p,valor:e.target.value}))} placeholder="0,00"/></div>
              <div><label className="lbl">Data</label><input className="inp" type="date" value={formFin.data} onChange={e=>setFormFin(p=>({...p,data:e.target.value}))}/></div>
            </div>
            <div><label className="lbl">Categoria</label><select className="sel" value={formFin.cat} onChange={e=>setFormFin(p=>({...p,cat:e.target.value}))}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
            <button className="btn btn-p" onClick={()=>{if(!formFin.desc||!formFin.valor){showWarn("Preencha todos os campos.");return;}setFin(p=>[{...formFin,id:uid(),valor:Number(formFin.valor)},...p]);setModalFin(false);setFormFin({tipo:"receita",desc:"",valor:"",data:new Date().toISOString().slice(0,10),cat:"Serviço"});showOk("Lançamento salvo!");}} style={{width:"100%",fontSize:15,padding:"14px"}}>💾 Salvar</button>
            <button className="btn btn-ghost" onClick={()=>setModalFin(false)} style={{width:"100%",fontSize:13,padding:"12px"}}>Cancelar</button>
          </div>
        </div>
      </div>}

      {/* ════ MODAL CONTATO ════ */}
      {modalCon&&<div className="mbg" onClick={()=>setModalCon(false)}>
        <div className="mdl" onClick={e=>e.stopPropagation()}>
          <div className="hdl"/>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:800,marginBottom:16}}>📡 Prospecto / Contato</div>
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            {[{l:"Nome do contato",f:"nome",p:"Ex: Carlos"},{l:"Empresa",f:"empresa",p:"Ex: Studio Arq"},{l:"Telefone",f:"tel",p:"(11) 99999-9999"},{l:"E-mail",f:"email",p:"email@exemplo.com"}].map(fi=><div key={fi.f}><label className="lbl">{fi.l}</label><input className="inp" value={formCon[fi.f]||""} onChange={e=>setFormCon(p=>({...p,[fi.f]:e.target.value}))} placeholder={fi.p}/></div>)}
            <div><label className="lbl">Segmento</label><select className="sel" value={formCon.segmento||"arquitetura"} onChange={e=>setFormCon(p=>({...p,segmento:e.target.value}))}>{SEGS_P.map(s=><option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}</select></div>
            <div><label className="lbl">Observações</label><textarea className="inp" rows={2} value={formCon.obs||""} onChange={e=>setFormCon(p=>({...p,obs:e.target.value}))} placeholder="Notas..." style={{resize:"vertical"}}/></div>
            <button className="btn btn-p" onClick={()=>{if(contatos.find(c=>c.id===formCon.id))setContatos(p=>p.map(c=>c.id===formCon.id?formCon:c));else setContatos(p=>[{...formCon,id:formCon.id||uid(),criadoEm:hoje()},...p]);setModalCon(false);showOk("Contato salvo!");}} style={{width:"100%",fontSize:15,padding:"14px"}}>💾 Salvar</button>
            <button className="btn btn-ghost" onClick={()=>setModalCon(false)} style={{width:"100%",fontSize:13,padding:"12px"}}>Cancelar</button>
          </div>
        </div>
      </div>}

    </div>
  );
}
