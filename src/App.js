import { useState, useRef, useEffect } from "react";

// ── CONFIG ────────────────────────────────────────────────────
const SUPA_URL = "https://hrqhqqakvkdkapfijhij.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhycWhxcWFrdmtka2FwZmlqaGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDc1OTYsImV4cCI6MjA5MzU4MzU5Nn0.5YM_CUIuaSmb4lZngDXqJdEuPbGF53F5Qc9nbXLkk2k";
const HOTMART  = "https://hotmart.com/produto/protons-prospect";
const CASA_KEY = "64b4a4ee0c6a8f0c68c1fd3b8a802377edaa123d2de0dba7afb356bd8d165b55c496506456420da93d6483203b2713d322e658fca01e62ff3cd86b6476cbf043";

const GOLD = "#F5C518";
const GOLD2 = "#C9A227";
const DARK = "#1a1a1a";
const DARK2 = "#111111";

// ── UTILS ─────────────────────────────────────────────────────
const fmt  = v => (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const hoje = () => new Date().toLocaleDateString("pt-BR");
const uid  = () => Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ── SUPABASE ──────────────────────────────────────────────────
const SH = {"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Content-Type":"application/json"};
async function dbGet(t,c,v){try{const r=await fetch(`${SUPA_URL}/rest/v1/${t}?${c}=eq.${encodeURIComponent(v)}&select=*`,{headers:SH});return await r.json();}catch{return[];}}
async function dbIns(t,d){try{const r=await fetch(`${SUPA_URL}/rest/v1/${t}`,{method:"POST",headers:{...SH,"Prefer":"return=representation"},body:JSON.stringify(d)});const j=await r.json();return Array.isArray(j)?j[0]:j;}catch{return null;}}

async function fazerLogin(email,senha){
  const rows=await dbGet("usuarios","email",email.toLowerCase().trim());
  if(!rows||rows.length===0)return{erro:"E-mail não encontrado."};
  const u=rows[0];if(u.senha!==senha)return{erro:"Senha incorreta."};
  return{usuario:u};
}
async function fazerCadastro(nome,email,senha){
  const ex=await dbGet("usuarios","email",email.toLowerCase().trim());
  if(ex&&ex.length>0)return{erro:"E-mail já cadastrado."};
  const u=await dbIns("usuarios",{nome,email:email.toLowerCase().trim(),senha,plano:"gratis",assinatura_ativa:false});
  if(!u)return{erro:"Erro ao criar conta."};return{usuario:u};
}
function loginGoogle(){window.location.href=`${SUPA_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin)}`;}

// ── CASA DOS DADOS ────────────────────────────────────────────
const CNAES={
  arquitetura:["7111100"],engenharia:["7112000"],
  construtora:["4120400","4399103"],imobiliaria:["6821801","6821802"],
  industria:["2899199","2812200"],comercio:["4789099","4744001"],
};
async function buscarEmpresas(municipio,bairro,seg){
  try{
    const body={codigo_atividade_principal:CNAES[seg]||["7111100"],situacao_cadastral:["ATIVA"],municipio:[municipio.toLowerCase()],...(bairro?{bairro:[bairro.toLowerCase()]}:{})};
    const r=await fetch("https://api.casadosdados.com.br/v5/cnpj/pesquisa",{method:"POST",headers:{"api-key":CASA_KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});
    return await r.json();
  }catch{return null;}
}

// ── VOZ ───────────────────────────────────────────────────────
function falar(texto,onStart,onEnd){
  if(!window.speechSynthesis)return;
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(texto);
  u.lang="pt-BR";u.rate=0.95;u.pitch=1.1;
  const vozes=window.speechSynthesis.getVoices();
  const vFem=vozes.find(v=>v.lang.includes("pt")&&(v.name.toLowerCase().includes("female")||v.name.toLowerCase().includes("feminina")||v.name.includes("Google")||v.name.includes("Luciana")||v.name.includes("Vitoria")));
  if(vFem)u.voice=vFem;
  u.onstart=()=>onStart&&onStart();
  u.onend=()=>onEnd&&onEnd();
  window.speechSynthesis.speak(u);
}

// ── DADOS PROSPECÇÃO ──────────────────────────────────────────
const CIDADES={
  "São Paulo":["Itaim Bibi","Vila Olímpia","Moema","Pinheiros","Brooklin","Jardins","Lapa","Santana","Tatuapé","Morumbi","Berrini","Faria Lima","Paulista","Bela Vista"],
  "Campinas":["Cambuí","Taquaral","Bosque","Centro","Barão Geraldo","Nova Campinas"],
  "Guarulhos":["Centro","Taboão","Macedo","Vila Galvão","Cumbica"],
  "Santos":["Gonzaga","Boqueirão","Embaré","Aparecida","Vila Mathias"],
  "Ribeirão Preto":["Centro","Jardim Paulista","Higienópolis","Presidente Médici"],
  "Sorocaba":["Centro","Jardim Paulistano","Éden","Cerrado"],
  "Osasco":["Centro","Bela Vista","Presidente Altino","Jardim Veloso"],
  "Santo André":["Centro","Vila Bastos","Jardim Bom Pastor","Campestre"],
};
const SEGS=[
  {id:"arquitetura",label:"Arquitetos",emoji:"📐",cor:"#6366f1"},
  {id:"engenharia",label:"Engenheiros",emoji:"⚙️",cor:"#f59e0b"},
  {id:"construtora",label:"Construtoras",emoji:"🏗️",cor:"#10b981"},
  {id:"imobiliaria",label:"Imobiliárias",emoji:"🏠",cor:"#ec4899"},
  {id:"industria",label:"Indústrias",emoji:"🏭",cor:"#8b5cf6"},
  {id:"comercio",label:"Comércio",emoji:"🏪",cor:"#06b6d4"},
];
const MSG_PAD=`Olá! 😊\n\nMeu nome é *{NOME}*, da *Prótons Serviços Elétricos e Segurança Eletrônica*.\n\nGostaria de apresentar nossos serviços à *{EMPRESA}*:\n\n⚡ Instalações elétricas completas\n⚡ Laudos e projetos elétricos (ART/RRT)\n⚡ Manutenção preventiva e corretiva\n⚡ SPDA e aterramento\n⚡ Segurança eletrônica (câmeras, alarmes)\n⚡ Adequação NR10 e NBR 5410\n\nPodemos conversar? 🤝`;

const STATUS_OS={orcamento:{l:"Orçamento",c:"#f59e0b"},aprovado:{l:"Aprovado",c:"#3b82f6"},andamento:{l:"Em Andamento",c:"#8b5cf6"},concluido:{l:"Concluído",c:"#10b981"},cancelado:{l:"Cancelado",c:"#ef4444"}};
const PGTOS=["À vista","PIX","Cartão de Crédito","50% entrada + 50% conclusão","30 dias","Parcelado 3x","Outro"];
const CATS=["Serviço","Material","Ferramenta","Combustível","Alimentação","Impostos","Salário","Outros"];

// ── PDF ───────────────────────────────────────────────────────
function gerarPDF(html,titulo){
  try{const w=window.open("","_blank");if(!w){alert("Habilite pop-ups.");return;}
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${titulo}</title><style>body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:20px;max-width:700px;margin:0 auto;}table{width:100%;border-collapse:collapse;}th{background:#1a1a1a;color:#F5C518;padding:8px;}td{padding:6px;border-bottom:1px solid #eee;}.logo{color:#F5C518;font-size:22px;font-weight:900;}</style></head><body>${html}</body></html>`);
  w.document.close();setTimeout(()=>{w.focus();w.print();},500);}catch(e){alert("Erro: "+e.message);}
}

// ── GRÁFICO ───────────────────────────────────────────────────
function BarChart({data}){
  const max=Math.max(...data.map(d=>d.v),1);
  return(<div style={{display:"flex",alignItems:"flex-end",gap:5,height:80}}>
    {data.map((d,i)=>(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
      <div style={{width:"100%",background:"rgba(0,0,0,.08)",borderRadius:3,height:64,display:"flex",alignItems:"flex-end",overflow:"hidden"}}>
        <div style={{width:"100%",background:`linear-gradient(180deg,${GOLD},${GOLD2})`,borderRadius:3,height:Math.max(4,(d.v/max)*100)+"%",transition:"height .5s"}}/>
      </div>
      <span style={{fontSize:9,color:"#666",fontWeight:600}}>{d.l}</span>
    </div>))}
  </div>);
}

// ── CÉREBRO IA ANIMADO ────────────────────────────────────────
function CerebroIA({falando,pensando}){
  const t=Date.now();
  return(
    <div style={{position:"relative",width:80,height:80,display:"flex",alignItems:"center",justifyContent:"center"}}>
      {/* Ondas externas quando falando */}
      {falando&&[1,2,3].map(i=>(
        <div key={i} style={{position:"absolute",width:80+i*20,height:80+i*20,borderRadius:"50%",border:`2px solid ${GOLD}`,opacity:1-i*0.3,animation:`onda${i} 1.5s ease-out infinite`,animationDelay:`${i*0.3}s`}}/>
      ))}
      {/* Círculo externo */}
      <div style={{position:"absolute",inset:0,borderRadius:"50%",background:`conic-gradient(${GOLD},${GOLD2},${GOLD})`,animation:falando?"giro 2s linear infinite":"giro 8s linear infinite",padding:3}}>
        <div style={{width:"100%",height:"100%",borderRadius:"50%",background:"#fff"}}/>
      </div>
      {/* Átomo SVG animado */}
      <div style={{position:"relative",zIndex:2,animation:falando?"pulso 0.5s ease-in-out infinite alternate":"pulso 2s ease-in-out infinite alternate"}}>
        <svg width="54" height="54" viewBox="0 0 100 100">
          {/* Núcleo */}
          <circle cx="50" cy="50" r="10" fill={GOLD} style={{filter:"drop-shadow(0 0 6px #F5C518)"}}/>
          {/* Órbitas */}
          {[0,60,120].map((ang,i)=>(
            <ellipse key={i} cx="50" cy="50" rx="38" ry="15" fill="none" stroke={GOLD} strokeWidth="2" opacity={falando?1:0.6}
              style={{transformOrigin:"50px 50px",transform:`rotate(${ang}deg)`,animation:falando?`orbita 1.${i+5}s linear infinite`:"orbita 3s linear infinite"}}/>
          ))}
          {/* Elétrons */}
          {falando&&[0,1,2].map(i=>(
            <circle key={i} r="4" fill={GOLD2} style={{animation:`eletron${i} ${1+i*0.3}s linear infinite`}}>
              <animateMotion dur={`${1+i*0.4}s`} repeatCount="indefinite" path={i===0?"M50,12 a38,15 0 1,1 0.1,0":"M88,50 a38,15 0 1,1 -0.1,0"}/>
            </circle>
          ))}
          {/* Raios quando falando */}
          {falando&&<>
            <text x="15" y="25" fontSize="14" fill={GOLD} style={{animation:"pisca 0.4s infinite"}}>⚡</text>
            <text x="65" y="80" fontSize="14" fill={GOLD} style={{animation:"pisca 0.6s infinite"}}>⚡</text>
          </>}
          {/* Pontos pensando */}
          {pensando&&<>
            <circle cx="35" cy="75" r="4" fill={GOLD} style={{animation:"bounce 0.6s infinite"}}/>
            <circle cx="50" cy="75" r="4" fill={GOLD} style={{animation:"bounce 0.6s 0.2s infinite"}}/>
            <circle cx="65" cy="75" r="4" fill={GOLD} style={{animation:"bounce 0.6s 0.4s infinite"}}/>
          </>}
        </svg>
      </div>
    </div>
  );
}

// ── CSS GLOBAL ────────────────────────────────────────────────
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#f5f5f5;font-family:'Nunito',sans-serif;}
::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px;}
input,select,textarea,button{font-family:'Nunito',sans-serif;}
button{cursor:pointer;}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
@keyframes spin{to{transform:rotate(360deg);}}
@keyframes pulso{from{transform:scale(1);}to{transform:scale(1.08);}}
@keyframes giro{to{transform:rotate(360deg);}}
@keyframes pisca{0%,100%{opacity:1;}50%{opacity:0.3;}}
@keyframes bounce{0%,100%{transform:translateY(0);}50%{transform:translateY(-5px);}}
@keyframes onda1{0%{transform:scale(1);opacity:0.6;}100%{transform:scale(1.5);opacity:0;}}
@keyframes onda2{0%{transform:scale(1);opacity:0.4;}100%{transform:scale(1.8);opacity:0;}}
@keyframes onda3{0%{transform:scale(1);opacity:0.2;}100%{transform:scale(2.1);opacity:0;}}
@keyframes orbita{to{transform:rotate(360deg);}}
@keyframes sp{0%,100%{opacity:1;}50%{opacity:.4;}}
.card{background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,.06);position:relative;overflow:hidden;}
.inp{width:100%;background:#f8f8f8;border:1.5px solid #e5e5e5;color:#1a1a1a;border-radius:11px;padding:13px 15px;font-size:16px;outline:none;transition:border .2s;}
.inp:focus{border-color:${GOLD};}
.sel{width:100%;background:#f8f8f8;border:1.5px solid #e5e5e5;color:#1a1a1a;border-radius:11px;padding:13px 15px;font-size:16px;outline:none;}
.lbl{font-size:12px;font-weight:700;color:#888;letter-spacing:.5px;margin-bottom:6px;display:block;text-transform:uppercase;}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:none;border-radius:12px;font-weight:800;font-family:'Nunito',sans-serif;transition:all .18s;font-size:15px;padding:13px 18px;}
.btn:active{transform:scale(.97);}
.btn-gold{background:linear-gradient(135deg,${GOLD},${GOLD2});color:#1a1a1a;}
.btn-gold:hover{box-shadow:0 6px 20px rgba(245,197,24,.4);}
.btn-dark{background:${DARK};color:${GOLD};}
.btn-r{background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;}
.btn-g{background:linear-gradient(135deg,#059669,#10b981);color:#fff;}
.btn-wa{background:linear-gradient(135deg,#128C7E,#25D366);color:#fff;}
.btn-ghost{background:#f5f5f5;border:1.5px solid #e5e5e5 !important;color:#666;}
.btn-ghost:hover{border-color:${GOLD} !important;color:${GOLD2};}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}
.badge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid;}
.mbg{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:900;display:flex;align-items:flex-end;justify-content:center;}
.mdl{background:#fff;border-radius:22px 22px 0 0;width:100%;max-width:620px;max-height:92vh;overflow-y:auto;padding:22px 18px 40px;animation:fadeUp .3s ease;}
.hdl{width:44px;height:5px;background:#e5e5e5;border-radius:3px;margin:0 auto 18px;}
`;

// ── TELA LOGIN ────────────────────────────────────────────────
function TelaLogin({onLogin}){
  const [modo,setModo]=useState("login");
  const [nome,setNome]=useState("");
  const [email,setEmail]=useState("");
  const [senha,setSenha]=useState("");
  const [erro,setErro]=useState("");
  const [load,setLoad]=useState(false);

  async function entrar(e){
    e.preventDefault();if(!email||!senha){setErro("Preencha todos os campos.");return;}
    setLoad(true);setErro("");const res=await fazerLogin(email,senha);setLoad(false);
    if(res.erro){setErro(res.erro);return;}
    sessionStorage.setItem("protons_user",JSON.stringify(res.usuario));
    onLogin(res.usuario);
  }
  async function cadastrar(e){
    e.preventDefault();if(!nome||!email||!senha){setErro("Preencha todos os campos.");return;}
    if(senha.length<6){setErro("Senha mínimo 6 caracteres.");return;}
    setLoad(true);setErro("");const res=await fazerCadastro(nome,email,senha);setLoad(false);
    if(res.erro){setErro(res.erro);return;}
    sessionStorage.setItem("protons_user",JSON.stringify(res.usuario));
    onLogin(res.usuario);
  }

  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${DARK2} 0%,#2a2000 100%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
      <style>{CSS}</style>
      {/* Logo */}
      <div style={{textAlign:"center",marginBottom:28,animation:"fadeUp .5s ease"}}>
        <div style={{width:80,height:80,borderRadius:"50%",background:`linear-gradient(135deg,${GOLD},${GOLD2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 12px",boxShadow:`0 8px 32px ${GOLD}50`}}>⚡</div>
        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:28,fontWeight:900,color:GOLD,letterSpacing:2}}>PRÓTONS</div>
        <div style={{fontSize:12,color:"#aaa",marginTop:2,letterSpacing:1}}>PROSPECT — Sistema do Eletricista</div>
      </div>

      <div style={{width:"100%",maxWidth:400,background:"rgba(255,255,255,.05)",backdropFilter:"blur(10px)",border:`1px solid ${GOLD}30`,borderRadius:20,padding:26,animation:"fadeUp .5s ease .1s both"}}>
        <style>{`
          @keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
          @keyframes spin{to{transform:rotate(360deg);}}
          .linp{width:100%;background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.15);color:#fff;border-radius:11px;padding:13px 15px;font-size:16px;outline:none;transition:border .2s;font-family:'Nunito',sans-serif;}
          .linp:focus{border-color:${GOLD};}
          .linp::placeholder{color:rgba(255,255,255,.4);}
        `}</style>
        <div style={{display:"flex",background:"rgba(255,255,255,.08)",borderRadius:12,padding:4,marginBottom:22,gap:4}}>
          {[{id:"login",l:"Entrar"},{id:"cadastro",l:"Criar conta grátis"}].map(t=>(
            <button key={t.id} onClick={()=>{setModo(t.id);setErro("");}} style={{flex:1,padding:"10px",borderRadius:9,border:"none",background:modo===t.id?`linear-gradient(135deg,${GOLD},${GOLD2})`:"transparent",color:modo===t.id?"#1a1a1a":"#aaa",fontSize:14,fontWeight:800,transition:"all .2s",cursor:"pointer"}}>
              {t.l}
            </button>
          ))}
        </div>
        <form onSubmit={modo==="login"?entrar:cadastrar} style={{display:"flex",flexDirection:"column",gap:13}}>
          {modo==="cadastro"&&<div><div style={{fontSize:12,fontWeight:700,color:"#aaa",marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Seu nome</div><input className="linp" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: João Silva"/></div>}
          <div><div style={{fontSize:12,fontWeight:700,color:"#aaa",marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>E-mail</div><input className="linp" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com"/></div>
          <div><div style={{fontSize:12,fontWeight:700,color:"#aaa",marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Senha</div><input className="linp" type="password" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="••••••••"/></div>
          {erro&&<div style={{background:"rgba(239,68,68,.15)",border:"1px solid rgba(239,68,68,.4)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#fca5a5",fontWeight:700}}>⚠️ {erro}</div>}
          <button type="submit" style={{width:"100%",background:`linear-gradient(135deg,${GOLD},${GOLD2})`,border:"none",color:"#1a1a1a",borderRadius:12,padding:"15px",fontSize:16,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",gap:10,cursor:"pointer",marginTop:4}}>
            {load&&<span style={{width:18,height:18,border:"2px solid rgba(0,0,0,.3)",borderTopColor:"#1a1a1a",borderRadius:"50%",animation:"spin 1s linear infinite",display:"inline-block"}}/>}
            {load?"Aguarde...":(modo==="login"?"⚡ Entrar":"🚀 Criar conta grátis")}
          </button>
        </form>
        <div style={{display:"flex",alignItems:"center",gap:10,margin:"16px 0"}}>
          <div style={{flex:1,height:1,background:"rgba(255,255,255,.1)"}}/><span style={{fontSize:12,color:"#666"}}>ou</span><div style={{flex:1,height:1,background:"rgba(255,255,255,.1)"}}/>
        </div>
        <button onClick={loginGoogle} style={{width:"100%",background:"#fff",border:"none",color:"#1a1a1a",borderRadius:12,padding:"13px",fontSize:15,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:10,cursor:"pointer"}}>
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Entrar com Google
        </button>
        {modo==="cadastro"&&<div style={{marginTop:13,background:`rgba(245,197,24,.08)`,border:`1px solid ${GOLD}30`,borderRadius:12,padding:"11px 13px"}}>
          <div style={{fontSize:13,color:"#aaa",lineHeight:1.6}}>✅ <b style={{color:GOLD}}>Grátis:</b> Prospecção 5 empresas<br/>⚡ <b style={{color:GOLD}}>PRO R$47/mês:</b> Tudo ilimitado</div>
        </div>}
      </div>
      <div style={{marginTop:14,fontSize:11,color:"#555"}}>Ao continuar você concorda com os Termos de Uso</div>
    </div>
  );
}

// ── MODAL UPGRADE ─────────────────────────────────────────────
function ModalUpgrade({onClose}){
  return(
    <div className="mbg" onClick={onClose}>
      <div className="mdl" onClick={e=>e.stopPropagation()}>
        <div className="hdl"/>
        <div style={{textAlign:"center",marginBottom:18}}>
          <div style={{fontSize:38,marginBottom:8}}>🔒</div>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:20,fontWeight:900,marginBottom:5,color:DARK}}>Recurso PRO</div>
          <div style={{fontSize:14,color:"#888"}}>Assine para desbloquear tudo</div>
        </div>
        {["✅ OS e Orçamentos ilimitados","✅ PDF profissional","✅ CRM completo","✅ Controle financeiro","✅ Contratos digitais","✅ Prospecção ilimitada","✅ Agenda completa","✅ Controle de estoque"].map(i=>(
          <div key={i} style={{fontSize:14,color:"#444",marginBottom:7,fontWeight:600}}>{i}</div>
        ))}
        <a href={HOTMART} target="_blank" rel="noreferrer" style={{display:"block",width:"100%",background:`linear-gradient(135deg,${GOLD},${GOLD2})`,color:"#1a1a1a",borderRadius:12,padding:"16px",fontSize:17,fontWeight:900,textAlign:"center",textDecoration:"none",marginTop:16,marginBottom:10}}>
          ⚡ Assinar por R$ 47/mês
        </a>
        <div style={{fontSize:12,color:"#999",textAlign:"center",marginBottom:10}}>PIX · Cartão · Boleto</div>
        <button onClick={onClose} className="btn btn-ghost" style={{width:"100%",fontSize:14,padding:"13px"}}>Continuar grátis</button>
      </div>
    </div>
  );
}

// ── ASSISTENTE IA ─────────────────────────────────────────────
function AssistenteIA({usuario,onClose}){
  const [falando,setFalando]=useState(false);
  const [pensando,setPensando]=useState(false);
  const [msg,setMsg]=useState("");
  const [fase,setFase]=useState(0);
  const nome=usuario?.nome?.split(" ")[0]||"Eletricista";

  const frases=[
    `Olá, ${nome}! Eu sou a ÍRIS, sua assistente inteligente do Prótons Prospect! Estou aqui para te ajudar a gerenciar seu negócio de forma profissional.`,
    `No Prótons você tem tudo que precisa: Ordem de Serviço, Orçamentos, Contratos em PDF, Controle Financeiro com gráficos, CRM de clientes e muito mais!`,
    `Nosso grande diferencial é a Prospecção com dados reais! Você encontra arquitetos, engenheiros e construtoras na sua cidade e manda mensagem pelo WhatsApp com um clique!`,
    `Estou sempre aqui para te ajudar. Basta tocar no meu ícone! Vamos começar? Bom trabalho, ${nome}! ⚡`,
  ];

  useEffect(()=>{
    setTimeout(()=>falarFrase(0),800);
  },[]);

  function falarFrase(i){
    if(i>=frases.length){setPensando(false);setFalando(false);setMsg("");return;}
    setMsg(frases[i]);setPensando(false);
    falar(frases[i],()=>setFalando(true),()=>{setFalando(false);setTimeout(()=>falarFrase(i+1),600);});
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#fff",borderRadius:24,padding:28,maxWidth:380,width:"100%",textAlign:"center",animation:"fadeUp .4s ease"}}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
          <CerebroIA falando={falando} pensando={pensando}/>
        </div>
        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:17,fontWeight:900,color:DARK,marginBottom:6}}>ÍRIS</div>
        <div style={{fontSize:13,color:"#888",marginBottom:16}}>Assistente Inteligente Prótons</div>
        <div style={{background:"#f8f8f8",borderRadius:14,padding:"14px 16px",minHeight:80,fontSize:15,color:"#333",lineHeight:1.7,textAlign:"left",marginBottom:18,fontWeight:600}}>
          {msg||<span style={{color:"#ccc"}}>Iniciando...</span>}
          {falando&&<span style={{display:"inline-block",width:8,height:16,background:GOLD,borderRadius:2,marginLeft:4,animation:"pisca 0.6s infinite"}}/>}
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>falarFrase(fase)} style={{flex:1,background:"#f5f5f5",border:"1.5px solid #e5e5e5",color:"#666",borderRadius:11,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer"}}>
            🔄 Repetir
          </button>
          <button onClick={onClose} style={{flex:2,background:`linear-gradient(135deg,${GOLD},${GOLD2})`,border:"none",color:"#1a1a1a",borderRadius:11,padding:"12px",fontSize:14,fontWeight:900,cursor:"pointer"}}>
            ⚡ Começar!
          </button>
        </div>
      </div>
    </div>
  );
}

// ── APP PRINCIPAL ─────────────────────────────────────────────
export default function App(){
  // TODOS HOOKS PRIMEIRO
  const [usuario,    setUsuario]    = useState(()=>{try{const s=sessionStorage.getItem("protons_user");return s?JSON.parse(s):null;}catch{return null;}});
  const [showIA,     setShowIA]     = useState(false);
  const [showUpgrade,setShowUpgrade]= useState(false);
  const [tab,        setTab]        = useState("inicio");
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [emp,        setEmp]        = useState({nome:"Prótons",cnpj:"",crea:"",tel:"",email:"",endereco:"",pix:""});
  const [clientes,   setClientes]   = useState([]);
  const [servicos,   setServicos]   = useState([
    {id:"s1",nome:"Ponto de tomada 20A",preco:85},{id:"s2",nome:"Ponto de iluminação",preco:70},
    {id:"s3",nome:"Ponto de chuveiro",preco:120},{id:"s4",nome:"Quadro de distribuição",preco:650},
    {id:"s5",nome:"Ar-condicionado split",preco:320},{id:"s6",nome:"Laudo elétrico + ART",preco:850},
    {id:"s7",nome:"SPDA / Para-raios",preco:1200},{id:"s8",nome:"Câmera de segurança",preco:280},
    {id:"s9",nome:"Alarme residencial",preco:450},{id:"s10",nome:"Aterramento",preco:480},
  ]);
  const [ordens,     setOrdens]     = useState([]);
  const [financeiro, setFin]        = useState([]);
  const [contatos,   setContatos]   = useState([]);
  const [estoque,    setEstoque]    = useState([
    {id:"e1",nome:"Cabo 2,5mm (metro)",qty:100,un:"m",preco:4.50},
    {id:"e2",nome:"Tomada 20A",qty:20,un:"un",preco:18},
    {id:"e3",nome:"Disjuntor 20A",qty:15,un:"un",preco:22},
    {id:"e4",nome:"Conduíte 3/4 (metro)",qty:50,un:"m",preco:3.20},
  ]);
  const [agenda,     setAgenda]     = useState([]);
  const [modalOS,    setModalOS]    = useState(false);
  const [editOSId,   setEditOSId]   = useState(null);
  const [formOS,     setFormOS]     = useState({});
  const [itensOS,    setItensOS]    = useState([]);
  const [iN,setIN]=useState("");const [iV,setIV]=useState("");const [iQ,setIQ]=useState("1");
  const [modalCli,   setModalCli]   = useState(false);
  const [formCli,    setFormCli]    = useState({});
  const [modalFin,   setModalFin]   = useState(false);
  const [formFin,    setFormFin]    = useState({tipo:"receita",desc:"",valor:"",data:new Date().toISOString().slice(0,10),cat:"Serviço"});
  const [modalCon,   setModalCon]   = useState(false);
  const [formCon,    setFormCon]    = useState({});
  const [modalAge,   setModalAge]   = useState(false);
  const [formAge,    setFormAge]    = useState({});
  const [modalEst,   setModalEst]   = useState(false);
  const [formEst,    setFormEst]    = useState({});
  const [fSN,setFSN]=useState("");const [fSP,setFSP]=useState("");
  const [pCidade,    setPCidade]    = useState("São Paulo");
  const [pBairro,    setPBairro]    = useState("Itaim Bibi");
  const [pSeg,       setPSeg]       = useState("arquitetura");
  const [pEmps,      setPEmps]      = useState([]);
  const [pScan,      setPScan]      = useState(false);
  const [pPct,       setPPct]       = useState(0);
  const [pDone,      setPDone]      = useState(false);
  const [msgP,       setMsgP]       = useState(MSG_PAD);
  const [editMsg,    setEditMsg]    = useState(false);
  const [pHist,      setPHist]      = useState([]);
  const [toast,      setToast]      = useState(null);
  const [iaFalando,  setIaFalando]  = useState(false);
  const pRef=useRef(null);

  const showOk  =m=>{setToast({m,t:"ok"});setTimeout(()=>setToast(null),2800);};
  const showWarn=m=>{setToast({m,t:"w"});setTimeout(()=>setToast(null),2800);};
  const isPro   =usuario?.plano==="pro";
  const logout  =()=>{sessionStorage.removeItem("protons_user");setUsuario(null);};

  // Mostra IA na primeira vez
  useEffect(()=>{
    if(usuario){
      const viu=sessionStorage.getItem("iris_apresentada");
      if(!viu){setShowIA(true);sessionStorage.setItem("iris_apresentada","1");}
    }
  },[usuario]);

  // Financeiro
  const mesH=new Date().getMonth(),anoH=new Date().getFullYear();
  const recM=financeiro.filter(f=>f.tipo==="receita"&&new Date(f.data).getMonth()===mesH).reduce((a,b)=>a+b.valor,0);
  const despM=financeiro.filter(f=>f.tipo==="despesa"&&new Date(f.data).getMonth()===mesH).reduce((a,b)=>a+b.valor,0);
  const saldo=recM-despM;
  const g6m=Array.from({length:6},(_,i)=>{const m=(mesH-5+i+12)%12,a=m>mesH?anoH-1:anoH;return{l:MESES[m],v:financeiro.filter(f=>f.tipo==="receita"&&new Date(f.data).getMonth()===m&&new Date(f.data).getFullYear()===a).reduce((a,b)=>a+b.valor,0)};});

  // OS
  function abrirOS(tipo){setEditOSId(null);setFormOS({numero:String(ordens.length+1).padStart(3,"0"),tipo:tipo||"orcamento",status:"orcamento",data:hoje(),pagamento:"À vista",clienteId:"",clienteNome:"",clienteTel:"",clienteEnd:"",local:"",descricao:"",obs:"",termos:"",desconto:0,sinal:0});setItensOS([]);setIN("");setIV("");setIQ("1");setModalOS(true);}
  function editOS(o){setEditOSId(o.id);setFormOS({...o});setItensOS(o.itens||[]);setIN("");setIV("");setIQ("1");setModalOS(true);}
  function addItem(){if(!iN||!iV)return;setItensOS(p=>[...p,{id:uid(),n:iN,v:Number(iV),q:Number(iQ||1)}]);setIN("");setIV("");setIQ("1");}
  function salvarOS(){
    const sub=itensOS.reduce((a,b)=>a+b.q*b.v,0),total=sub-(Number(formOS.desconto)||0);
    const o={...formOS,id:editOSId||uid(),itens:itensOS,subtotal:sub,total};
    if(editOSId)setOrdens(p=>p.map(x=>x.id===editOSId?o:x));else setOrdens(p=>[o,...p]);
    setModalOS(false);showOk(editOSId?"OS atualizada!":"OS criada!");
  }

  // Prospecção
  function iniciarScan(){
    if(pScan)return;setPDone(false);setPPct(0);setPEmps([]);setPScan(true);
    buscarEmpresas(pCidade,pBairro,pSeg).then(data=>{
      setPScan(false);
      if(!data||data.error){showWarn("Erro ao buscar. Tente novamente.");return;}
      let emps=(data.data||data.cnpjs||data.empresas||[]).map(e=>({
        id:e.cnpj||uid(),nome:e.razao_social||e.nome_fantasia||"Empresa",cnpj:e.cnpj||"",
        tel:(e.ddd1&&e.telefone1)?"("+e.ddd1+") "+e.telefone1:(e.telefone||"Não informado"),
        endereco:[e.logradouro,e.numero,e.bairro,e.municipio,e.uf].filter(Boolean).join(", "),
        segmento:pSeg,porte:e.porte||"",enviado:false,
      }));
      if(!isPro)emps=emps.slice(0,5);
      setPEmps(emps);setPDone(true);
      if(emps.length===0)showWarn("Nenhuma empresa encontrada.");else showOk(emps.length+" empresas encontradas!");
    });
    let p=0;const t=setInterval(()=>{p+=Math.random()*8+3;if(p>=95){clearInterval(t);p=95;}setPPct(Math.min(95,p));},150);
  }
  function enviarWA(e){
    const tel=e.tel.replace(/\D/g,"");
    if(!tel||e.tel==="Não informado"){showWarn("Empresa sem telefone.");return;}
    const txt=msgP.replace(/{NOME}/g,emp.nome||"Prótons").replace(/{EMPRESA}/g,e.nome).replace(/{ANOS}/g,"10");
    window.open("https://wa.me/55"+tel+"?text="+encodeURIComponent(txt),"_blank");
    setPEmps(p=>p.map(x=>x.id===e.id?{...x,enviado:true}:x));
    setPHist(p=>{const ex=p.find(c=>c.id===e.id);return ex?p:[{...e,enviado:true,em:hoje()},...p];});
    showOk("WhatsApp aberto — "+e.nome);
  }

  // IRIS fala
  function irisFlutuar(){
    const msgs=["Como posso ajudar?","Toque para interagir!","Sistema Prótons ativo ⚡"];
    const txt=msgs[~~(Math.random()*msgs.length)];
    falar(txt,()=>setIaFalando(true),()=>setIaFalando(false));
  }

  const MODULOS=[
    {id:"os",      label:"OS/Pedidos",  emoji:"📋", cor:"#6366f1",bg:"#ede9fe"},
    {id:"agenda",  label:"Agenda",      emoji:"📅", cor:"#3b82f6",bg:"#dbeafe"},
    {id:"fin",     label:"Financeiro",  emoji:"💰", cor:"#10b981",bg:"#d1fae5"},
    {id:"clientes",label:"Clientes",    emoji:"👥", cor:"#f59e0b",bg:"#fef3c7"},
    {id:"estoque", label:"Estoque",     emoji:"📦", cor:"#8b5cf6",bg:"#ede9fe"},
    {id:"servicos",label:"Serviços",    emoji:"🔧", cor:"#059669",bg:"#d1fae5"},
    {id:"prosp",   label:"Prospecção",  emoji:"📡", cor:GOLD2,   bg:"#fef9c3"},
    {id:"crm",     label:"CRM",         emoji:"🤝", cor:"#ec4899",bg:"#fce7f3"},
  ];

  if(!usuario)return <TelaLogin onLogin={u=>{setUsuario(u);setShowIA(true);}}/>;

  return(
    <div style={{minHeight:"100vh",background:"#f5f5f5",fontFamily:"'Nunito',sans-serif",color:DARK,overflowX:"hidden",paddingBottom:80}}>
      <style>{CSS}</style>

      {/* TOAST */}
      {toast&&<div style={{position:"fixed",top:14,left:"50%",transform:"translateX(-50%)",zIndex:9999,background:toast.t==="w"?"#1a0800":"#0a1a0a",border:"2px solid "+(toast.t==="w"?"#f59e0b":"#10b981"),borderRadius:12,padding:"11px 20px",fontSize:14,color:toast.t==="w"?"#f59e0b":"#10b981",fontWeight:700,whiteSpace:"nowrap",boxShadow:"0 8px 32px rgba(0,0,0,.3)",animation:"fadeUp .3s ease"}}>{toast.t==="w"?"⚠️ ":"✅ "}{toast.m}</div>}

      {/* IA */}
      {showIA&&<AssistenteIA usuario={usuario} onClose={()=>setShowIA(false)}/>}
      {showUpgrade&&<ModalUpgrade onClose={()=>setShowUpgrade(false)}/>}

      {/* MENU LATERAL */}
      {menuOpen&&<div style={{position:"fixed",inset:0,zIndex:800,display:"flex"}} onClick={()=>setMenuOpen(false)}>
        <div style={{width:280,background:"#fff",height:"100%",boxShadow:"4px 0 20px rgba(0,0,0,.15)",padding:24,display:"flex",flexDirection:"column",gap:8}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,paddingBottom:16,borderBottom:"1px solid #f0f0f0"}}>
            <div style={{width:48,height:48,borderRadius:"50%",background:`linear-gradient(135deg,${GOLD},${GOLD2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>⚡</div>
            <div>
              <div style={{fontWeight:900,fontSize:16,color:DARK}}>{usuario.nome?.split(" ")[0]}</div>
              <div style={{fontSize:12,color:"#888"}}>{isPro?"Plano PRO ⚡":"Plano Grátis"}</div>
            </div>
          </div>
          {MODULOS.map(m=>(
            <button key={m.id} onClick={()=>{setTab(m.id);setMenuOpen(false);}} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",borderRadius:12,border:"none",background:tab===m.id?m.bg:"transparent",color:tab===m.id?m.cor:"#555",fontSize:15,fontWeight:700,textAlign:"left",cursor:"pointer"}}>
              <span style={{fontSize:20}}>{m.emoji}</span>{m.label}
            </button>
          ))}
          <div style={{marginTop:"auto"}}>
            {!isPro&&<button onClick={()=>{setShowUpgrade(true);setMenuOpen(false);}} style={{width:"100%",background:`linear-gradient(135deg,${GOLD},${GOLD2})`,border:"none",color:"#1a1a1a",borderRadius:12,padding:"13px",fontSize:14,fontWeight:900,cursor:"pointer",marginBottom:10}}>⚡ Assinar PRO — R$47/mês</button>}
            <button onClick={logout} style={{width:"100%",background:"#f5f5f5",border:"1.5px solid #e5e5e5",color:"#888",borderRadius:12,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer"}}>🚪 Sair</button>
          </div>
        </div>
      </div>}

      {/* HEADER */}
      <div style={{background:"#fff",borderBottom:"1px solid #f0f0f0",padding:"14px 16px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:200,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
        <button onClick={()=>setMenuOpen(true)} style={{width:38,height:38,borderRadius:10,border:"none",background:"#f5f5f5",color:"#333",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>☰</button>
        <div style={{flex:1,textAlign:"center"}}>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:17,fontWeight:900,color:DARK}}>
            {MODULOS.find(m=>m.id===tab)?.label||"Início"}
          </div>
        </div>
        {/* IRIS botão */}
        <button onClick={()=>setShowIA(true)} style={{width:38,height:38,borderRadius:"50%",border:`2px solid ${GOLD}`,background:`linear-gradient(135deg,${GOLD},${GOLD2})`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16,animation:iaFalando?"pulso 0.5s infinite alternate":"none"}} title="ÍRIS - Assistente IA">
          🧠
        </button>
      </div>

      {/* CONTEÚDO */}
      <div style={{maxWidth:620,margin:"0 auto",padding:"16px"}}>

        {/* ─── INÍCIO ─── */}
        {tab==="inicio"&&<>
          {/* Banner upgrade */}
          {!isPro&&<div style={{background:`linear-gradient(135deg,${DARK2},#2a2000)`,borderRadius:18,padding:"18px 20px",marginBottom:16,cursor:"pointer"}} onClick={()=>setShowUpgrade(true)}>
            <div style={{fontSize:13,color:GOLD,fontWeight:700,marginBottom:4}}>✨ PRÓTONS PRO</div>
            <div style={{fontSize:17,fontWeight:900,color:"#fff",marginBottom:6}}>Profissionalize ainda mais seu negócio!</div>
            <div style={{background:GOLD,color:DARK,borderRadius:8,padding:"8px 16px",display:"inline-block",fontSize:14,fontWeight:900}}>Ver planos →</div>
          </div>}

          {/* Saudação */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:22,fontWeight:900,color:DARK}}>Olá, {usuario.nome?.split(" ")[0]}! ⚡</div>
            <div style={{fontSize:14,color:"#888"}}>O que vamos fazer hoje?</div>
          </div>

          {/* Grid módulos */}
          <div className="g2" style={{gap:12,marginBottom:16}}>
            {MODULOS.map(m=>(
              <button key={m.id} onClick={()=>{if(["os","fin","estoque","crm"].includes(m.id)&&!isPro){setShowUpgrade(true);return;}setTab(m.id);}} style={{background:"#fff",border:`2px solid ${m.bg}`,borderRadius:18,padding:"20px 14px",display:"flex",flexDirection:"column",alignItems:"center",gap:8,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,.06)",transition:"all .18s",position:"relative"}}>
                <div style={{width:54,height:54,borderRadius:16,background:m.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>{m.emoji}</div>
                <div style={{fontSize:14,fontWeight:800,color:m.cor}}>{m.label}</div>
                {["os","fin","estoque","crm"].includes(m.id)&&!isPro&&<div style={{position:"absolute",top:8,right:8,fontSize:12,background:GOLD,color:"#1a1a1a",borderRadius:6,padding:"2px 6px",fontWeight:800}}>PRO</div>}
              </button>
            ))}
          </div>

          {/* Resumo financeiro */}
          <div className="card" style={{padding:16,marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:800,color:"#888",marginBottom:10}}>RESUMO DO MÊS</div>
            <div className="g3" style={{gap:8}}>
              {[{l:"Receitas",v:fmt(recM),c:"#10b981"},{l:"Despesas",v:fmt(despM),c:"#ef4444"},{l:"Saldo",v:fmt(saldo),c:saldo>=0?"#10b981":"#ef4444"}].map(s=>(
                <div key={s.l} style={{background:"#f8f8f8",borderRadius:12,padding:"10px",textAlign:"center"}}>
                  <div style={{fontSize:13,fontWeight:800,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:11,color:"#888",marginTop:2,fontWeight:600}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Últimas OS */}
          {ordens.length>0&&<div className="card" style={{padding:16}}>
            <div style={{fontSize:14,fontWeight:800,color:"#888",marginBottom:10}}>ÚLTIMAS OS</div>
            {ordens.slice(0,3).map(o=>{const st=STATUS_OS[o.status];return(
              <div key={o.id} onClick={()=>editOS(o)} style={{display:"flex",alignItems:"center",gap:11,padding:"10px 0",borderBottom:"1px solid #f5f5f5",cursor:"pointer"}}>
                <div style={{width:40,height:40,borderRadius:12,background:"#f5f5f5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>📋</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.clienteNome||"Sem cliente"}</div>
                  <div style={{fontSize:12,color:"#888"}}>OS #{o.numero} · {o.data}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:14,fontWeight:800,color:"#10b981"}}>{fmt(o.total)}</div>
                  <span className="badge" style={{color:st?.c,borderColor:st?.c+"40",background:st?.c+"12",fontSize:10}}>{st?.l}</span>
                </div>
              </div>
            );})}
          </div>}
        </>}

        {/* ─── PROSPECÇÃO ─── */}
        {tab==="prosp"&&<>
          {/* Mensagem */}
          <div className="card" style={{padding:16,marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:15,fontWeight:800}}>✉️ Mensagem</div>
              <button onClick={()=>setEditMsg(!editMsg)} style={{background:editMsg?"#fef9c3":"#f5f5f5",border:`1px solid ${editMsg?GOLD:"#e5e5e5"}`,color:editMsg?GOLD2:"#888",borderRadius:9,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{editMsg?"✓ OK":"✏️ Editar"}</button>
            </div>
            {editMsg?(
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                <div style={{fontSize:12,color:"#888"}}>Use: <code style={{color:GOLD2}}>{"{NOME}"}</code> · <code style={{color:GOLD2}}>{"{EMPRESA}"}</code></div>
                <textarea value={msgP} onChange={e=>setMsgP(e.target.value)} rows={8} style={{width:"100%",background:"#f8f8f8",border:`1.5px solid ${GOLD}`,color:"#333",borderRadius:11,padding:"12px",fontSize:14,lineHeight:1.7,resize:"vertical",outline:"none"}}/>
                <button onClick={()=>setMsgP(MSG_PAD)} style={{background:"#f5f5f5",border:"1.5px solid #e5e5e5",color:"#888",borderRadius:9,padding:"8px",fontSize:12,fontWeight:700,cursor:"pointer"}}>↺ Restaurar padrão</button>
              </div>
            ):(
              <div style={{background:"#f8f8f8",borderRadius:10,padding:"10px 12px",maxHeight:72,overflow:"hidden",position:"relative"}}>
                <div style={{fontSize:12,color:"#888",lineHeight:1.6}}>{msgP.slice(0,120)}...</div>
                <div style={{position:"absolute",bottom:0,left:0,right:0,height:24,background:"linear-gradient(transparent,#f8f8f8)"}}/>
              </div>
            )}
          </div>

          {/* Filtros */}
          <div className="card" style={{padding:16,marginBottom:14}}>
            <div style={{fontSize:15,fontWeight:800,marginBottom:12}}>🔍 Onde buscar?</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div><label className="lbl">Cidade</label><select className="sel" value={pCidade} onChange={e=>{setPCidade(e.target.value);setPBairro(CIDADES[e.target.value]?.[0]||"");setPDone(false);setPEmps([]);}}>{Object.keys(CIDADES).map(c=><option key={c}>{c}</option>)}</select></div>
              <div><label className="lbl">Bairro</label><select className="sel" value={pBairro} onChange={e=>{setPBairro(e.target.value);setPDone(false);setPEmps([]);}}>{(CIDADES[pCidade]||[]).map(b=><option key={b}>{b}</option>)}</select></div>
            </div>
          </div>

          {/* Segmentos */}
          <div className="card" style={{padding:16,marginBottom:14}}>
            <div style={{fontSize:15,fontWeight:800,marginBottom:11}}>🏢 Tipo de empresa</div>
            <div className="g2" style={{gap:10}}>
              {SEGS.map(s=>{const act=pSeg===s.id;return(
                <button key={s.id} onClick={()=>{setPSeg(s.id);setPDone(false);setPEmps([]);}} style={{display:"flex",alignItems:"center",gap:10,padding:"13px",background:act?"#fef9c3":"#f8f8f8",border:`2px solid ${act?GOLD:"#e5e5e5"}`,borderRadius:14,cursor:"pointer",textAlign:"left"}}>
                  <span style={{fontSize:22}}>{s.emoji}</span>
                  <div><div style={{fontSize:13,fontWeight:800,color:act?GOLD2:"#555"}}>{s.label}</div></div>
                </button>
              );})}
            </div>
          </div>

          <button onClick={iniciarScan} disabled={pScan} style={{width:"100%",background:pScan?"#f5f5f5":`linear-gradient(135deg,${GOLD},${GOLD2})`,border:`2px solid ${pScan?"#e5e5e5":"transparent"}`,color:pScan?"#888":"#1a1a1a",borderRadius:14,padding:"18px",fontSize:18,fontWeight:900,cursor:pScan?"not-allowed":"pointer",marginBottom:14}}>
            {pScan?"⟳ Buscando... "+~~pPct+"%":pDone?"🔄 Buscar Novamente":"📡 BUSCAR EMPRESAS"}
          </button>

          {pScan&&<div style={{marginBottom:14}}><div style={{height:7,background:"#f0f0f0",borderRadius:4,overflow:"hidden"}}><div style={{width:pPct+"%",height:"100%",background:`linear-gradient(90deg,${GOLD},${GOLD2})`,transition:"width .1s",borderRadius:4}}/></div><div style={{textAlign:"center",marginTop:7,fontSize:13,color:GOLD2,fontWeight:700,animation:"sp 1s infinite"}}>Localizando empresas em {pBairro}...</div></div>}

          {pDone&&pEmps.length>0&&<>
            <div className="g3" style={{marginBottom:14}}>
              {[{l:"Encontradas",v:pEmps.length,c:GOLD2},{l:"Enviadas",v:pEmps.filter(e=>e.enviado).length,c:"#10b981"},{l:"Pendentes",v:pEmps.filter(e=>!e.enviado).length,c:"#f59e0b"}].map(s=>(
                <div key={s.l} className="card" style={{padding:"12px",textAlign:"center"}}>
                  <div style={{fontSize:22,fontWeight:900,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:11,color:"#888",fontWeight:700,marginTop:2}}>{s.l}</div>
                </div>
              ))}
            </div>
            {!isPro&&<div style={{background:"#fef9c3",border:`2px solid ${GOLD}`,borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <span style={{fontSize:24}}>🔒</span>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:800,color:GOLD2}}>Versão Grátis — 5 empresas</div><div style={{fontSize:12,color:"#888"}}>PRO encontra muito mais!</div></div>
              <button onClick={()=>setShowUpgrade(true)} style={{background:`linear-gradient(135deg,${GOLD},${GOLD2})`,border:"none",color:"#1a1a1a",borderRadius:9,padding:"9px 13px",fontSize:12,fontWeight:900,cursor:"pointer"}}>Ver PRO</button>
            </div>}
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {pEmps.map(e=>{const seg=SEGS.find(s=>s.id===e.segmento);return(
                <div key={e.id} className="card" style={{padding:16,border:`2px solid ${e.enviado?"#d1fae5":"#f0f0f0"}`}}>
                  <div style={{display:"flex",gap:11,alignItems:"center",marginBottom:12}}>
                    <div style={{width:46,height:46,borderRadius:14,background:e.enviado?"#d1fae5":"#f5f5f5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{seg?.emoji}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:15,fontWeight:800,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.nome}</div>
                      <div style={{fontSize:12,color:"#888"}}>{seg?.label} · {e.porte}</div>
                      <div style={{fontSize:13,color:"#10b981",fontWeight:700}}>📞 {e.tel}</div>
                      {e.endereco&&<div style={{fontSize:11,color:"#aaa",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📍 {e.endereco}</div>}
                    </div>
                    {e.enviado&&<span style={{background:"#d1fae5",border:"1px solid #6ee7b7",color:"#059669",borderRadius:8,padding:"3px 8px",fontSize:11,fontWeight:700}}>✓</span>}
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button className={"btn "+(e.enviado?"btn-ghost":"btn-wa")} onClick={()=>enviarWA(e)} style={{flex:2,fontSize:14,padding:"12px"}}>{e.enviado?"💬 Reenviar":"💬 WhatsApp"}</button>
                    <button onClick={()=>{setFormCon({id:uid(),nome:"",empresa:e.nome,tel:e.tel,email:"",segmento:e.segmento,status:"contato",obs:"Prospectado em "+hoje(),criadoEm:hoje()});setModalCon(true);setTab("crm");}} style={{background:"#f5f5f5",border:"1.5px solid #e5e5e5",color:"#555",borderRadius:11,padding:"12px 14px",fontSize:13,fontWeight:700,cursor:"pointer"}}>🤝 CRM</button>
                  </div>
                </div>
              );})}
            </div>
          </>}

          {!pScan&&!pDone&&<div style={{textAlign:"center",padding:"40px 0",color:"#ccc"}}>
            <div style={{fontSize:52,marginBottom:12,opacity:.4}}>📡</div>
            <div style={{fontSize:17,fontWeight:800,color:"#bbb",marginBottom:8}}>Pronto para prospectar!</div>
            <div style={{fontSize:14,color:"#ccc"}}>Selecione cidade, bairro e tipo de empresa.</div>
          </div>}
        </>}

        {/* ─── OS ─── */}
        {tab==="os"&&isPro&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:18,fontWeight:900}}>📋 OS / Orçamentos</div>
            <button className="btn btn-gold" onClick={()=>abrirOS()} style={{fontSize:13,padding:"9px 14px"}}>+ Nova</button>
          </div>
          {ordens.length===0&&<div style={{textAlign:"center",padding:"48px 0",color:"#ccc"}}><div style={{fontSize:48,marginBottom:10}}>📋</div><div style={{fontSize:17,fontWeight:700,color:"#bbb"}}>Nenhuma OS ainda</div></div>}
          {ordens.map(o=>{const st=STATUS_OS[o.status];return(
            <div key={o.id} className="card" style={{padding:16,marginBottom:12,border:`2px solid #f0f0f0`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <div><div style={{fontSize:15,fontWeight:800}}>{o.clienteNome||"Sem cliente"}</div><div style={{fontSize:12,color:"#888"}}>OS #{o.numero} · {o.data}</div></div>
                <span className="badge" style={{color:st?.c,borderColor:st?.c+"40",background:st?.c+"12",fontSize:10}}>{st?.l}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid #f5f5f5",paddingTop:10}}>
                <div style={{fontSize:19,fontWeight:900,color:"#10b981"}}>{fmt(o.total)}</div>
                <div style={{display:"flex",gap:8}}>
                  <button className="btn btn-ghost" onClick={()=>gerarPDF("","OS-"+o.numero)} style={{fontSize:12,padding:"8px 12px"}}>🖨️ PDF</button>
                  <button className="btn btn-gold" onClick={()=>editOS(o)} style={{fontSize:12,padding:"8px 12px"}}>✏️ Editar</button>
                </div>
              </div>
            </div>
          );})}
        </>}

        {/* ─── AGENDA ─── */}
        {tab==="agenda"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:18,fontWeight:900}}>📅 Agenda</div>
            <button className="btn btn-gold" onClick={()=>{setFormAge({id:uid(),titulo:"",data:"",hora:"",cliente:"",obs:""});setModalAge(true);}} style={{fontSize:13,padding:"9px 14px"}}>+ Agendar</button>
          </div>
          {agenda.length===0&&<div style={{textAlign:"center",padding:"48px 0",color:"#ccc"}}><div style={{fontSize:48,marginBottom:10}}>📅</div><div style={{fontSize:17,fontWeight:700,color:"#bbb"}}>Nenhum compromisso</div><div style={{fontSize:14,color:"#ccc",marginTop:4}}>Agende visitas e serviços</div></div>}
          {agenda.sort((a,b)=>a.data>b.data?1:-1).map(a=>(
            <div key={a.id} className="card" style={{padding:16,marginBottom:12,borderLeft:`4px solid ${GOLD}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <div style={{fontSize:15,fontWeight:800}}>{a.titulo}</div>
                <span style={{background:"#fef9c3",color:GOLD2,borderRadius:8,padding:"3px 9px",fontSize:12,fontWeight:700}}>{a.hora}</span>
              </div>
              <div style={{fontSize:13,color:"#888"}}>📅 {new Date(a.data).toLocaleDateString("pt-BR")} {a.cliente&&"· 👤 "+a.cliente}</div>
              {a.obs&&<div style={{fontSize:12,color:"#aaa",marginTop:4}}>{a.obs}</div>}
              <button onClick={()=>setAgenda(p=>p.filter(x=>x.id!==a.id))} style={{marginTop:8,background:"#fff0f0",border:"1px solid #fecaca",color:"#ef4444",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>🗑️ Remover</button>
            </div>
          ))}
        </>}

        {/* ─── FINANCEIRO ─── */}
        {tab==="fin"&&isPro&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:18,fontWeight:900}}>💰 Financeiro</div>
            <button className="btn btn-gold" onClick={()=>setModalFin(true)} style={{fontSize:13,padding:"9px 14px"}}>+ Lançar</button>
          </div>
          <div className="card" style={{padding:18,marginBottom:14,background:`linear-gradient(135deg,${DARK2},#2a2000)`}}>
            <div style={{fontSize:12,color:GOLD,fontWeight:700,marginBottom:2}}>SALDO DO MÊS</div>
            <div style={{fontSize:30,fontWeight:900,color:saldo>=0?GOLD:"#ef4444"}}>{fmt(saldo)}</div>
            <div className="g2" style={{marginTop:12,gap:8}}>
              <div style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:11,color:"#4ade80",fontWeight:700}}>RECEITAS</div><div style={{fontSize:16,fontWeight:800,color:"#4ade80"}}>{fmt(recM)}</div></div>
              <div style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:11,color:"#f87171",fontWeight:700}}>DESPESAS</div><div style={{fontSize:16,fontWeight:800,color:"#f87171"}}>{fmt(despM)}</div></div>
            </div>
          </div>
          <div className="card" style={{padding:16,marginBottom:14}}><div style={{fontSize:14,fontWeight:800,color:"#888",marginBottom:10}}>Receitas — 6 meses</div><BarChart data={g6m}/></div>
          <div className="card" style={{padding:16}}>
            <div style={{fontSize:14,fontWeight:800,color:"#888",marginBottom:10}}>Lançamentos</div>
            {financeiro.length===0&&<div style={{textAlign:"center",padding:20,color:"#ccc",fontSize:14}}>Nenhum lançamento.</div>}
            {financeiro.map(f=>(
              <div key={f.id} style={{display:"flex",alignItems:"center",gap:11,padding:"9px 0",borderBottom:"1px solid #f5f5f5"}}>
                <div style={{width:38,height:38,borderRadius:11,background:f.tipo==="receita"?"#d1fae5":"#fee2e2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>{f.tipo==="receita"?"📈":"📉"}</div>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.desc}</div><div style={{fontSize:12,color:"#888"}}>{f.cat} · {new Date(f.data).toLocaleDateString("pt-BR")}</div></div>
                <span style={{fontSize:14,fontWeight:800,color:f.tipo==="receita"?"#10b981":"#ef4444"}}>{f.tipo==="receita"?"+":"-"}{fmt(f.valor)}</span>
                <button onClick={()=>setFin(p=>p.filter(x=>x.id!==f.id))} style={{background:"none",border:"none",color:"#ccc",fontSize:15,cursor:"pointer"}}>✕</button>
              </div>
            ))}
          </div>
        </>}

        {/* ─── CLIENTES ─── */}
        {tab==="clientes"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:18,fontWeight:900}}>👥 Clientes</div>
            <button className="btn btn-gold" onClick={()=>{setFormCli({id:uid(),nome:"",cpfCnpj:"",tel:"",email:"",endereco:"",obs:""});setModalCli(true);}} style={{fontSize:13,padding:"9px 14px"}}>+ Novo</button>
          </div>
          {clientes.length===0&&<div style={{textAlign:"center",padding:"48px 0",color:"#ccc"}}><div style={{fontSize:48,marginBottom:10}}>👥</div><div style={{fontSize:17,fontWeight:700,color:"#bbb"}}>Nenhum cliente</div></div>}
          {clientes.map(c=>(
            <div key={c.id} className="card" style={{padding:16,marginBottom:12,display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:46,height:46,borderRadius:"50%",background:`linear-gradient(135deg,${GOLD},${GOLD2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:"#1a1a1a",fontWeight:900,flexShrink:0}}>{(c.nome?.[0]||"?").toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:15,fontWeight:800,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.nome}</div>
                <div style={{fontSize:12,color:"#888"}}>{c.tel}{c.cpfCnpj?" · "+c.cpfCnpj:""}</div>
              </div>
              <div style={{display:"flex",gap:6}}>
                {c.tel&&<a href={"https://wa.me/55"+c.tel.replace(/\D/g,"")} target="_blank" rel="noreferrer" style={{width:34,height:34,borderRadius:10,background:"#d1fae5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,textDecoration:"none"}}>💬</a>}
                <button onClick={()=>{setFormCli(c);setModalCli(true);}} style={{width:34,height:34,borderRadius:10,background:"#fef9c3",border:"none",fontSize:16,cursor:"pointer"}}>✏️</button>
                <button onClick={()=>{setClientes(p=>p.filter(x=>x.id!==c.id));showWarn("Removido.");}} style={{width:34,height:34,borderRadius:10,background:"#fee2e2",border:"none",fontSize:16,cursor:"pointer"}}>🗑️</button>
              </div>
            </div>
          ))}
        </>}

        {/* ─── ESTOQUE ─── */}
        {tab==="estoque"&&isPro&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:18,fontWeight:900}}>📦 Estoque</div>
            <button className="btn btn-gold" onClick={()=>{setFormEst({id:uid(),nome:"",qty:0,un:"un",preco:0});setModalEst(true);}} style={{fontSize:13,padding:"9px 14px"}}>+ Item</button>
          </div>
          {estoque.map(e=>(
            <div key={e.id} className="card" style={{padding:16,marginBottom:12,display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:46,height:46,borderRadius:14,background:"#f5f5f5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📦</div>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontWeight:800}}>{e.nome}</div>
                <div style={{fontSize:12,color:"#888"}}>{fmt(e.preco)}/{e.un}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:20,fontWeight:900,color:e.qty<5?"#ef4444":GOLD2}}>{e.qty}</div>
                <div style={{fontSize:11,color:"#888"}}>{e.un}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <button onClick={()=>setEstoque(p=>p.map(x=>x.id===e.id?{...x,qty:x.qty+1}:x))} style={{width:28,height:28,borderRadius:7,background:"#d1fae5",border:"none",fontSize:14,cursor:"pointer",fontWeight:900}}>+</button>
                <button onClick={()=>setEstoque(p=>p.map(x=>x.id===e.id?{...x,qty:Math.max(0,x.qty-1)}:x))} style={{width:28,height:28,borderRadius:7,background:"#fee2e2",border:"none",fontSize:14,cursor:"pointer",fontWeight:900}}>-</button>
              </div>
            </div>
          ))}
        </>}

        {/* ─── SERVIÇOS ─── */}
        {tab==="servicos"&&<>
          <div style={{fontSize:18,fontWeight:900,marginBottom:14}}>🔧 Tabela de Serviços</div>
          <div className="card" style={{padding:16,marginBottom:14}}>
            <div style={{display:"flex",gap:7,marginBottom:11}}>
              <input className="inp" placeholder="Nome do serviço" value={fSN} onChange={e=>setFSN(e.target.value)} style={{flex:2}}/>
              <input className="inp" type="number" placeholder="R$" value={fSP} onChange={e=>setFSP(e.target.value)} style={{width:80}}/>
              <button className="btn btn-gold" onClick={()=>{if(fSN&&fSP){setServicos(p=>[{id:uid(),nome:fSN,preco:Number(fSP)},...p]);setFSN("");setFSP("");showOk("Adicionado!");}}} style={{padding:"13px",fontSize:18}}>+</button>
            </div>
            {servicos.map(s=>(
              <div key={s.id} style={{display:"flex",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f5f5f5"}}>
                <span style={{fontSize:14,flex:1,fontWeight:600}}>{s.nome}</span>
                <span style={{fontSize:14,color:"#10b981",fontWeight:800,marginRight:12}}>{fmt(s.preco)}</span>
                <button onClick={()=>setServicos(p=>p.filter(x=>x.id!==s.id))} style={{background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:7,width:28,height:28,fontSize:13,cursor:"pointer"}}>✕</button>
              </div>
            ))}
          </div>
        </>}

        {/* ─── CRM ─── */}
        {tab==="crm"&&isPro&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:18,fontWeight:900}}>🤝 CRM</div>
            <button className="btn btn-gold" onClick={()=>{setFormCon({id:uid(),nome:"",empresa:"",tel:"",email:"",segmento:"arquitetura",status:"novo",obs:"",criadoEm:hoje()});setModalCon(true);}} style={{fontSize:13,padding:"9px 14px"}}>+ Contato</button>
          </div>
          {contatos.length===0&&<div style={{textAlign:"center",padding:"48px 0",color:"#ccc"}}><div style={{fontSize:48,marginBottom:10}}>🤝</div><div style={{fontSize:17,fontWeight:700,color:"#bbb"}}>Nenhum contato</div></div>}
          {contatos.map(c=>{
            const stC={"novo":"#888","contato":"#f59e0b","proposta":"#3b82f6","fechado":"#10b981","perdido":"#ef4444"}[c.status]||"#888";
            const stL={"novo":"Novo","contato":"Em Contato","proposta":"Proposta","fechado":"Fechado ✓","perdido":"Perdido"}[c.status]||c.status;
            return(<div key={c.id} className="card" style={{padding:14,marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <div><div style={{fontSize:14,fontWeight:800}}>{c.nome||c.empresa}</div><div style={{fontSize:12,color:"#888"}}>{c.empresa}</div></div>
                <span className="badge" style={{color:stC,borderColor:stC+"40",background:stC+"12",fontSize:10}}>{stL}</span>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:9}}>
                {["novo","contato","proposta","fechado","perdido"].map(s=>{const lbl={"novo":"Novo","contato":"Contato","proposta":"Proposta","fechado":"Fechado","perdido":"Perdido"}[s],sc={"novo":"#888","contato":"#f59e0b","proposta":"#3b82f6","fechado":"#10b981","perdido":"#ef4444"}[s];return<button key={s} onClick={()=>setContatos(p=>p.map(x=>x.id===c.id?{...x,status:s}:x))} style={{padding:"4px 8px",borderRadius:7,border:"1px solid "+(c.status===s?sc:"#e5e5e5"),background:c.status===s?sc+"15":"transparent",color:c.status===s?sc:"#888",fontSize:11,fontWeight:700,cursor:"pointer"}}>{lbl}</button>;})}
              </div>
              <div style={{display:"flex",gap:7}}>
                {c.tel&&<a href={"https://wa.me/55"+c.tel.replace(/\D/g,"")} target="_blank" rel="noreferrer" className="btn btn-wa" style={{flex:1,fontSize:13,padding:"9px",textDecoration:"none"}}>💬 WhatsApp</a>}
                <button onClick={()=>{setFormCon(c);setModalCon(true);}} className="btn btn-ghost" style={{flex:1,fontSize:13,padding:"9px"}}>✏️</button>
                <button onClick={()=>{setContatos(p=>p.filter(x=>x.id!==c.id));showWarn("Removido.");}} style={{background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:9,padding:"9px 10px",fontSize:13,fontWeight:700,cursor:"pointer"}}>🗑️</button>
              </div>
            </div>);
          })}
        </>}

      </div>

      {/* BARRA INFERIOR */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:"1px solid #f0f0f0",display:"flex",zIndex:100,boxShadow:"0 -2px 12px rgba(0,0,0,.08)"}}>
        {[{id:"inicio",em:"🏠",l:"Início"},{id:"prosp",em:"📡",l:"Prospecção"},{id:"clientes",em:"👥",l:"Clientes"},{id:"agenda",em:"📅",l:"Agenda"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"12px 4px",border:"none",background:"none",color:tab===t.id?GOLD2:"#aaa",borderTop:`3px solid ${tab===t.id?GOLD:"transparent"}`,transition:"all .18s",cursor:"pointer"}}>
            <span style={{fontSize:22}}>{t.em}</span>
            <span style={{fontSize:10,fontWeight:800}}>{t.l}</span>
          </button>
        ))}
      </div>

      {/* BOTÃO FLUTUANTE + Nova OS */}
      {isPro&&<button onClick={()=>abrirOS()} style={{position:"fixed",bottom:80,right:20,width:56,height:56,borderRadius:"50%",background:`linear-gradient(135deg,${GOLD},${GOLD2})`,border:"none",color:"#1a1a1a",fontSize:26,fontWeight:900,boxShadow:`0 4px 20px ${GOLD}60`,zIndex:150,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>}

      {/* ═══ MODAL OS ═══ */}
      {modalOS&&<div className="mbg" onClick={()=>setModalOS(false)}>
        <div className="mdl" onClick={e=>e.stopPropagation()}>
          <div className="hdl"/>
          <div style={{fontSize:17,fontWeight:900,marginBottom:16,color:DARK}}>{editOSId?"✏️ Editar OS":"📋 Nova OS"}</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",gap:7}}>{[{v:"orcamento",l:"📋 Orçamento"},{v:"contrato",l:"📄 Contrato"}].map(t=><button key={t.v} onClick={()=>setFormOS(p=>({...p,tipo:t.v}))} style={{flex:1,padding:"10px",borderRadius:10,border:`2px solid ${formOS.tipo===t.v?GOLD:"#e5e5e5"}`,background:formOS.tipo===t.v?"#fef9c3":"#f8f8f8",color:formOS.tipo===t.v?GOLD2:"#888",fontSize:13,fontWeight:800,cursor:"pointer"}}>{t.l}</button>)}</div>
            <div><label className="lbl">Cliente</label><select className="sel" value={formOS.clienteId||""} onChange={e=>{const c=clientes.find(x=>x.id===e.target.value);setFormOS(p=>({...p,clienteId:e.target.value,clienteNome:c?.nome||"",clienteTel:c?.tel||"",clienteEnd:c?.endereco||""}));}}><option value="">Selecionar...</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
            <div><label className="lbl">Nome do cliente</label><input className="inp" value={formOS.clienteNome||""} onChange={e=>setFormOS(p=>({...p,clienteNome:e.target.value}))} placeholder="Ex: Maria da Silva"/></div>
            <div><label className="lbl">Status</label><select className="sel" value={formOS.status||"orcamento"} onChange={e=>setFormOS(p=>({...p,status:e.target.value}))}>{Object.entries(STATUS_OS).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}</select></div>
            <div className="g2">{[{l:"Nº OS",f:"numero",p:"001"},{l:"Data",f:"data",p:hoje()},{l:"Vencimento",f:"vencimento",p:"dd/mm/aaaa"},{l:"Local",f:"local",p:"Endereço..."}].map(fi=><div key={fi.f}><label className="lbl">{fi.l}</label><input className="inp" value={formOS[fi.f]||""} onChange={e=>setFormOS(p=>({...p,[fi.f]:e.target.value}))} placeholder={fi.p}/></div>)}</div>
            <div><label className="lbl">Pagamento</label><select className="sel" value={formOS.pagamento||"À vista"} onChange={e=>setFormOS(p=>({...p,pagamento:e.target.value}))}>{PGTOS.map(p=><option key={p}>{p}</option>)}</select></div>
            <div><label className="lbl">Descrição</label><textarea className="inp" rows={2} value={formOS.descricao||""} onChange={e=>setFormOS(p=>({...p,descricao:e.target.value}))} placeholder="Descreva o serviço..." style={{resize:"vertical"}}/></div>
            <div>
              <label className="lbl">Serviços</label>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:9}}>{servicos.slice(0,6).map(s=><button key={s.id} onClick={()=>setItensOS(p=>[...p,{id:uid(),n:s.nome,v:s.preco,q:1}])} style={{background:"#fef9c3",border:`1px solid ${GOLD}`,color:GOLD2,borderRadius:7,padding:"4px 9px",fontSize:11,fontWeight:700,cursor:"pointer"}}>+ {s.nome.slice(0,14)}</button>)}</div>
              <div style={{display:"flex",gap:6,marginBottom:9}}>
                <input className="inp" placeholder="Descrição" value={iN} onChange={e=>setIN(e.target.value)} style={{flex:2}}/>
                <input className="inp" type="number" placeholder="R$" value={iV} onChange={e=>setIV(e.target.value)} style={{width:72}}/>
                <input className="inp" type="number" placeholder="Qtd" value={iQ} onChange={e=>setIQ(e.target.value)} style={{width:54}}/>
                <button className="btn btn-gold" onClick={addItem} style={{padding:"13px",fontSize:17}}>+</button>
              </div>
              {itensOS.length>0&&<div style={{background:"#f8f8f8",borderRadius:10,overflow:"hidden",marginBottom:9}}>{itensOS.map(it=><div key={it.id} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 12px",borderBottom:"1px solid #f0f0f0"}}><span style={{flex:1,fontSize:13,fontWeight:600}}>{it.n}</span><input type="number" value={it.q} onChange={e=>setItensOS(p=>p.map(x=>x.id===it.id?{...x,q:Number(e.target.value)}:x))} style={{width:38,background:"#fff",border:"1px solid #e5e5e5",color:"#333",borderRadius:5,padding:"2px 4px",fontSize:12,textAlign:"center"}}/><span style={{fontSize:13,color:"#10b981",fontWeight:800,width:76,textAlign:"right"}}>{fmt(it.q*it.v)}</span><button onClick={()=>setItensOS(p=>p.filter(x=>x.id!==it.id))} style={{background:"none",border:"none",color:"#ef4444",fontSize:14,cursor:"pointer"}}>✕</button></div>)}</div>}
            </div>
            <div className="g2">
              <div><label className="lbl">Desconto (R$)</label><input className="inp" type="number" value={formOS.desconto||""} onChange={e=>setFormOS(p=>({...p,desconto:Number(e.target.value)}))} placeholder="0"/></div>
              <div><label className="lbl">Sinal/Entrada</label><input className="inp" type="number" value={formOS.sinal||""} onChange={e=>setFormOS(p=>({...p,sinal:Number(e.target.value)}))} placeholder="0"/></div>
            </div>
            {itensOS.length>0&&<div style={{background:"#fef9c3",border:`1px solid ${GOLD}`,borderRadius:10,padding:"12px 14px"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:"#888"}}>Subtotal</span><span style={{fontSize:13,fontWeight:700}}>{fmt(itensOS.reduce((a,b)=>a+b.q*b.v,0))}</span></div><div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #e5e5e5",paddingTop:6}}><span style={{fontSize:14,fontWeight:900,color:DARK}}>TOTAL</span><span style={{fontSize:20,fontWeight:900,color:GOLD2}}>{fmt(itensOS.reduce((a,b)=>a+b.q*b.v,0)-(Number(formOS.desconto)||0))}</span></div></div>}
            <div><label className="lbl">Observações</label><textarea className="inp" rows={2} value={formOS.obs||""} onChange={e=>setFormOS(p=>({...p,obs:e.target.value}))} style={{resize:"vertical"}}/></div>
            <button className="btn btn-gold" onClick={salvarOS} style={{width:"100%",fontSize:15,padding:"14px"}}>💾 Salvar OS</button>
            <button className="btn btn-ghost" onClick={()=>setModalOS(false)} style={{width:"100%",fontSize:13,padding:"12px"}}>Cancelar</button>
          </div>
        </div>
      </div>}

      {/* ═══ MODAL CLIENTE ═══ */}
      {modalCli&&<div className="mbg" onClick={()=>setModalCli(false)}>
        <div className="mdl" onClick={e=>e.stopPropagation()}>
          <div className="hdl"/>
          <div style={{fontSize:17,fontWeight:900,marginBottom:16}}>👤 Cliente</div>
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            {[{l:"Nome",f:"nome",p:"Maria da Silva"},{l:"CPF/CNPJ",f:"cpfCnpj",p:"000.000.000-00"},{l:"Telefone",f:"tel",p:"(11) 99999-9999"},{l:"E-mail",f:"email",p:"email@email.com"},{l:"Endereço",f:"endereco",p:"Rua, nº, bairro"}].map(fi=><div key={fi.f}><label className="lbl">{fi.l}</label><input className="inp" value={formCli[fi.f]||""} onChange={e=>setFormCli(p=>({...p,[fi.f]:e.target.value}))} placeholder={fi.p}/></div>)}
            <button className="btn btn-gold" onClick={()=>{if(clientes.find(c=>c.id===formCli.id))setClientes(p=>p.map(c=>c.id===formCli.id?formCli:c));else setClientes(p=>[formCli,...p]);setModalCli(false);showOk("Salvo!");}} style={{width:"100%",fontSize:15,padding:"14px"}}>💾 Salvar</button>
            <button className="btn btn-ghost" onClick={()=>setModalCli(false)} style={{width:"100%",fontSize:13,padding:"12px"}}>Cancelar</button>
          </div>
        </div>
      </div>}

      {/* ═══ MODAL FINANCEIRO ═══ */}
      {modalFin&&<div className="mbg" onClick={()=>setModalFin(false)}>
        <div className="mdl" onClick={e=>e.stopPropagation()}>
          <div className="hdl"/>
          <div style={{fontSize:17,fontWeight:900,marginBottom:16}}>💰 Novo Lançamento</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",gap:8}}>{[{v:"receita",l:"📈 Receita",c:"#10b981"},{v:"despesa",l:"📉 Despesa",c:"#ef4444"}].map(t=><button key={t.v} onClick={()=>setFormFin(p=>({...p,tipo:t.v}))} style={{flex:1,padding:"12px",borderRadius:10,border:`2px solid ${formFin.tipo===t.v?t.c:"#e5e5e5"}`,background:formFin.tipo===t.v?t.c+"15":"#f8f8f8",color:formFin.tipo===t.v?t.c:"#888",fontSize:14,fontWeight:800,cursor:"pointer"}}>{t.l}</button>)}</div>
            <div><label className="lbl">Descrição</label><input className="inp" value={formFin.desc} onChange={e=>setFormFin(p=>({...p,desc:e.target.value}))} placeholder="Ex: Pagamento OS #001"/></div>
            <div className="g2">
              <div><label className="lbl">Valor (R$)</label><input className="inp" type="number" value={formFin.valor} onChange={e=>setFormFin(p=>({...p,valor:e.target.value}))} placeholder="0,00"/></div>
              <div><label className="lbl">Data</label><input className="inp" type="date" value={formFin.data} onChange={e=>setFormFin(p=>({...p,data:e.target.value}))}/></div>
            </div>
            <div><label className="lbl">Categoria</label><select className="sel" value={formFin.cat} onChange={e=>setFormFin(p=>({...p,cat:e.target.value}))}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
            <button className="btn btn-gold" onClick={()=>{if(!formFin.desc||!formFin.valor){showWarn("Preencha todos os campos.");return;}setFin(p=>[{...formFin,id:uid(),valor:Number(formFin.valor)},...p]);setModalFin(false);setFormFin({tipo:"receita",desc:"",valor:"",data:new Date().toISOString().slice(0,10),cat:"Serviço"});showOk("Salvo!");}} style={{width:"100%",fontSize:15,padding:"14px"}}>💾 Salvar</button>
            <button className="btn btn-ghost" onClick={()=>setModalFin(false)} style={{width:"100%",fontSize:13,padding:"12px"}}>Cancelar</button>
          </div>
        </div>
      </div>}

      {/* ═══ MODAL AGENDA ═══ */}
      {modalAge&&<div className="mbg" onClick={()=>setModalAge(false)}>
        <div className="mdl" onClick={e=>e.stopPropagation()}>
          <div className="hdl"/>
          <div style={{fontSize:17,fontWeight:900,marginBottom:16}}>📅 Novo Compromisso</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {[{l:"Título",f:"titulo",p:"Ex: Visita técnica"},{l:"Cliente",f:"cliente",p:"Nome do cliente"},{l:"Observações",f:"obs",p:"Detalhes..."}].map(fi=><div key={fi.f}><label className="lbl">{fi.l}</label><input className="inp" value={formAge[fi.f]||""} onChange={e=>setFormAge(p=>({...p,[fi.f]:e.target.value}))} placeholder={fi.p}/></div>)}
            <div className="g2">
              <div><label className="lbl">Data</label><input className="inp" type="date" value={formAge.data||""} onChange={e=>setFormAge(p=>({...p,data:e.target.value}))}/></div>
              <div><label className="lbl">Hora</label><input className="inp" type="time" value={formAge.hora||""} onChange={e=>setFormAge(p=>({...p,hora:e.target.value}))}/></div>
            </div>
            <button className="btn btn-gold" onClick={()=>{if(!formAge.titulo){showWarn("Digite um título.");return;}setAgenda(p=>[{...formAge,id:formAge.id||uid()},...p]);setModalAge(false);showOk("Compromisso salvo!");}} style={{width:"100%",fontSize:15,padding:"14px"}}>💾 Salvar</button>
            <button className="btn btn-ghost" onClick={()=>setModalAge(false)} style={{width:"100%",fontSize:13,padding:"12px"}}>Cancelar</button>
          </div>
        </div>
      </div>}

      {/* ═══ MODAL ESTOQUE ═══ */}
      {modalEst&&<div className="mbg" onClick={()=>setModalEst(false)}>
        <div className="mdl" onClick={e=>e.stopPropagation()}>
          <div className="hdl"/>
          <div style={{fontSize:17,fontWeight:900,marginBottom:16}}>📦 Novo Item</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div><label className="lbl">Nome do material</label><input className="inp" value={formEst.nome||""} onChange={e=>setFormEst(p=>({...p,nome:e.target.value}))} placeholder="Ex: Cabo 2,5mm"/></div>
            <div className="g2">
              <div><label className="lbl">Quantidade</label><input className="inp" type="number" value={formEst.qty||0} onChange={e=>setFormEst(p=>({...p,qty:Number(e.target.value)}))}/></div>
              <div><label className="lbl">Unidade</label><select className="sel" value={formEst.un||"un"} onChange={e=>setFormEst(p=>({...p,un:e.target.value}))}>{["un","m","kg","l","cx","pc"].map(u=><option key={u}>{u}</option>)}</select></div>
            </div>
            <div><label className="lbl">Preço unitário (R$)</label><input className="inp" type="number" value={formEst.preco||0} onChange={e=>setFormEst(p=>({...p,preco:Number(e.target.value)}))}/></div>
            <button className="btn btn-gold" onClick={()=>{if(!formEst.nome){showWarn("Digite o nome.");return;}setEstoque(p=>[{...formEst,id:formEst.id||uid()},...p]);setModalEst(false);showOk("Item salvo!");}} style={{width:"100%",fontSize:15,padding:"14px"}}>💾 Salvar</button>
            <button className="btn btn-ghost" onClick={()=>setModalEst(false)} style={{width:"100%",fontSize:13,padding:"12px"}}>Cancelar</button>
          </div>
        </div>
      </div>}

      {/* ═══ MODAL CONTATO ═══ */}
      {modalCon&&<div className="mbg" onClick={()=>setModalCon(false)}>
        <div className="mdl" onClick={e=>e.stopPropagation()}>
          <div className="hdl"/>
          <div style={{fontSize:17,fontWeight:900,marginBottom:16}}>🤝 Contato CRM</div>
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            {[{l:"Nome",f:"nome",p:"Ex: Carlos"},{l:"Empresa",f:"empresa",p:"Ex: Studio Arq"},{l:"Telefone",f:"tel",p:"(11) 99999-9999"},{l:"E-mail",f:"email",p:"email@email.com"}].map(fi=><div key={fi.f}><label className="lbl">{fi.l}</label><input className="inp" value={formCon[fi.f]||""} onChange={e=>setFormCon(p=>({...p,[fi.f]:e.target.value}))} placeholder={fi.p}/></div>)}
            <div><label className="lbl">Segmento</label><select className="sel" value={formCon.segmento||"arquitetura"} onChange={e=>setFormCon(p=>({...p,segmento:e.target.value}))}>{SEGS.map(s=><option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}</select></div>
            <div><label className="lbl">Observações</label><textarea className="inp" rows={2} value={formCon.obs||""} onChange={e=>setFormCon(p=>({...p,obs:e.target.value}))} style={{resize:"vertical"}}/></div>
            <button className="btn btn-gold" onClick={()=>{if(contatos.find(c=>c.id===formCon.id))setContatos(p=>p.map(c=>c.id===formCon.id?formCon:c));else setContatos(p=>[{...formCon,id:formCon.id||uid(),criadoEm:hoje()},...p]);setModalCon(false);showOk("Salvo!");}} style={{width:"100%",fontSize:15,padding:"14px"}}>💾 Salvar</button>
            <button className="btn btn-ghost" onClick={()=>setModalCon(false)} style={{width:"100%",fontSize:13,padding:"12px"}}>Cancelar</button>
          </div>
        </div>
      </div>}

    </div>
  );
}
