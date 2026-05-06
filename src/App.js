import { useState, useRef, useEffect } from "react";

// ── CONFIG ────────────────────────────────────────────────────
const SUPA_URL = "https://hrqhqqakvkdkapfijhij.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhycWhxcWFrdmtka2FwZmlqaGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDc1OTYsImV4cCI6MjA5MzU4MzU5Nn0.5YM_CUIuaSmb4lZngDXqJdEuPbGF53F5Qc9nbXLkk2k";
const HOTMART  = "https://hotmart.com/produto/protons-prospect";
const CASA_KEY = "64b4a4ee0c6a8f0c68c1fd3b8a802377edaa123d2de0dba7afb356bd8d165b55c496506456420da93d6483203b2713d322e658fca01e62ff3cd86b6476cbf043";
const GOLD     = "#F5C518";
const GOLD2    = "#C9A227";
const DARK     = "#1a1a1a";

// ── UTILS ─────────────────────────────────────────────────────
const fmt  = v => (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const hoje = () => new Date().toLocaleDateString("pt-BR");
const uid  = () => Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ── SUPABASE ──────────────────────────────────────────────────
const SH = {"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Content-Type":"application/json"};
async function dbGet(t,c,v){try{const r=await fetch(`${SUPA_URL}/rest/v1/${t}?${c}=eq.${encodeURIComponent(v)}&select=*`,{headers:SH});return await r.json();}catch{return[];}}
async function dbIns(t,d){try{const r=await fetch(`${SUPA_URL}/rest/v1/${t}`,{method:"POST",headers:{...SH,"Prefer":"return=representation"},body:JSON.stringify(d)});const j=await r.json();return Array.isArray(j)?j[0]:j;}catch{return null;}}
async function fazerLogin(email,senha){const rows=await dbGet("usuarios","email",email.toLowerCase().trim());if(!rows||rows.length===0)return{erro:"E-mail não encontrado."};const u=rows[0];if(u.senha!==senha)return{erro:"Senha incorreta."};return{usuario:u};}
async function fazerCadastro(nome,email,senha){const ex=await dbGet("usuarios","email",email.toLowerCase().trim());if(ex&&ex.length>0)return{erro:"E-mail já cadastrado."};const u=await dbIns("usuarios",{nome,email:email.toLowerCase().trim(),senha,plano:"pro",assinatura_ativa:true});if(!u)return{erro:"Erro ao criar conta."};return{usuario:u};}
function loginGoogle(){window.location.href=`${SUPA_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin)}`;}

// ── CASA DOS DADOS (via proxy Vercel) ────────────────────────
const CNAES={
  arquitetura:["7111100"],engenharia:["7112000"],
  construtora:["4120400","4399103"],imobiliaria:["6821801","6821802"],
  industria:["2899199","2812200"],comercio:["4789099","4744001"],
  hospital:["8610101","8630501"],escola:["8513900","8520100"],
  condominio:["8112500","6810202"],supermercado:["4711301","4711302"]
};

async function buscarEmpresas(municipio, bairro, seg){
  try{
    // Remove acentos para a API
    const norm=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();

    const body={
      municipio:[norm(municipio)],
      codigo_atividade_principal:CNAES[seg]||["7111100"],
      ...(bairro&&bairro.trim()?{bairro:[norm(bairro)]}:{})
    };

    const r=await fetch("/api/buscar",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(body)
    });

    if(!r.ok){
      const err=await r.json().catch(()=>({}));
      console.error("Proxy erro:",err);
      return null;
    }

    const data=await r.json();
    // API v2 retorna { data: { cnpj: [...] } }
    const lista=data?.cnpjs||data?.data?.cnpj||data?.cnpj||[];
    return{lista};
  }catch(e){
    console.error("Erro busca:",e);
    return null;
  }
}

// ── VOZ ───────────────────────────────────────────────────────
function getVozFeminina(){
  const vozes=window.speechSynthesis.getVoices();
  return vozes.find(v=>v.lang.startsWith("pt")&&(
    v.name.includes("Luciana")||v.name.includes("Vitoria")||
    v.name.includes("Francisca")||v.name.includes("Google")||
    v.name.toLowerCase().includes("female")
  ))||vozes.find(v=>v.lang.startsWith("pt"))||null;
}

function falar(texto, onStart, onEnd){
  if(!window.speechSynthesis)return;
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(texto);
  u.lang="pt-BR"; u.rate=0.95; u.pitch=1.15; u.volume=1;

  function executar(){
    const voz=getVozFeminina();
    if(voz) u.voice=voz;
    u.onstart=()=>onStart&&onStart();
    u.onend=()=>onEnd&&onEnd();
    u.onerror=()=>onEnd&&onEnd();
    window.speechSynthesis.speak(u);
  }

  const vozes=window.speechSynthesis.getVoices();
  if(vozes.length>0){executar();}
  else{window.speechSynthesis.onvoiceschanged=()=>{window.speechSynthesis.onvoiceschanged=null;executar();};}
}

function ouvirVoz(onResult, onError){
  try{
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR){onError("Navegador não suporta reconhecimento de voz.");return null;}
    const r = new SR();
    r.lang="pt-BR"; r.continuous=false; r.interimResults=false;
    r.onresult = e=>onResult(e.results[0][0].transcript);
    r.onerror  = e=>onError("Não entendi. Tente novamente.");
    r.start();
    return r;
  }catch{onError("Erro ao acessar microfone.");return null;}
}

// ── RESPOSTAS DA IA ───────────────────────────────────────────
function processarComando(cmd, nomeAssistente){
  const c = cmd.toLowerCase();
  if(c.includes("os")||c.includes("ordem")||c.includes("orçamento"))
    return`Para criar uma OS, toque em OS/Pedidos no menu e depois toque no botão Nova OS. Preencha os dados do cliente e adicione os serviços!`;
  if(c.includes("prospecção")||c.includes("prospect")||c.includes("empresa"))
    return`Na aba Prospecção você encontra empresas reais de todo o Brasil! Escolha a cidade, o tipo de empresa e toque em Buscar. Depois é só enviar a mensagem pelo WhatsApp!`;
  if(c.includes("financeiro")||c.includes("dinheiro")||c.includes("receita"))
    return`No Financeiro você controla receitas e despesas da empresa e pessoais separados. Também tem controle por obra!`;
  if(c.includes("obra")||c.includes("mapeamento"))
    return`No Mapeamento de Obra você cria os cômodos, mapeia tomadas, lâmpadas e disjuntores, e gera o orçamento automaticamente em PDF!`;
  if(c.includes("calculadora")||c.includes("corrente")||c.includes("potência")||c.includes("cabo"))
    return`A Calculadora Elétrica calcula corrente, potência, queda de tensão e indica o cabo e disjuntor ideais para cada circuito!`;
  if(c.includes("foto")||c.includes("visita")||c.includes("foto"))
    return`Em Visitas Técnicas você cria pastas por obra e tira fotos direto pelo celular para documentar o serviço!`;
  if(c.includes("cliente"))
    return`Em Clientes você cadastra todos os seus clientes com telefone, endereço e histórico. Pode chamar pelo WhatsApp com um toque!`;
  if(c.includes("agenda")||c.includes("compromisso"))
    return`Na Agenda você agenda visitas e serviços, com data e hora. Nunca mais perde um compromisso!`;
  if(c.includes("estoque")||c.includes("material"))
    return`No Estoque você controla todos os materiais disponíveis. Quando usar em uma OS, o estoque é atualizado automaticamente!`;
  if(c.includes("olá")||c.includes("oi")||c.includes("bom dia")||c.includes("boa tarde"))
    return`Olá! Eu sou ${nomeAssistente}, sua assistente inteligente do Prótons Prospect! Como posso te ajudar hoje?`;
  if(c.includes("ajuda")||c.includes("funcionalidades")||c.includes("o que você faz"))
    return`Posso te ajudar com: criar OS e orçamentos, prospectar clientes, controle financeiro, mapeamento de obras, calculadora elétrica, visitas técnicas e muito mais! O que precisa?`;
  return`Entendi! Estou aqui para te ajudar com o Prótons Prospect. Pode me perguntar sobre OS, financeiro, prospecção, obra, calculadora elétrica ou qualquer função do app!`;
}

// ── DADOS ─────────────────────────────────────────────────────
const SEGS=[
  {id:"arquitetura",label:"Arquitetos",emoji:"📐",cor:"#6366f1"},
  {id:"engenharia",label:"Engenheiros",emoji:"⚙️",cor:"#f59e0b"},
  {id:"construtora",label:"Construtoras",emoji:"🏗️",cor:"#10b981"},
  {id:"imobiliaria",label:"Imobiliárias",emoji:"🏠",cor:"#ec4899"},
  {id:"industria",label:"Indústrias",emoji:"🏭",cor:"#8b5cf6"},
  {id:"comercio",label:"Comércio",emoji:"🏪",cor:"#06b6d4"},
  {id:"hospital",label:"Hospitais",emoji:"🏥",cor:"#ef4444"},
  {id:"escola",label:"Escolas",emoji:"🏫",cor:"#0891b2"},
  {id:"condominio",label:"Condomínios",emoji:"🏢",cor:"#7c3aed"},
  {id:"supermercado",label:"Supermercados",emoji:"🛒",cor:"#ca8a04"},
];

const MSG_PAD=`Olá! 😊\n\nMeu nome é *{NOME}*, da *Prótons Serviços Elétricos e Segurança Eletrônica*.\n\nGostaria de apresentar nossos serviços à *{EMPRESA}*:\n\n⚡ Instalações elétricas completas\n⚡ Laudos e projetos elétricos (ART/RRT)\n⚡ Manutenção preventiva e corretiva\n⚡ SPDA e aterramento\n⚡ Segurança eletrônica\n⚡ Adequação NR10 e NBR 5410\n\nPodemos conversar? 🤝`;
const STATUS_OS={orcamento:{l:"Orçamento",c:"#f59e0b"},aprovado:{l:"Aprovado",c:"#3b82f6"},andamento:{l:"Em Andamento",c:"#8b5cf6"},concluido:{l:"Concluído",c:"#10b981"},cancelado:{l:"Cancelado",c:"#ef4444"}};
const PGTOS=["À vista","PIX","Cartão","50% entrada + 50% conclusão","30 dias","Parcelado 3x","Outro"];
const CATS_FIN=["Serviço","Material","Ferramenta","Combustível","Alimentação","Impostos","Salário","Obra","Outros"];

// ── CALCULADORA ELÉTRICA COMPLETA ────────────────────────────
const CABOS=[{s:1.5,cap:15},{s:2.5,cap:21},{s:4,cap:27},{s:6,cap:35},{s:10,cap:48},{s:16,cap:65},{s:25,cap:85},{s:35,cap:104},{s:50,cap:125}];
function caboIdeal(I){return CABOS.find(c=>c.cap>=I*1.25)||CABOS[CABOS.length-1];}
function disjIdeal(I){const d=[6,10,16,20,25,32,40,50,63,70,80,100];return d.find(x=>x>=I*1.25)||100;}
function quedaTensao(I,D,S,V){return((2*I*D*0.0175)/S/V*100).toFixed(2);}

function CalculadoraEletrica(){
  const [tipo,setTipo]=useState("residencial");
  const [form,setForm]=useState({pot:"",tensao:"220",fp:"0.92",dist:"10",fases:"1",rendimento:"0.90",btu:"",cargaTotal:"",fd:"0.7"});
  const [res,setRes]=useState(null);
  const F=form;

  function calcular(){
    let I,cabo,disj,queda,obs="";
    const V=Number(F.tensao),D=Number(F.dist)||10,FP=Number(F.fp)||0.92;

    if(tipo==="residencial"||tipo==="iluminacao"||tipo==="tomada"){
      const P=Number(F.pot);if(!P){alert("Informe a potência.");return;}
      I=P/(V*FP);
      cabo=caboIdeal(I);queda=quedaTensao(I,D,cabo.s,V);disj=disjIdeal(I);
      obs=Number(queda)>4?"⚠️ Queda acima de 4%! Aumente a seção do cabo.":"✅ Queda dentro do limite NBR 5410 (máx 4%).";
    }
    else if(tipo==="motor"){
      const P=Number(F.pot),rend=Number(F.rendimento)||0.90,fases=Number(F.fases)||3;
      if(!P){alert("Informe a potência.");return;}
      if(fases===3) I=(P*1000)/(Math.sqrt(3)*V*FP*rend);
      else I=(P*1000)/(V*FP*rend);
      cabo=caboIdeal(I*1.25);queda=quedaTensao(I,D,cabo.s,V);disj=disjIdeal(I*1.25);
      obs=`Motor ${fases===3?"Trifásico":"Monofásico"} — corrente de partida ≈ ${(I*7).toFixed(1)}A. Use disjuntor com curva D ou chave de partida suave.`;
    }
    else if(tipo==="arcondicionado"){
      const btu=Number(F.btu);if(!btu){alert("Informe o BTU.");return;}
      const P=btu/3.517;
      I=P*1000/(V*FP);
      cabo=caboIdeal(I);queda=quedaTensao(I,D,cabo.s,V);disj=disjIdeal(I);
      const area=btu<=9000?"até 10m²":btu<=12000?"até 15m²":btu<=18000?"até 25m²":btu<=24000?"até 35m²":"acima de 35m²";
      obs=`Potência equivalente: ${P.toFixed(2)}kW. Área recomendada: ${area}. Requer circuito exclusivo.`;
    }
    else if(tipo==="carga"){
      const ct=Number(F.cargaTotal),fd=Number(F.fd)||0.7;if(!ct){alert("Informe a carga total.");return;}
      const P=ct*fd;
      I=P/(V*FP);
      cabo=caboIdeal(I);queda=quedaTensao(I,D,cabo.s,V);disj=disjIdeal(I);
      obs=`Carga instalada: ${ct}W. Fator de demanda: ${fd*100}%. Carga de demanda: ${P.toFixed(0)}W.`;
    }

    setRes({corrente:I.toFixed(2),cabo:cabo.s,disjuntor:disj,queda,obs,capCabo:cabo.cap});
  }

  const TIPOS=[{id:"residencial",l:"🏠 Residencial"},{id:"motor",l:"⚙️ Motor Elétrico"},{id:"arcondicionado",l:"❄️ Ar-Condicionado"},{id:"iluminacao",l:"💡 Iluminação"},{id:"tomada",l:"🔌 Tomadas"},{id:"carga",l:"📊 Carga Total"}];

  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* Tipo de cálculo */}
      <div className="card" style={{padding:14}}>
        <div style={{fontSize:14,fontWeight:800,marginBottom:10,color:DARK}}>Tipo de Cálculo</div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
          {TIPOS.map(t=><button key={t.id} onClick={()=>{setTipo(t.id);setRes(null);}} style={{padding:"8px 12px",borderRadius:10,border:`2px solid ${tipo===t.id?GOLD:"#e5e5e5"}`,background:tipo===t.id?"#fef9c3":"#f8f8f8",color:tipo===t.id?GOLD2:"#555",fontSize:12,fontWeight:800,cursor:"pointer"}}>{t.l}</button>)}
        </div>
      </div>

      {/* Formulário */}
      <div className="card" style={{padding:14}}>
        <div style={{fontSize:14,fontWeight:800,marginBottom:12,color:DARK}}>⚡ Dados</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {/* Potência */}
          {tipo!=="arcondicionado"&&tipo!=="carga"&&<div><label className="lbl">{tipo==="motor"?"Potência do motor (cv/kW)":"Potência (W)"}</label><input className="inp" type="number" value={form.pot} onChange={e=>setForm(p=>({...p,pot:e.target.value}))} placeholder={tipo==="motor"?"Ex: 5 (cv) ou 3.7 (kW)":"Ex: 1500"}/></div>}
          {/* BTU */}
          {tipo==="arcondicionado"&&<div><label className="lbl">Capacidade (BTU)</label><select className="sel" value={form.btu} onChange={e=>setForm(p=>({...p,btu:e.target.value}))}><option value="">Selecione...</option>{[7000,9000,12000,18000,24000,30000,36000,48000,60000].map(b=><option key={b} value={b}>{b.toLocaleString()} BTU</option>)}</select></div>}
          {/* Carga Total */}
          {tipo==="carga"&&<>
            <div><label className="lbl">Carga total instalada (W)</label><input className="inp" type="number" value={form.cargaTotal} onChange={e=>setForm(p=>({...p,cargaTotal:e.target.value}))} placeholder="Soma de todas as cargas"/></div>
            <div><label className="lbl">Fator de demanda</label><select className="sel" value={form.fd} onChange={e=>setForm(p=>({...p,fd:e.target.value}))}><option value="0.5">50% — Grande residência</option><option value="0.6">60% — Residência média</option><option value="0.7">70% — Residência pequena</option><option value="0.8">80% — Comércio</option><option value="1.0">100% — Industrial</option></select></div>
          </>}
          {/* Fases motor */}
          {tipo==="motor"&&<>
            <div><label className="lbl">Tipo de motor</label><select className="sel" value={form.fases} onChange={e=>setForm(p=>({...p,fases:e.target.value}))}><option value="1">Monofásico</option><option value="3">Trifásico</option></select></div>
            <div><label className="lbl">Rendimento do motor (%)</label><select className="sel" value={form.rendimento} onChange={e=>setForm(p=>({...p,rendimento:e.target.value}))}><option value="0.75">75%</option><option value="0.80">80%</option><option value="0.85">85%</option><option value="0.90">90% (padrão)</option><option value="0.95">95%</option></select></div>
          </>}
          <div className="g2">
            <div><label className="lbl">Tensão (V)</label><select className="sel" value={form.tensao} onChange={e=>setForm(p=>({...p,tensao:e.target.value}))}><option value="127">127V</option><option value="220">220V</option><option value="380">380V (trifásico)</option></select></div>
            <div><label className="lbl">Distância (m)</label><input className="inp" type="number" value={form.dist} onChange={e=>setForm(p=>({...p,dist:e.target.value}))} placeholder="10"/></div>
            <div><label className="lbl">Fator de potência</label><input className="inp" type="number" step="0.01" value={form.fp} onChange={e=>setForm(p=>({...p,fp:e.target.value}))} placeholder="0.92"/></div>
          </div>
          <button className="btn btn-gold" onClick={calcular} style={{width:"100%",fontSize:15,padding:"14px"}}>⚡ Calcular</button>
        </div>
      </div>

      {/* Resultado */}
      {res&&<div className="card" style={{padding:14}}>
        <div style={{fontSize:14,fontWeight:800,marginBottom:12,color:DARK}}>📊 Resultado</div>
        {[
          {l:"Corrente elétrica",v:`${res.corrente} A`,c:"#6366f1",ico:"⚡"},
          {l:"Cabo recomendado",v:`${res.cabo} mm²`,c:GOLD2,ico:"🔌"},
          {l:"Capacidade do cabo",v:`${res.capCabo} A`,c:"#888",ico:"📏"},
          {l:"Disjuntor ideal",v:`${res.disjuntor} A`,c:"#10b981",ico:"🔒"},
          {l:"Queda de tensão",v:`${res.queda}%`,c:Number(res.queda)>4?"#ef4444":"#10b981",ico:"📉"},
        ].map(r=>(
          <div key={r.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px",background:"#f8f8f8",borderRadius:11,marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18}}>{r.ico}</span><span style={{fontSize:13,fontWeight:700,color:"#555"}}>{r.l}</span></div>
            <span style={{fontSize:16,fontWeight:900,color:r.c}}>{r.v}</span>
          </div>
        ))}
        <div style={{background:"#fef9c3",borderRadius:11,padding:12,marginTop:4}}>
          <div style={{fontSize:12,fontWeight:700,color:GOLD2,marginBottom:4}}>📋 Observações:</div>
          <div style={{fontSize:12,color:"#666",lineHeight:1.7}}>{res.obs}</div>
        </div>
      </div>}

      {/* Tabela NBR 5410 */}
      <div className="card" style={{padding:14}}>
        <div style={{fontSize:14,fontWeight:800,marginBottom:10,color:DARK}}>📚 Referência NBR 5410</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:"#1a1a1a",color:GOLD}}>{["Circuito","Tensão","Corrente","Cabo","Disj."].map(h=><th key={h} style={{padding:"7px 6px",textAlign:"left",fontWeight:800,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
            <tbody>
              {[
                ["Tomada resid.","127/220V","10A","1.5mm²","10A"],
                ["Tomada uso geral","220V","20A","2.5mm²","20A"],
                ["Chuveiro 5500W","220V","25A","4mm²","25A"],
                ["AR 9.000 BTU","220V","8A","1.5mm²","10A"],
                ["AR 12.000 BTU","220V","10A","1.5mm²","16A"],
                ["AR 18.000 BTU","220V","15A","2.5mm²","20A"],
                ["AR 24.000 BTU","220V","18A","2.5mm²","20A"],
                ["Motor 1cv mono","220V","7A","1.5mm²","10A"],
                ["Motor 5cv trifás","380V","10A","1.5mm²","16A"],
                ["Iluminação sala","127/220V","6A","1.5mm²","10A"],
                ["Quadro principal","220V","60A","16mm²","63A"],
              ].map(([n,t,c,cb,d],i)=>(
                <tr key={i} style={{background:i%2===0?"#f8f8f8":"#fff"}}>
                  <td style={{padding:"7px 6px",fontWeight:700,color:"#333"}}>{n}</td>
                  <td style={{padding:"7px 6px",color:"#555"}}>{t}</td>
                  <td style={{padding:"7px 6px",color:"#6366f1",fontWeight:700}}>{c}</td>
                  <td style={{padding:"7px 6px",color:GOLD2,fontWeight:700}}>{cb}</td>
                  <td style={{padding:"7px 6px",color:"#10b981",fontWeight:700}}>{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── PDF REAL ──────────────────────────────────────────────────
function gerarDocumento(os,emp,tipoDoc){
  const itens=(os.itens||[]).map(s=>`<tr><td style="padding:8px 6px;border-bottom:1px solid #f0f0f0">${s.n}</td><td style="padding:8px 6px;border-bottom:1px solid #f0f0f0;text-align:center">${s.q}</td><td style="padding:8px 6px;border-bottom:1px solid #f0f0f0;text-align:right">R$${Number(s.v).toFixed(2).replace(".",",")}</td><td style="padding:8px 6px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700">R$${(s.q*s.v).toFixed(2).replace(".",",")}</td></tr>`).join("");
  const total=(os.itens||[]).reduce((a,b)=>a+b.q*b.v,0)-(Number(os.desconto)||0);
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${tipoDoc} ${os.numero||"001"}</title><style>
  body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:28px;max-width:720px;margin:0 auto;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1a1a1a;padding-bottom:16px;margin-bottom:20px;}
  .empresa{font-size:18px;font-weight:900;color:#1a1a1a;margin-bottom:4px;}
  .sub{font-size:11px;color:#666;margin-top:2px;}
  .titulo{background:#1a1a1a;color:#F5C518;padding:10px 14px;font-size:16px;font-weight:900;border-radius:6px;margin-bottom:16px;}
  table{width:100%;border-collapse:collapse;margin-bottom:16px;}
  th{background:#f5f5f5;padding:9px 6px;text-align:left;font-size:12px;color:#555;font-weight:700;border-bottom:2px solid #e5e5e5;}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;}
  .info-box{background:#f8f8f8;border-radius:8px;padding:12px;}
  .info-label{font-size:10px;color:#888;font-weight:700;text-transform:uppercase;margin-bottom:4px;}
  .info-val{font-size:13px;font-weight:700;color:#333;}
  .total-box{display:flex;justify-content:flex-end;margin-top:8px;}
  .total-inner{min-width:220px;border-top:2px solid #1a1a1a;padding-top:10px;}
  .total-row{display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px;}
  .total-final{display:flex;justify-content:space-between;font-size:19px;font-weight:900;}
  .assinatura{margin-top:60px;text-align:center;border-top:1px solid #ccc;padding-top:10px;font-size:12px;color:#555;}
  @media print{body{padding:0;}}
  </style></head><body>
  <div class="header">
    <div>
      <div class="empresa">⚡ ${emp.nome||"Prótons Serviços Elétricos"}</div>
      <div class="sub">${emp.cnpj?"CNPJ: "+emp.cnpj:""}${emp.crea?" · CREA: "+emp.crea:""}</div>
      <div class="sub">${emp.tel||""}${emp.email?" · "+emp.email:""}</div>
      <div class="sub">${emp.endereco||""}</div>
    </div>
    <div style="text-align:right;font-size:12px;color:#888">
      <div>Nº ${os.numero||"001"}</div>
      <div>${os.data||hoje()}</div>
    </div>
  </div>
  <div class="titulo">${tipoDoc}</div>
  <div class="info">
    <div class="info-box"><div class="info-label">Cliente</div><div class="info-val">${os.clienteNome||"—"}</div><div class="sub">${os.clienteTel||""}</div></div>
    <div class="info-box"><div class="info-label">Local / Endereço</div><div class="info-val">${os.local||"—"}</div></div>
    <div class="info-box"><div class="info-label">Forma de Pagamento</div><div class="info-val">${os.pagamento||"—"}</div></div>
    <div class="info-box"><div class="info-label">Vencimento</div><div class="info-val">${os.vencimento||"—"}</div></div>
  </div>
  ${os.descricao?`<div style="background:#fef9c3;border-left:4px solid #F5C518;padding:10px 14px;border-radius:6px;margin-bottom:16px;font-size:13px">${os.descricao}</div>`:""}
  <table>
    <thead><tr><th>Descrição</th><th style="text-align:center">Qtd</th><th style="text-align:right">Unitário</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${itens}</tbody>
  </table>
  <div class="total-box"><div class="total-inner">
    ${Number(os.desconto)>0?`<div class="total-row"><span>Desconto</span><span style="color:#ef4444">- R$${Number(os.desconto).toFixed(2).replace(".",",")}</span></div>`:""}
    ${Number(os.sinal)>0?`<div class="total-row"><span>Sinal/Entrada</span><span>R$${Number(os.sinal).toFixed(2).replace(".",",")}</span></div>`:""}
    <div class="total-final"><span>TOTAL</span><span style="color:#C9A227">R$${total.toFixed(2).replace(".",",")}</span></div>
  </div></div>
  ${os.obs?`<div style="margin-top:16px;background:#f8f8f8;border-radius:8px;padding:12px"><div style="font-size:11px;color:#888;font-weight:700;margin-bottom:4px">OBSERVAÇÕES</div><div style="font-size:13px;color:#555">${os.obs}</div></div>`:""}
  <div class="assinatura">${emp.nome||"Prótons Serviços Elétricos"}<br>${emp.crea?"CREA: "+emp.crea:""}</div>
  </body></html>`;
  try{
    const w=window.open("","_blank");
    if(!w){alert("Habilite pop-ups para visualizar o documento.");return;}
    w.document.write(html);w.document.close();
    setTimeout(()=>{w.focus();},300);
  }catch(e){alert("Erro: "+e.message);}
}

// ── CSS ───────────────────────────────────────────────────────
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#f5f5f5;font-family:'Nunito',sans-serif;}
::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px;}
input,select,textarea,button{font-family:'Nunito',sans-serif;}
button{cursor:pointer;}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
@keyframes spin{to{transform:rotate(360deg);}}
@keyframes pulso{0%{transform:scale(1);}100%{transform:scale(1.1);}}
@keyframes giro{to{transform:rotate(360deg);}}
@keyframes onda{0%{transform:scale(1);opacity:.6;}100%{transform:scale(2);opacity:0;}}
@keyframes pisca{0%,100%{opacity:1;}50%{opacity:0;}}
@keyframes bounce{0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}
@keyframes sp{0%,100%{opacity:1;}50%{opacity:.4;}}
@keyframes mic{0%,100%{box-shadow:0 0 0 0 rgba(245,197,24,.4);}70%{box-shadow:0 0 0 10px rgba(245,197,24,0);}}
.card{background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,.06);overflow:hidden;}
.inp{width:100%;background:#f8f8f8;border:1.5px solid #e5e5e5;color:#1a1a1a;border-radius:11px;padding:12px 14px;font-size:15px;outline:none;transition:border .2s;}
.inp:focus{border-color:${GOLD};}
.sel{width:100%;background:#f8f8f8;border:1.5px solid #e5e5e5;color:#1a1a1a;border-radius:11px;padding:12px 14px;font-size:15px;outline:none;}
.lbl{font-size:11px;font-weight:800;color:#888;letter-spacing:.8px;margin-bottom:5px;display:block;text-transform:uppercase;}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:none;border-radius:12px;font-weight:800;transition:all .18s;font-size:14px;padding:12px 16px;cursor:pointer;}
.btn:active{transform:scale(.97);}
.btn-gold{background:linear-gradient(135deg,${GOLD},${GOLD2});color:#1a1a1a;}
.btn-dark{background:${DARK};color:${GOLD};}
.btn-r{background:#fee2e2;color:#ef4444;border:1px solid #fecaca;}
.btn-g{background:#d1fae5;color:#059669;border:1px solid #a7f3d0;}
.btn-wa{background:linear-gradient(135deg,#128C7E,#25D366);color:#fff;}
.btn-ghost{background:#f5f5f5;border:1.5px solid #e5e5e5!important;color:#666;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}
.badge{display:inline-flex;align-items:center;padding:3px 8px;border-radius:20px;font-size:10px;font-weight:800;border:1px solid;}
.mbg{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:900;display:flex;align-items:flex-end;justify-content:center;}
.mdl{background:#fff;border-radius:22px 22px 0 0;width:100%;max-width:620px;max-height:92vh;overflow-y:auto;padding:20px 16px 40px;animation:fadeUp .3s ease;}
.hdl{width:44px;height:5px;background:#e5e5e5;border-radius:3px;margin:0 auto 16px;}
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
    setLoad(true);setErro("");
    const res=await fazerLogin(email,senha);setLoad(false);
    if(res.erro){setErro(res.erro);return;}
    sessionStorage.setItem("protons_u",JSON.stringify(res.usuario));onLogin(res.usuario);
  }
  async function cadastrar(e){
    e.preventDefault();if(!nome||!email||!senha){setErro("Preencha todos os campos.");return;}
    if(senha.length<6){setErro("Senha mínimo 6 caracteres.");return;}
    setLoad(true);setErro("");
    const res=await fazerCadastro(nome,email,senha);setLoad(false);
    if(res.erro){setErro(res.erro);return;}
    sessionStorage.setItem("protons_u",JSON.stringify(res.usuario));onLogin(res.usuario);
  }

  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${DARK} 0%,#2a2000 100%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
      <style>{CSS+`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
        @keyframes spin{to{transform:rotate(360deg);}}
        .linp{width:100%;background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.15);color:#fff;border-radius:11px;padding:13px 15px;font-size:16px;outline:none;font-family:'Nunito',sans-serif;}
        .linp:focus{border-color:${GOLD};}
        .linp::placeholder{color:rgba(255,255,255,.35);}
      `}</style>
      <div style={{textAlign:"center",marginBottom:28,animation:"fadeUp .5s ease"}}>
        <div style={{width:80,height:80,borderRadius:"50%",background:`linear-gradient(135deg,${GOLD},${GOLD2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 12px",boxShadow:`0 8px 32px ${GOLD}50`}}>⚡</div>
        <div style={{fontSize:28,fontWeight:900,color:GOLD,letterSpacing:2}}>PRÓTONS</div>
        <div style={{fontSize:12,color:"#aaa",marginTop:2,letterSpacing:1}}>PROSPECT — Sistema do Eletricista</div>
      </div>
      <div style={{width:"100%",maxWidth:400,background:"rgba(255,255,255,.05)",border:`1px solid ${GOLD}30`,borderRadius:20,padding:24,animation:"fadeUp .5s ease .1s both"}}>
        <div style={{display:"flex",background:"rgba(255,255,255,.08)",borderRadius:12,padding:4,marginBottom:20,gap:4}}>
          {[{id:"login",l:"Entrar"},{id:"cadastro",l:"Criar conta"}].map(t=>(
            <button key={t.id} onClick={()=>{setModo(t.id);setErro("");}} style={{flex:1,padding:"10px",borderRadius:9,border:"none",background:modo===t.id?`linear-gradient(135deg,${GOLD},${GOLD2})`:"transparent",color:modo===t.id?"#1a1a1a":"#aaa",fontSize:14,fontWeight:800,cursor:"pointer"}}>
              {t.l}
            </button>
          ))}
        </div>
        <form onSubmit={modo==="login"?entrar:cadastrar} style={{display:"flex",flexDirection:"column",gap:12}}>
          {modo==="cadastro"&&<div><div style={{fontSize:12,fontWeight:800,color:"#aaa",marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>Seu nome</div><input className="linp" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: João Silva"/></div>}
          <div><div style={{fontSize:12,fontWeight:800,color:"#aaa",marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>E-mail</div><input className="linp" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com"/></div>
          <div><div style={{fontSize:12,fontWeight:800,color:"#aaa",marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>Senha</div><input className="linp" type="password" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="••••••••"/></div>
          {erro&&<div style={{background:"rgba(239,68,68,.15)",border:"1px solid rgba(239,68,68,.4)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#fca5a5",fontWeight:700}}>⚠️ {erro}</div>}
          <button type="submit" style={{width:"100%",background:`linear-gradient(135deg,${GOLD},${GOLD2})`,border:"none",color:"#1a1a1a",borderRadius:12,padding:"14px",fontSize:16,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer",marginTop:4}}>
            {load&&<span style={{width:18,height:18,border:"2px solid rgba(0,0,0,.3)",borderTopColor:"#1a1a1a",borderRadius:"50%",animation:"spin 1s linear infinite",display:"inline-block"}}/>}
            {load?"Aguarde...":(modo==="login"?"⚡ Entrar":"🚀 Criar conta")}
          </button>
        </form>
        <div style={{display:"flex",alignItems:"center",gap:10,margin:"14px 0"}}>
          <div style={{flex:1,height:1,background:"rgba(255,255,255,.1)"}}/><span style={{fontSize:11,color:"#555"}}>ou</span><div style={{flex:1,height:1,background:"rgba(255,255,255,.1)"}}/>
        </div>
        <button onClick={loginGoogle} style={{width:"100%",background:"#fff",border:"none",color:"#1a1a1a",borderRadius:12,padding:"13px",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:10,cursor:"pointer"}}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Entrar com Google
        </button>
      </div>
    </div>
  );
}

// ── ASSISTENTE IA ─────────────────────────────────────────────
function AssistenteModal({nomeAssistente, usuario, onClose}){
  const [falando, setFalando]   = useState(false);
  const [ouvindo, setOuvindo]   = useState(false);
  const [msg,     setMsg]       = useState("");
  const [hist,    setHist]      = useState([]);
  const [texto,   setTexto]     = useState("");
  const recRef = useRef(null);
  const histRef = useRef(null);
  const nome = usuario?.nome?.split(" ")[0]||"Eletricista";

  useEffect(()=>{
    // Aguarda vozes carregarem antes de falar
    const intro=`Olá ${nome}! Eu sou ${nomeAssistente}, sua assistente inteligente do Prótons Prospect! Pode me perguntar qualquer coisa sobre o app. Estou ouvindo!`;
    setMsg(intro);
    setHist([{de:"ia",txt:intro}]);
    const timer=setTimeout(()=>{
      falar(intro,()=>setFalando(true),()=>setFalando(false));
    },500);
    return()=>clearTimeout(timer);
  },[]);

  // Auto-scroll para última mensagem
  useEffect(()=>{
    if(histRef.current){
      histRef.current.scrollTop=histRef.current.scrollHeight;
    }
  },[hist]);

  function enviarTexto(){
    if(!texto.trim())return;
    const pergunta = texto.trim();
    setTexto("");
    responder(pergunta);
  }

  function responder(pergunta){
    setHist(h=>[...h,{de:"user",txt:pergunta}]);
    const resp = processarComando(pergunta, nomeAssistente);
    setMsg(resp);
    setHist(h=>[...h,{de:"ia",txt:resp}]);
    falar(resp, ()=>setFalando(true), ()=>setFalando(false));
  }

  function ativarMic(){
    if(ouvindo){recRef.current?.stop();setOuvindo(false);return;}
    setOuvindo(true);
    recRef.current = ouvirVoz(
      result=>{setOuvindo(false);responder(result);},
      err=>{setOuvindo(false);setMsg(err);}
    );
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:24,padding:20,maxWidth:400,width:"100%",maxHeight:"85vh",display:"flex",flexDirection:"column",animation:"fadeUp .4s ease"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,paddingBottom:14,borderBottom:"1px solid #f0f0f0"}}>
          {/* Átomo animado */}
          <div style={{position:"relative",width:52,height:52,flexShrink:0}}>
            <div style={{position:"absolute",inset:0,borderRadius:"50%",background:`conic-gradient(${GOLD},${GOLD2},${GOLD})`,animation:"giro "+(falando?"1s":"6s")+" linear infinite",padding:2}}>
              <div style={{width:"100%",height:"100%",borderRadius:"50%",background:"#fff"}}/>
            </div>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",animation:falando?"pulso .4s ease-in-out infinite alternate":"pulso 2s ease-in-out infinite alternate"}}>
              <svg width="34" height="34" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="10" fill={GOLD} style={{filter:`drop-shadow(0 0 4px ${GOLD})`}}/>
                {[0,60,120].map((a,i)=><ellipse key={i} cx="50" cy="50" rx="36" ry="14" fill="none" stroke={GOLD} strokeWidth={falando?2.5:1.5} opacity={falando?1:0.5} style={{transformOrigin:"50px 50px",transform:`rotate(${a}deg)`,animation:`giro ${falando?1+i*.3:3+i*.5}s linear infinite`}}/>)}
              </svg>
            </div>
            {falando&&[1,2].map(i=><div key={i} style={{position:"absolute",inset:-i*8,borderRadius:"50%",border:`1.5px solid ${GOLD}`,opacity:.6-i*.2,animation:"onda 1.2s ease-out infinite",animationDelay:i*.3+"s"}}/>)}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:900,color:DARK}}>{nomeAssistente}</div>
            <div style={{fontSize:12,color:"#888"}}>{falando?"Falando...":ouvindo?"Ouvindo... 🎙️":"Pronto para ajudar"}</div>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:"50%",background:"#f5f5f5",border:"none",fontSize:16,color:"#888",cursor:"pointer"}}>✕</button>
        </div>

        {/* Histórico */}
        <div ref={histRef} style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,marginBottom:14,maxHeight:280}}>
          {hist.map((h,i)=>(
            <div key={i} style={{display:"flex",justifyContent:h.de==="user"?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"85%",background:h.de==="user"?`linear-gradient(135deg,${GOLD},${GOLD2})`:"#f5f5f5",color:h.de==="user"?"#1a1a1a":"#333",borderRadius:h.de==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",padding:"10px 14px",fontSize:14,fontWeight:600,lineHeight:1.5}}>
                {h.txt}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div style={{display:"flex",gap:8}}>
          <input value={texto} onChange={e=>setTexto(e.target.value)} onKeyDown={e=>e.key==="Enter"&&enviarTexto()} placeholder="Digite ou use o microfone..." style={{flex:1,background:"#f8f8f8",border:`1.5px solid ${ouvindo?GOLD:"#e5e5e5"}`,color:"#333",borderRadius:12,padding:"12px 14px",fontSize:14,outline:"none"}}/>
          <button onClick={ativarMic} style={{width:46,height:46,borderRadius:12,border:"none",background:ouvindo?`linear-gradient(135deg,${GOLD},${GOLD2})`:"#f5f5f5",color:ouvindo?"#1a1a1a":"#888",fontSize:20,flexShrink:0,animation:ouvindo?"mic 1s infinite":"none"}}>🎙️</button>
          <button onClick={enviarTexto} style={{width:46,height:46,borderRadius:12,border:"none",background:`linear-gradient(135deg,${GOLD},${GOLD2})`,color:"#1a1a1a",fontSize:18,flexShrink:0}}>➤</button>
        </div>
      </div>
    </div>
  );
}

// ── APP PRINCIPAL ─────────────────────────────────────────────
export default function App(){
  // TODOS OS HOOKS PRIMEIRO
  const [usuario,      setUsuario]      = useState(()=>{try{const s=sessionStorage.getItem("protons_u");return s?JSON.parse(s):null;}catch{return null;}});
  const [nomeAssist,   setNomeAssist]   = useState(()=>sessionStorage.getItem("protons_assist")||"ÍRIS");
  const [showIA,       setShowIA]       = useState(false);
  const [showNomeIA,   setShowNomeIA]   = useState(false);
  const [nomeIATmp,    setNomeIATmp]    = useState("");
  const [tab,          setTab]          = useState("inicio");
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [emp,          setEmp]          = useState({nome:"Prótons",cnpj:"",crea:"",tel:"",email:"",endereco:"",pix:""});
  const [clientes,     setClientes]     = useState([]);
  const [servicos,     setServicos]     = useState([
    {id:"s1",nome:"Ponto de tomada 20A",preco:85},{id:"s2",nome:"Ponto de iluminação",preco:70},
    {id:"s3",nome:"Ponto de chuveiro",preco:120},{id:"s4",nome:"Quadro de distribuição",preco:650},
    {id:"s5",nome:"Ar-condicionado split",preco:320},{id:"s6",nome:"Laudo elétrico + ART",preco:850},
    {id:"s7",nome:"SPDA / Para-raios",preco:1200},{id:"s8",nome:"Câmera de segurança",preco:280},
    {id:"s9",nome:"Alarme residencial",preco:450},{id:"s10",nome:"Aterramento",preco:480},
  ]);
  const [ordens,       setOrdens]       = useState([]);
  const [finEmp,       setFinEmp]       = useState([]);
  const [finPes,       setFinPes]       = useState([]);
  const [finObra,      setFinObra]      = useState([]);
  const [tipoFin,      setTipoFin]      = useState("empresa");
  const [contatos,     setContatos]     = useState([]);
  const [estoque,      setEstoque]      = useState([
    {id:"e1",nome:"Cabo 2,5mm (metro)",qty:100,un:"m",preco:4.50},
    {id:"e2",nome:"Tomada 20A",qty:20,un:"un",preco:18},
    {id:"e3",nome:"Disjuntor 20A",qty:15,un:"un",preco:22},
  ]);
  const [agenda,       setAgenda]       = useState([]);
  const [obras,        setObras]        = useState([]);
  const [obraAtiva,    setObraAtiva]    = useState(null);
  const [visitas,      setVisitas]      = useState([]);
  const [visitaAtiva,  setVisitaAtiva]  = useState(null);
  const [modalOS,      setModalOS]      = useState(false);
  const [editOSId,     setEditOSId]     = useState(null);
  const [formOS,       setFormOS]       = useState({});
  const [itensOS,      setItensOS]      = useState([]);
  const [iN,setIN]=useState(""); const [iV,setIV]=useState(""); const [iQ,setIQ]=useState("1");
  const [modalCli,     setModalCli]     = useState(false);
  const [formCli,      setFormCli]      = useState({});
  const [modalFin,     setModalFin]     = useState(false);
  const [formFin,      setFormFin]      = useState({tipo:"receita",desc:"",valor:"",data:new Date().toISOString().slice(0,10),cat:"Serviço",obra:""});
  const [modalCon,     setModalCon]     = useState(false);
  const [formCon,      setFormCon]      = useState({});
  const [modalAge,     setModalAge]     = useState(false);
  const [formAge,      setFormAge]      = useState({});
  const [modalObra,    setModalObra]    = useState(false);
  const [formObra,     setFormObra]     = useState({});
  const [modalComodo,  setModalComodo]  = useState(false);
  const [formComodo,   setFormComodo]   = useState({});
  const [modalVisita,  setModalVisita]  = useState(false);
  const [formVisita,   setFormVisita]   = useState({});
  const [modalPDF,    setModalPDF]    = useState(false);
  const [osPDF,       setOsPDF]       = useState(null);
  const [modalCalc,   setModalCalc]   = useState(false);
  const [modalEst,    setModalEst]    = useState(false);
  const [formEst,     setFormEst]     = useState({id:"",nome:"",qty:0,un:"un",preco:0});
  const [fSN,setFSN]=useState(""); const [fSP,setFSP]=useState("");
  const [pCidade,      setPCidade]      = useState("");
  const [pBairro,      setPBairro]      = useState("");
  const [pSeg,         setPSeg]         = useState("arquitetura");
  const [pEmps,        setPEmps]        = useState([]);
  const [pScan,        setPScan]        = useState(false);
  const [pPct,         setPPct]         = useState(0);
  const [pDone,        setPDone]        = useState(false);
  const [msgP,         setMsgP]         = useState(MSG_PAD);
  const [editMsg,      setEditMsg]      = useState(false);
  const [pHist,        setPHist]        = useState([]);
  const [toast,        setToast]        = useState(null);
  const [iaFalando,    setIaFalando]    = useState(false);
  const fileRef = useRef(null);

  const showOk   = m=>{setToast({m,t:"ok"});setTimeout(()=>setToast(null),2800);};
  const showWarn = m=>{setToast({m,t:"w"});setTimeout(()=>setToast(null),2800);};
  const logout   = ()=>{sessionStorage.clear();setUsuario(null);};

  useEffect(()=>{
    if(usuario&&!sessionStorage.getItem("iris_ok")){
      sessionStorage.setItem("iris_ok","1");
      if(!sessionStorage.getItem("protons_assist")){
        setShowNomeIA(true);
      } else {
        setTimeout(()=>setShowIA(true),800);
      }
    }
  },[usuario]);

  // Financeiro
  const finAtual = tipoFin==="empresa"?finEmp:tipoFin==="pessoal"?finPes:finObra;
  const setFinAtual = tipoFin==="empresa"?setFinEmp:tipoFin==="pessoal"?setFinPes:setFinObra;
  const mesH=new Date().getMonth(), anoH=new Date().getFullYear();
  const recM=finAtual.filter(f=>f.tipo==="receita"&&new Date(f.data).getMonth()===mesH).reduce((a,b)=>a+b.valor,0);
  const despM=finAtual.filter(f=>f.tipo==="despesa"&&new Date(f.data).getMonth()===mesH).reduce((a,b)=>a+b.valor,0);
  const saldo=recM-despM;
  const g6m=Array.from({length:6},(_,i)=>{const m=(mesH-5+i+12)%12,a=m>mesH?anoH-1:anoH;return{l:MESES[m],v:finAtual.filter(f=>f.tipo==="receita"&&new Date(f.data).getMonth()===m&&new Date(f.data).getFullYear()===a).reduce((a,b)=>a+b.valor,0)};});

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

  // Mapeamento de Obra
  function gerarOrcamentoObra(obra){
    const itens=[];
    (obra.comodos||[]).forEach(c=>{
      if(c.tomadas>0)itens.push({id:uid(),n:`Tomadas 20A — ${c.nome}`,v:85,q:Number(c.tomadas)});
      if(c.lampadas>0)itens.push({id:uid(),n:`Pontos iluminação — ${c.nome}`,v:70,q:Number(c.lampadas)});
      if(c.disjuntores>0)itens.push({id:uid(),n:`Disjuntores — ${c.nome}`,v:45,q:Number(c.disjuntores)});
      if(c.circuitos>0)itens.push({id:uid(),n:`Circuitos — ${c.nome}`,v:120,q:Number(c.circuitos)});
    });
    if(obra.quadro)itens.push({id:uid(),n:`Quadro: ${obra.quadro}`,v:650,q:1});
    const sub=itens.reduce((a,b)=>a+b.q*b.v,0);
    const novaOS={numero:String(ordens.length+1).padStart(3,"0"),tipo:"orcamento",status:"orcamento",data:hoje(),pagamento:"A definir",clienteNome:obra.cliente||"",local:obra.endereco||"",descricao:`Mapeamento: ${obra.nome}`,obs:obra.obs||"",desconto:0,sinal:0,itens,subtotal:sub,total:sub,id:uid()};
    setOrdens(p=>[novaOS,...p]);
    showOk("Orçamento gerado! Acesse em OS/Pedidos.");
    setTab("os");
  }

  // Prospecção
  function iniciarScan(){
    if(pScan||!pCidade.trim()){showWarn("Digite o nome da cidade.");return;}
    setPDone(false);setPPct(0);setPEmps([]);setPScan(true);

    const timer=setInterval(()=>{
      setPPct(p=>{if(p>=90){clearInterval(timer);return 90;}return p+Math.random()*8+3;});
    },150);

    buscarEmpresas(pCidade.trim(),pBairro.trim(),pSeg).then(res=>{
      clearInterval(timer);
      setPScan(false);
      setPPct(100);

      if(!res){
        showWarn("Erro ao conectar. Verifique a cidade e tente novamente.");
        setPDone(true);
        return;
      }

      const lista=res.lista||[];

      // Mapeamento correto campos v5 Casa dos Dados
      let emps=lista.map(e=>{
        // Telefone pode vir em campos variados dependendo do tipo_resultado
        const end=e.endereco||{};
        const tel=e.ddd_telefone_1
          ?"("+String(e.ddd_telefone_1).slice(0,2)+") "+String(e.ddd_telefone_1).slice(2)
          :e.telefone1
            ?e.ddd1?"("+e.ddd1+") "+e.telefone1:e.telefone1
            :e.contato?.telefone1||"";

        return {
          id:e.cnpj||uid(),
          nome:(e.razao_social||e.nome_fantasia||"Empresa").trim(),
          cnpj:e.cnpj||"",
          tel,
          email:e.email||e.contato?.email||"",
          endereco:[
            end.tipo_logradouro,end.logradouro,end.numero,
            end.complemento,end.bairro,end.municipio,end.uf
          ].filter(Boolean).join(", "),
          municipio:end.municipio||"",
          porte:e.porte_empresa?.descricao||e.porte||"",
          segmento:pSeg,
          enviado:false,
        };
      }).filter(e=>{
        const nums=e.tel.replace(/\D/g,"");
        // Celular brasileiro: 11 dígitos com 9 na frente (ex: 11 9XXXX-XXXX)
        // ou 10 dígitos sem o 9 mas ainda válido para WhatsApp
        return nums.length>=10&&nums.length<=11;
      });

      setPEmps(emps);
      setPDone(true);

      if(emps.length===0){
        showWarn("Nenhuma empresa com telefone encontrada. Tente outra cidade ou segmento.");
      } else {
        showOk(emps.length+" empresas com telefone encontradas!");
      }
    }).catch(()=>{
      clearInterval(timer);
      setPScan(false);
      setPDone(true);
      showWarn("Erro na busca. Tente novamente.");
    });
  }

  function enviarWA(e){
    const tel=e.tel.replace(/\D/g,"");
    if(!tel){showWarn("Empresa sem telefone.");return;}
    const txt=msgP.replace(/{NOME}/g,emp.nome||"Prótons").replace(/{EMPRESA}/g,e.nome).replace(/{ANOS}/g,"10");
    window.open("https://wa.me/55"+tel+"?text="+encodeURIComponent(txt),"_blank");
    setPEmps(p=>p.map(x=>x.id===e.id?{...x,enviado:true}:x));
    setPHist(p=>{const ex=p.find(c=>c.id===e.id);return ex?p:[{...e,enviado:true,em:hoje()},...p];});
    showOk("WhatsApp aberto — "+e.nome);
  }

  // Fotos visita
  function adicionarFoto(e){
    const files=Array.from(e.target.files);
    if(!files.length)return;
    if(!visitaAtiva){showWarn("Selecione uma visita primeiro.");return;}
    files.forEach(file=>{
      const reader=new FileReader();
      reader.onload=ev=>{
        setVisitas(p=>p.map(v=>v.id===visitaAtiva?{...v,fotos:[...(v.fotos||[]),{id:uid(),src:ev.target.result,data:hoje(),nome:file.name}]}:v));
      };
      reader.readAsDataURL(file);
    });
    showOk(files.length>1?files.length+" fotos adicionadas!":"Foto adicionada!");
    e.target.value="";
  }

  const MODULOS=[
    {id:"os",      label:"OS/Pedidos",   emoji:"📋",cor:"#6366f1",bg:"#ede9fe"},
    {id:"agenda",  label:"Agenda",        emoji:"📅",cor:"#3b82f6",bg:"#dbeafe"},
    {id:"fin",     label:"Financeiro",    emoji:"💰",cor:"#10b981",bg:"#d1fae5"},
    {id:"clientes",label:"Clientes",      emoji:"👥",cor:"#f59e0b",bg:"#fef3c7"},
    {id:"estoque", label:"Estoque",       emoji:"📦",cor:"#8b5cf6",bg:"#ede9fe"},
    {id:"servicos",label:"Serviços",      emoji:"🔧",cor:"#059669",bg:"#d1fae5"},
    {id:"prosp",   label:"Prospecção",    emoji:"📡",cor:GOLD2,   bg:"#fef9c3"},
    {id:"crm",     label:"CRM",           emoji:"🤝",cor:"#ec4899",bg:"#fce7f3"},
    {id:"obra",    label:"Mapa de Obra",  emoji:"🏗️",cor:"#ea580c",bg:"#ffedd5"},
    {id:"visita",  label:"Visitas Técn.", emoji:"📷",cor:"#0284c7",bg:"#e0f2fe"},
    {id:"calc",    label:"Calc. Elétrica",emoji:"⚡",cor:"#ca8a04",bg:"#fef9c3"},
    {id:"cfg",     label:"Configurações", emoji:"⚙️",cor:"#666",   bg:"#f5f5f5"},
  ];

  if(!usuario)return <TelaLogin onLogin={u=>{setUsuario(u);}}/>;

  return(
    <div style={{minHeight:"100vh",background:"#f5f5f5",fontFamily:"'Nunito',sans-serif",color:DARK,overflowX:"hidden",paddingBottom:80}}>
      <style>{CSS}</style>

      {/* TOAST */}
      {toast&&<div style={{position:"fixed",top:14,left:"50%",transform:"translateX(-50%)",zIndex:9999,background:toast.t==="w"?"#1a0800":"#0a1a0a",border:"2px solid "+(toast.t==="w"?"#f59e0b":"#10b981"),borderRadius:12,padding:"11px 20px",fontSize:14,color:toast.t==="w"?"#f59e0b":"#10b981",fontWeight:700,whiteSpace:"nowrap",boxShadow:"0 8px 32px rgba(0,0,0,.3)",animation:"fadeUp .3s ease"}}>{toast.t==="w"?"⚠️ ":"✅ "}{toast.m}</div>}

      {/* MODAL NOME IA */}
      {showNomeIA&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:998,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:"#fff",borderRadius:24,padding:28,maxWidth:360,width:"100%",textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:12}}>🧠</div>
          <div style={{fontSize:20,fontWeight:900,marginBottom:6,color:DARK}}>Como quer chamar sua assistente?</div>
          <div style={{fontSize:14,color:"#888",marginBottom:20}}>Escolha o nome da sua IA pessoal</div>
          <input value={nomeIATmp} onChange={e=>setNomeIATmp(e.target.value)} placeholder="Ex: ÍRIS, ARIA, LUNA, NOVA..." style={{width:"100%",background:"#f8f8f8",border:`1.5px solid ${GOLD}`,color:"#333",borderRadius:12,padding:"14px",fontSize:16,outline:"none",textAlign:"center",fontWeight:700,marginBottom:16}}/>
          <button onClick={()=>{const n=nomeIATmp.trim()||"ÍRIS";setNomeAssist(n);sessionStorage.setItem("protons_assist",n);setShowNomeIA(false);setTimeout(()=>setShowIA(true),400);}} style={{width:"100%",background:`linear-gradient(135deg,${GOLD},${GOLD2})`,border:"none",color:"#1a1a1a",borderRadius:12,padding:"14px",fontSize:16,fontWeight:900,cursor:"pointer"}}>
            ⚡ Confirmar
          </button>
        </div>
      </div>}

      {/* ASSISTENTE IA */}
      {showIA&&<AssistenteModal nomeAssistente={nomeAssist} usuario={usuario} onClose={()=>setShowIA(false)}/>}

      {/* MENU LATERAL */}
      {menuOpen&&<div style={{position:"fixed",inset:0,zIndex:800,display:"flex"}} onClick={()=>setMenuOpen(false)}>
        <div style={{width:280,background:"#fff",height:"100%",boxShadow:"4px 0 20px rgba(0,0,0,.15)",padding:20,display:"flex",flexDirection:"column",gap:6,overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,paddingBottom:14,borderBottom:"1px solid #f0f0f0"}}>
            <div style={{width:46,height:46,borderRadius:"50%",background:`linear-gradient(135deg,${GOLD},${GOLD2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>⚡</div>
            <div><div style={{fontWeight:900,fontSize:15,color:DARK}}>{usuario.nome?.split(" ")[0]}</div><div style={{fontSize:12,color:"#888"}}>Prótons Prospect</div></div>
          </div>
          {MODULOS.map(m=>(
            <button key={m.id} onClick={()=>{setTab(m.id);setMenuOpen(false);}} style={{display:"flex",alignItems:"center",gap:11,padding:"11px 12px",borderRadius:12,border:"none",background:tab===m.id?m.bg:"transparent",color:tab===m.id?m.cor:"#555",fontSize:14,fontWeight:700,textAlign:"left",cursor:"pointer"}}>
              <span style={{fontSize:18}}>{m.emoji}</span>{m.label}
            </button>
          ))}
          <div style={{marginTop:"auto",paddingTop:12,borderTop:"1px solid #f0f0f0"}}>
            <button onClick={()=>{setShowIA(true);setMenuOpen(false);}} style={{width:"100%",background:"#fef9c3",border:`1px solid ${GOLD}`,color:GOLD2,borderRadius:12,padding:"11px",fontSize:14,fontWeight:800,cursor:"pointer",marginBottom:8}}>🧠 {nomeAssist}</button>
            <button onClick={()=>{setModalCalc(true);setMenuOpen(false);}} style={{width:"100%",background:"#f5f5f5",border:"1.5px solid #e5e5e5",color:"#555",borderRadius:12,padding:"11px",fontSize:14,fontWeight:700,cursor:"pointer",marginBottom:8}}>⚡ Calculadora Elétrica</button>
            <button onClick={logout} style={{width:"100%",background:"#fee2e2",border:"1px solid #fecaca",color:"#ef4444",borderRadius:12,padding:"11px",fontSize:14,fontWeight:700,cursor:"pointer"}}>🚪 Sair</button>
          </div>
        </div>
      </div>}

      {/* HEADER */}
      <div style={{background:"#fff",borderBottom:"1px solid #f0f0f0",padding:"13px 16px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:200,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
        <button onClick={()=>setMenuOpen(true)} style={{width:38,height:38,borderRadius:10,border:"none",background:"#f5f5f5",color:"#333",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>☰</button>
        <div style={{flex:1,textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:900,color:DARK}}>{MODULOS.find(m=>m.id===tab)?.label||"Início"}</div>
        </div>
        <button onClick={()=>setShowIA(true)} style={{width:38,height:38,borderRadius:"50%",border:`2px solid ${GOLD}`,background:`linear-gradient(135deg,${GOLD},${GOLD2})`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16,animation:iaFalando?"pulso .5s infinite alternate":"none"}} title={nomeAssist}>
          🧠
        </button>
      </div>

      <div style={{maxWidth:620,margin:"0 auto",padding:"14px",display:"flex",flexDirection:"column",gap:12}}>

        {/* ── INÍCIO ── */}
        {tab==="inicio"&&<>
          <div style={{background:`linear-gradient(135deg,${DARK} 0%,#2a2000 100%)`,borderRadius:18,padding:"18px 20px",cursor:"pointer"}} onClick={()=>setTab("prosp")}>
            <div style={{fontSize:12,color:GOLD,fontWeight:800,marginBottom:4}}>⚡ PRÓTONS PROSPECT</div>
            <div style={{fontSize:17,fontWeight:900,color:"#fff",marginBottom:8}}>Encontre clientes em todo o Brasil!</div>
            <div style={{background:GOLD,color:DARK,borderRadius:8,padding:"7px 14px",display:"inline-block",fontSize:13,fontWeight:900}}>Prospectar agora →</div>
          </div>
          <div style={{fontSize:13,fontWeight:800,color:"#888",marginTop:4}}>O QUE VAMOS FAZER HOJE?</div>
          <div className="g2" style={{gap:10}}>
            {MODULOS.map(m=>(
              <button key={m.id} onClick={()=>setTab(m.id)} style={{background:"#fff",border:`2px solid ${m.bg}`,borderRadius:16,padding:"18px 12px",display:"flex",flexDirection:"column",alignItems:"center",gap:7,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,.05)",transition:"all .18s"}}>
                <div style={{width:50,height:50,borderRadius:14,background:m.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{m.emoji}</div>
                <div style={{fontSize:12,fontWeight:800,color:m.cor,textAlign:"center"}}>{m.label}</div>
              </button>
            ))}
          </div>
          <div className="card" style={{padding:14}}>
            <div style={{fontSize:12,fontWeight:800,color:"#888",marginBottom:10}}>RESUMO DO MÊS</div>
            <div className="g3" style={{gap:8}}>
              {[{l:"Receitas",v:fmt(finEmp.filter(f=>f.tipo==="receita"&&new Date(f.data).getMonth()===mesH).reduce((a,b)=>a+b.valor,0)),c:"#10b981"},{l:"Despesas",v:fmt(finEmp.filter(f=>f.tipo==="despesa"&&new Date(f.data).getMonth()===mesH).reduce((a,b)=>a+b.valor,0)),c:"#ef4444"},{l:"OS Abertas",v:ordens.filter(o=>["orcamento","aprovado","andamento"].includes(o.status)).length,c:GOLD2}].map(s=>(
                <div key={s.l} style={{background:"#f8f8f8",borderRadius:12,padding:"10px",textAlign:"center"}}>
                  <div style={{fontSize:14,fontWeight:900,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:10,color:"#888",marginTop:2,fontWeight:700}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </>}

        {/* ── OS ── */}
        {tab==="os"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:18,fontWeight:900}}>📋 OS / Orçamentos</div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn btn-dark" onClick={()=>abrirOS("contrato")} style={{fontSize:12,padding:"9px 12px"}}>📄 Contrato</button>
              <button className="btn btn-gold" onClick={()=>abrirOS()} style={{fontSize:12,padding:"9px 12px"}}>+ Nova OS</button>
            </div>
          </div>
          {ordens.length===0&&<div style={{textAlign:"center",padding:"44px 0",color:"#ccc"}}><div style={{fontSize:44,marginBottom:10}}>📋</div><div style={{fontSize:16,fontWeight:700,color:"#bbb"}}>Nenhuma OS ainda</div></div>}
          {ordens.map(o=>{const st=STATUS_OS[o.status];return(
            <div key={o.id} className="card" style={{padding:14,borderLeft:`4px solid ${st?.c}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <div><div style={{fontSize:14,fontWeight:800}}>{o.clienteNome||"Sem cliente"}</div><div style={{fontSize:11,color:"#888"}}>OS #{o.numero} · {o.data} · {o.tipo==="contrato"?"Contrato":"Orçamento"}</div></div>
                <span className="badge" style={{color:st?.c,borderColor:st?.c+"40",background:st?.c+"12"}}>{st?.l}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid #f5f5f5",paddingTop:10}}>
                <div style={{fontSize:18,fontWeight:900,color:"#10b981"}}>{fmt(o.total)}</div>
                <div style={{display:"flex",gap:7}}>
                  <button className="btn btn-ghost" onClick={()=>{setOsPDF(o);setModalPDF(true);}} style={{fontSize:11,padding:"7px 10px"}}>🖨️ PDF</button>
                  <button className="btn btn-gold" onClick={()=>editOS(o)} style={{fontSize:11,padding:"7px 10px"}}>✏️ Editar</button>
                  <button className="btn btn-r" onClick={()=>{setOrdens(p=>p.filter(x=>x.id!==o.id));showWarn("Removida.");}} style={{fontSize:11,padding:"7px 10px"}}>🗑️</button>
                </div>
              </div>
            </div>
          );})}
        </>}

        {/* ── PROSPECÇÃO ── */}
        {tab==="prosp"&&<>
          <div className="card" style={{padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:14,fontWeight:800}}>✉️ Mensagem</div>
              <button onClick={()=>setEditMsg(!editMsg)} style={{background:editMsg?"#fef9c3":"#f5f5f5",border:`1px solid ${editMsg?GOLD:"#e5e5e5"}`,color:editMsg?GOLD2:"#888",borderRadius:9,padding:"5px 10px",fontSize:11,fontWeight:800,cursor:"pointer"}}>{editMsg?"✓":"✏️ Editar"}</button>
            </div>
            {editMsg?<textarea value={msgP} onChange={e=>setMsgP(e.target.value)} rows={7} style={{width:"100%",background:"#f8f8f8",border:`1.5px solid ${GOLD}`,color:"#333",borderRadius:11,padding:"11px",fontSize:13,lineHeight:1.7,resize:"vertical",outline:"none"}}/>
            :<div style={{background:"#f8f8f8",borderRadius:10,padding:"10px",maxHeight:60,overflow:"hidden",position:"relative",fontSize:12,color:"#888"}}>{msgP.slice(0,100)}...<div style={{position:"absolute",bottom:0,left:0,right:0,height:22,background:"linear-gradient(transparent,#f8f8f8)"}}/></div>}
          </div>
          <div className="card" style={{padding:14}}>
            <div style={{fontSize:14,fontWeight:800,marginBottom:10}}>🗺️ Localização — Brasil inteiro</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div>
                <label className="lbl">Cidade (qualquer cidade do Brasil)</label>
                <input className="inp" value={pCidade} onChange={e=>{setPCidade(e.target.value);setPDone(false);setPEmps([]);}} placeholder="Ex: Recife, Manaus, Goiânia..." list="cidades-br"/>
                <datalist id="cidades-br">
                  {["São Paulo","Rio de Janeiro","Brasília","Salvador","Fortaleza","Belo Horizonte","Manaus","Curitiba","Recife","Porto Alegre","Goiânia","Belém","Guarulhos","Campinas","São Luís","São Gonçalo","Maceió","Duque de Caxias","Natal","Campo Grande","Teresina","São Bernardo do Campo","Nova Iguaçu","João Pessoa","Santo André","Osasco","São José dos Campos","Jaboatão dos Guararapes","Ribeirão Preto","Uberlândia","Sorocaba","Contagem","Aracaju","Feira de Santana","Cuiabá","Joinville","Juiz de Fora","Aparecida de Goiânia","Londrina","Ananindeua","Porto Velho","Serra","Caxias do Sul","Macapá","Florianópolis","Mogi das Cruzes","Santos","São José do Rio Preto","Mauá","Betim","Montes Claros","Caruaru","São João de Meriti","Franca","Pelotas","Carapicuíba","Olinda","Campina Grande","Bauru","Blumenau","Vitória","Canoas","Niterói","São Vicente","Diadema","Belford Roxo","Jundiaí","Anápolis","Piracicaba","Cariacica","Caucaia","Vila Velha","Maringá","Moji-Guaçu","Santos Dumont","Ribeirão das Neves","Valparaíso de Goiás","Luziânia","Águas Lindas de Goiás","Senador Canedo","Trindade"].map(c=><option key={c} value={c}/>)}
                </datalist>
              </div>
              <div><label className="lbl">Bairro (opcional)</label><input className="inp" value={pBairro} onChange={e=>{setPBairro(e.target.value);setPDone(false);setPEmps([]);}} placeholder="Ex: Centro, Boa Viagem, Copacabana..."/></div>
            </div>
          </div>
          <div className="card" style={{padding:14}}>
            <div style={{fontSize:14,fontWeight:800,marginBottom:10}}>🏢 Tipo de empresa</div>
            <div className="g2" style={{gap:8}}>
              {SEGS.map(s=>{const act=pSeg===s.id;return(
                <button key={s.id} onClick={()=>{setPSeg(s.id);setPDone(false);setPEmps([]);}} style={{display:"flex",alignItems:"center",gap:8,padding:"11px",background:act?"#fef9c3":"#f8f8f8",border:`2px solid ${act?GOLD:"#e5e5e5"}`,borderRadius:12,cursor:"pointer",textAlign:"left"}}>
                  <span style={{fontSize:18}}>{s.emoji}</span>
                  <span style={{fontSize:12,fontWeight:800,color:act?GOLD2:"#555"}}>{s.label}</span>
                </button>
              );})}
            </div>
          </div>
          <button onClick={iniciarScan} disabled={pScan} style={{width:"100%",background:pScan?"#f5f5f5":`linear-gradient(135deg,${GOLD},${GOLD2})`,border:`2px solid ${pScan?"#e5e5e5":"transparent"}`,color:pScan?"#888":"#1a1a1a",borderRadius:14,padding:"17px",fontSize:17,fontWeight:900,cursor:pScan?"not-allowed":"pointer"}}>
            {pScan?"⟳ Buscando... "+~~pPct+"%":pDone?"🔄 Buscar Novamente":"📡 BUSCAR EMPRESAS"}
          </button>
          {pScan&&<div><div style={{height:6,background:"#f0f0f0",borderRadius:4,overflow:"hidden"}}><div style={{width:pPct+"%",height:"100%",background:`linear-gradient(90deg,${GOLD},${GOLD2})`,transition:"width .1s",borderRadius:4}}/></div><div style={{textAlign:"center",marginTop:6,fontSize:13,color:GOLD2,fontWeight:700,animation:"sp 1s infinite"}}>Buscando empresas com WhatsApp em {pCidade||"todo o Brasil"}...</div></div>}
          {pDone&&pEmps.length>0&&<>
            <div className="g3">
              {[{l:"Encontradas",v:pEmps.length,c:GOLD2},{l:"Enviadas",v:pEmps.filter(e=>e.enviado).length,c:"#10b981"},{l:"Pendentes",v:pEmps.filter(e=>!e.enviado).length,c:"#f59e0b"}].map(s=>(
                <div key={s.l} className="card" style={{padding:"11px",textAlign:"center"}}><div style={{fontSize:20,fontWeight:900,color:s.c}}>{s.v}</div><div style={{fontSize:10,color:"#888",fontWeight:700,marginTop:2}}>{s.l}</div></div>
              ))}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {pEmps.map(e=>{const seg=SEGS.find(s=>s.id===e.segmento);return(
                <div key={e.id} className="card" style={{padding:14,borderLeft:`3px solid ${e.enviado?"#10b981":GOLD}`}}>
                  <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
                    <div style={{width:42,height:42,borderRadius:12,background:"#f8f8f8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{seg?.emoji}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:800,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.nome}</div>
                      <div style={{fontSize:11,color:"#888"}}>{seg?.label} · {e.porte}</div>
                      <div style={{fontSize:13,color:"#10b981",fontWeight:700}}>📞 {e.tel}</div>
                      {e.endereco&&<div style={{fontSize:11,color:"#aaa",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📍 {e.endereco}</div>}
                      {e.cnpj&&<div style={{fontSize:10,color:"#ccc"}}>CNPJ: {e.cnpj}</div>}
                    </div>
                    {e.enviado&&<span style={{background:"#d1fae5",color:"#059669",borderRadius:8,padding:"3px 8px",fontSize:10,fontWeight:800,flexShrink:0}}>✓ Enviado</span>}
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button className={"btn "+(e.enviado?"btn-ghost":"btn-wa")} onClick={()=>enviarWA(e)} style={{flex:2,fontSize:13,padding:"11px"}}>{e.enviado?"💬 Reenviar":"💬 WhatsApp"}</button>
                    <button onClick={()=>{setFormCon({id:uid(),nome:"",empresa:e.nome,tel:e.tel,email:"",segmento:e.segmento,status:"contato",obs:"Prospectado em "+hoje(),criadoEm:hoje()});setModalCon(true);setTab("crm");}} style={{background:"#f5f5f5",border:"1.5px solid #e5e5e5",color:"#555",borderRadius:11,padding:"11px",fontSize:12,fontWeight:700,cursor:"pointer"}}>🤝</button>
                  </div>
                </div>
              );})}
            </div>
          </>}
          {!pScan&&!pDone&&<div style={{textAlign:"center",padding:"36px 0",color:"#ccc"}}>
            <div style={{fontSize:48,marginBottom:10,opacity:.35}}>📡</div>
            <div style={{fontSize:16,fontWeight:800,color:"#bbb",marginBottom:6}}>Busca nacional disponível!</div>
            <div style={{fontSize:13,color:"#ccc"}}>Digite qualquer cidade do Brasil e escolha o segmento.</div>
          </div>}
        </>}

        {/* ── FINANCEIRO ── */}
        {tab==="fin"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:18,fontWeight:900}}>💰 Financeiro</div>
            <button className="btn btn-gold" onClick={()=>setModalFin(true)} style={{fontSize:12,padding:"9px 12px"}}>+ Lançar</button>
          </div>
          {/* Abas financeiro */}
          <div style={{display:"flex",background:"#fff",borderRadius:12,padding:4,gap:4,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
            {[{id:"empresa",l:"🏢 Empresa"},{id:"pessoal",l:"👤 Pessoal"},{id:"obra",l:"🏗️ Por Obra"}].map(t=>(
              <button key={t.id} onClick={()=>setTipoFin(t.id)} style={{flex:1,padding:"10px",borderRadius:9,border:"none",background:tipoFin===t.id?`linear-gradient(135deg,${GOLD},${GOLD2})`:"transparent",color:tipoFin===t.id?"#1a1a1a":"#888",fontSize:12,fontWeight:800,cursor:"pointer"}}>{t.l}</button>
            ))}
          </div>
          <div className="card" style={{padding:14,background:`linear-gradient(135deg,${DARK} 0%,#2a2000 100%)`}}>
            <div style={{fontSize:11,color:GOLD,fontWeight:800,marginBottom:2}}>SALDO DO MÊS</div>
            <div style={{fontSize:26,fontWeight:900,color:saldo>=0?GOLD:"#ef4444"}}>{fmt(saldo)}</div>
            <div className="g2" style={{marginTop:10,gap:8}}>
              <div style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 12px"}}><div style={{fontSize:10,color:"#4ade80",fontWeight:800}}>RECEITAS</div><div style={{fontSize:15,fontWeight:900,color:"#4ade80"}}>{fmt(recM)}</div></div>
              <div style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"9px 12px"}}><div style={{fontSize:10,color:"#f87171",fontWeight:800}}>DESPESAS</div><div style={{fontSize:15,fontWeight:900,color:"#f87171"}}>{fmt(despM)}</div></div>
            </div>
          </div>
          <div className="card" style={{padding:14}}>
            <div style={{fontSize:12,fontWeight:800,color:"#888",marginBottom:10}}>Lançamentos</div>
            {finAtual.length===0&&<div style={{textAlign:"center",padding:16,color:"#ccc",fontSize:13}}>Nenhum lançamento ainda.</div>}
            {finAtual.map(f=>(
              <div key={f.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid #f5f5f5"}}>
                <div style={{width:36,height:36,borderRadius:10,background:f.tipo==="receita"?"#d1fae5":"#fee2e2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{f.tipo==="receita"?"📈":"📉"}</div>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.desc}</div><div style={{fontSize:11,color:"#888"}}>{f.cat}{f.obra?" · "+f.obra:""} · {new Date(f.data).toLocaleDateString("pt-BR")}</div></div>
                <span style={{fontSize:13,fontWeight:900,color:f.tipo==="receita"?"#10b981":"#ef4444"}}>{f.tipo==="receita"?"+":"-"}{fmt(f.valor)}</span>
                <button onClick={()=>setFinAtual(p=>p.filter(x=>x.id!==f.id))} style={{background:"none",border:"none",color:"#ddd",fontSize:14,cursor:"pointer"}}>✕</button>
              </div>
            ))}
          </div>
        </>}

        {/* ── CLIENTES ── */}
        {tab==="clientes"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:18,fontWeight:900}}>👥 Clientes</div>
            <button className="btn btn-gold" onClick={()=>{setFormCli({id:uid(),nome:"",cpfCnpj:"",tel:"",email:"",endereco:"",obs:""});setModalCli(true);}} style={{fontSize:12,padding:"9px 12px"}}>+ Novo</button>
          </div>
          {clientes.length===0&&<div style={{textAlign:"center",padding:"44px 0",color:"#ccc"}}><div style={{fontSize:44,marginBottom:10}}>👥</div><div style={{fontSize:16,fontWeight:700,color:"#bbb"}}>Nenhum cliente</div></div>}
          {clientes.map(c=>(
            <div key={c.id} className="card" style={{padding:14,display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:`linear-gradient(135deg,${GOLD},${GOLD2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"#1a1a1a",fontWeight:900,flexShrink:0}}>{(c.nome?.[0]||"?").toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:800,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.nome}</div><div style={{fontSize:11,color:"#888"}}>{c.tel}{c.cpfCnpj?" · "+c.cpfCnpj:""}</div></div>
              <div style={{display:"flex",gap:6}}>
                {c.tel&&<a href={"https://wa.me/55"+c.tel.replace(/\D/g,"")} target="_blank" rel="noreferrer" style={{width:32,height:32,borderRadius:9,background:"#d1fae5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,textDecoration:"none"}}>💬</a>}
                <button onClick={()=>{setFormCli(c);setModalCli(true);}} style={{width:32,height:32,borderRadius:9,background:"#fef9c3",border:"none",fontSize:15,cursor:"pointer"}}>✏️</button>
                <button onClick={()=>{setClientes(p=>p.filter(x=>x.id!==c.id));showWarn("Removido.");}} style={{width:32,height:32,borderRadius:9,background:"#fee2e2",border:"none",fontSize:15,cursor:"pointer"}}>🗑️</button>
              </div>
            </div>
          ))}
        </>}

        {/* ── ESTOQUE ── */}
        {tab==="estoque"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:18,fontWeight:900}}>📦 Estoque</div>
            <button className="btn btn-gold" onClick={()=>{setFormEst({id:uid(),nome:"",qty:0,un:"un",preco:0});setModalEst(true);}} style={{fontSize:12,padding:"9px 12px"}}>+ Item</button>
          </div>
          {estoque.map(e=>(
            <div key={e.id} className="card" style={{padding:14,display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:42,height:42,borderRadius:12,background:"#f8f8f8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>📦</div>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:800}}>{e.nome}</div><div style={{fontSize:11,color:"#888"}}>{fmt(e.preco)}/{e.un}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:19,fontWeight:900,color:e.qty<5?"#ef4444":GOLD2}}>{e.qty}</div><div style={{fontSize:10,color:"#888"}}>{e.un}</div></div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <button onClick={()=>setEstoque(p=>p.map(x=>x.id===e.id?{...x,qty:x.qty+1}:x))} style={{width:26,height:26,borderRadius:7,background:"#d1fae5",border:"none",fontSize:14,cursor:"pointer",fontWeight:900,color:"#059669"}}>+</button>
                <button onClick={()=>setEstoque(p=>p.map(x=>x.id===e.id?{...x,qty:Math.max(0,x.qty-1)}:x))} style={{width:26,height:26,borderRadius:7,background:"#fee2e2",border:"none",fontSize:14,cursor:"pointer",fontWeight:900,color:"#ef4444"}}>-</button>
                <button onClick={()=>{setEstoque(p=>p.filter(x=>x.id!==e.id));showWarn("Item removido.");}} style={{width:26,height:26,borderRadius:7,background:"#1a1a1a",border:"none",fontSize:11,cursor:"pointer",fontWeight:900,color:"#F5C518"}}>🗑️</button>
              </div>
            </div>
          ))}
        </>}

        {/* ── AGENDA ── */}
        {tab==="agenda"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:18,fontWeight:900}}>📅 Agenda</div>
            <button className="btn btn-gold" onClick={()=>{setFormAge({id:uid(),titulo:"",data:"",hora:"",cliente:"",obs:""});setModalAge(true);}} style={{fontSize:12,padding:"9px 12px"}}>+ Agendar</button>
          </div>
          {agenda.length===0&&<div style={{textAlign:"center",padding:"44px 0",color:"#ccc"}}><div style={{fontSize:44,marginBottom:10}}>📅</div><div style={{fontSize:16,fontWeight:700,color:"#bbb"}}>Nenhum compromisso</div></div>}
          {agenda.sort((a,b)=>a.data>b.data?1:-1).map(a=>(
            <div key={a.id} className="card" style={{padding:14,borderLeft:`4px solid ${GOLD}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <div style={{fontSize:14,fontWeight:800}}>{a.titulo}</div>
                <span style={{background:"#fef9c3",color:GOLD2,borderRadius:8,padding:"3px 9px",fontSize:12,fontWeight:800}}>{a.hora}</span>
              </div>
              <div style={{fontSize:12,color:"#888"}}>📅 {a.data&&new Date(a.data).toLocaleDateString("pt-BR")} {a.cliente&&"· 👤 "+a.cliente}</div>
              {a.obs&&<div style={{fontSize:11,color:"#aaa",marginTop:4}}>{a.obs}</div>}
              <button onClick={()=>setAgenda(p=>p.filter(x=>x.id!==a.id))} style={{marginTop:8,background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>🗑️ Remover</button>
            </div>
          ))}
        </>}

        {/* ── MAPA DE OBRA ── */}
        {tab==="obra"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:18,fontWeight:900}}>🏗️ Mapa de Obra</div>
            <button className="btn btn-gold" onClick={()=>{setFormObra({id:uid(),nome:"",cliente:"",endereco:"",obs:"",quadro:"",comodos:[]});setModalObra(true);}} style={{fontSize:12,padding:"9px 12px"}}>+ Nova Obra</button>
          </div>
          {obras.length===0&&<div style={{textAlign:"center",padding:"44px 0",color:"#ccc"}}><div style={{fontSize:44,marginBottom:10}}>🏗️</div><div style={{fontSize:16,fontWeight:700,color:"#bbb"}}>Nenhuma obra mapeada</div><div style={{fontSize:13,color:"#ccc",marginTop:4}}>Crie obras e mapeie cômodo por cômodo</div></div>}
          {obras.map(o=>(
            <div key={o.id} className="card" style={{padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <div><div style={{fontSize:15,fontWeight:800}}>{o.nome}</div><div style={{fontSize:11,color:"#888"}}>{o.cliente&&"👤 "+o.cliente} {o.endereco&&"· 📍 "+o.endereco}</div></div>
                <span style={{background:"#ffedd5",color:"#ea580c",borderRadius:8,padding:"3px 9px",fontSize:11,fontWeight:800}}>{(o.comodos||[]).length} cômodos</span>
              </div>
              {/* Cômodos */}
              {(o.comodos||[]).map(c=>(
                <div key={c.id} style={{background:"#f8f8f8",borderRadius:10,padding:"10px 12px",marginBottom:8}}>
                  <div style={{fontSize:13,fontWeight:800,marginBottom:6,color:"#333"}}>🏠 {c.nome}</div>
                  <div className="g3" style={{gap:6}}>
                    {[{l:"Tomadas",v:c.tomadas,ico:"🔌"},{l:"Lâmpadas",v:c.lampadas,ico:"💡"},{l:"Disjuntores",v:c.disjuntores,ico:"⚡"},{l:"Circuitos",v:c.circuitos,ico:"🔄"},{l:"AR",v:c.ar,ico:"❄️"},{l:"Outros",v:c.outros||0,ico:"🔧"}].map(i=>(
                      <div key={i.l} style={{textAlign:"center",background:"#fff",borderRadius:8,padding:"6px"}}>
                        <div style={{fontSize:14}}>{i.ico}</div>
                        <div style={{fontSize:14,fontWeight:900,color:GOLD2}}>{i.v||0}</div>
                        <div style={{fontSize:9,color:"#aaa",fontWeight:700}}>{i.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{display:"flex",gap:8,marginTop:8}}>
                <button className="btn btn-gold" onClick={()=>{setObraAtiva(o.id);setFormComodo({id:uid(),nome:"",tomadas:0,lampadas:0,disjuntores:0,circuitos:0,ar:0,outros:0});setTimeout(()=>setModalComodo(true),50);}} style={{flex:1,fontSize:12,padding:"10px"}}>+ Cômodo</button>
                <button className="btn btn-g" onClick={()=>gerarOrcamentoObra(o)} style={{flex:1,fontSize:12,padding:"10px"}}>📋 Gerar Orçamento</button>
                <button className="btn btn-r" onClick={()=>setObras(p=>p.filter(x=>x.id!==o.id))} style={{fontSize:12,padding:"10px"}}>🗑️</button>
              </div>
            </div>
          ))}
        </>}

        {/* ── VISITAS TÉCNICAS ── */}
        {tab==="visita"&&<>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple style={{display:"none"}} onChange={adicionarFoto}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:18,fontWeight:900}}>📷 Visitas Técnicas</div>
            <button className="btn btn-gold" onClick={()=>{setFormVisita({id:uid(),nome:"",data:hoje(),obs:""});setModalVisita(true);}} style={{fontSize:12,padding:"9px 12px"}}>+ Nova Visita</button>
          </div>
          {visitas.length===0&&<div style={{textAlign:"center",padding:"44px 0",color:"#ccc"}}><div style={{fontSize:44,marginBottom:10}}>📷</div><div style={{fontSize:16,fontWeight:700,color:"#bbb"}}>Nenhuma visita técnica</div><div style={{fontSize:13,color:"#ccc",marginTop:4}}>Crie pastas por obra e tire fotos do local</div></div>}
          {visitas.map(v=>(
            <div key={v.id} className="card" style={{padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div>
                  <div style={{fontSize:14,fontWeight:800}}>{v.nome}</div>
                  <div style={{fontSize:11,color:"#888"}}>📅 {v.data} · {(v.fotos||[]).length} fotos</div>
                </div>
                <button onClick={()=>{setVisitaAtiva(v.id);fileRef.current?.click();}} style={{background:`linear-gradient(135deg,${GOLD},${GOLD2})`,border:"none",color:"#1a1a1a",borderRadius:10,padding:"9px 12px",fontSize:13,fontWeight:800,cursor:"pointer"}}>📷 Foto</button>
              </div>
              {(v.fotos||[]).length>0&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {v.fotos.map(f=>(
                  <div key={f.id} style={{position:"relative"}}>
                    <img src={f.src} alt="" style={{width:80,height:80,borderRadius:10,objectFit:"cover"}}/>
                    <button onClick={()=>setVisitas(p=>p.map(x=>x.id===v.id?{...x,fotos:x.fotos.filter(fx=>fx.id!==f.id)}:x))} style={{position:"absolute",top:2,right:2,width:20,height:20,borderRadius:"50%",background:"rgba(239,68,68,.9)",border:"none",color:"#fff",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                  </div>
                ))}
              </div>}
              {v.obs&&<div style={{fontSize:12,color:"#888",marginTop:8,padding:"8px",background:"#f8f8f8",borderRadius:8}}>{v.obs}</div>}
              <button onClick={()=>setVisitas(p=>p.filter(x=>x.id!==v.id))} style={{marginTop:8,background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>🗑️ Excluir pasta</button>
            </div>
          ))}
        </>}

        {/* ── CALCULADORA ── */}
        {tab==="calc"&&<CalculadoraEletrica/>}

        {/* ── SERVIÇOS ── */}
        {tab==="servicos"&&<>
          <div style={{fontSize:18,fontWeight:900}}>🔧 Tabela de Serviços</div>
          <div className="card" style={{padding:14}}>
            <div style={{display:"flex",gap:7,marginBottom:11}}>
              <input className="inp" placeholder="Nome do serviço" value={fSN} onChange={e=>setFSN(e.target.value)} style={{flex:2}}/>
              <input className="inp" type="number" placeholder="R$" value={fSP} onChange={e=>setFSP(e.target.value)} style={{width:80}}/>
              <button className="btn btn-gold" onClick={()=>{if(fSN&&fSP){setServicos(p=>[{id:uid(),nome:fSN,preco:Number(fSP)},...p]);setFSN("");setFSP("");showOk("Adicionado!");}}} style={{padding:"12px",fontSize:18}}>+</button>
            </div>
            {servicos.map(s=>(
              <div key={s.id} style={{display:"flex",alignItems:"center",padding:"9px 0",borderBottom:"1px solid #f5f5f5"}}>
                <span style={{fontSize:13,flex:1,fontWeight:700}}>{s.nome}</span>
                <span style={{fontSize:13,color:"#10b981",fontWeight:900,marginRight:10}}>{fmt(s.preco)}</span>
                <button onClick={()=>setServicos(p=>p.filter(x=>x.id!==s.id))} style={{background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:7,width:26,height:26,fontSize:12,cursor:"pointer"}}>✕</button>
              </div>
            ))}
          </div>
        </>}

        {/* ── CRM ── */}
        {tab==="crm"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:18,fontWeight:900}}>🤝 CRM</div>
            <button className="btn btn-gold" onClick={()=>{setFormCon({id:uid(),nome:"",empresa:"",tel:"",email:"",segmento:"arquitetura",status:"novo",obs:"",criadoEm:hoje()});setModalCon(true);}} style={{fontSize:12,padding:"9px 12px"}}>+ Contato</button>
          </div>
          {contatos.length===0&&<div style={{textAlign:"center",padding:"44px 0",color:"#ccc"}}><div style={{fontSize:44,marginBottom:10}}>🤝</div><div style={{fontSize:16,fontWeight:700,color:"#bbb"}}>Nenhum contato</div></div>}
          {contatos.map(c=>{
            const stC={"novo":"#888","contato":"#f59e0b","proposta":"#3b82f6","fechado":"#10b981","perdido":"#ef4444"}[c.status]||"#888";
            const stL={"novo":"Novo","contato":"Em Contato","proposta":"Proposta","fechado":"Fechado ✓","perdido":"Perdido"}[c.status]||c.status;
            return(<div key={c.id} className="card" style={{padding:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <div><div style={{fontSize:13,fontWeight:800}}>{c.nome||c.empresa}</div><div style={{fontSize:11,color:"#888"}}>{c.empresa}</div></div>
                <span className="badge" style={{color:stC,borderColor:stC+"40",background:stC+"12"}}>{stL}</span>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
                {["novo","contato","proposta","fechado","perdido"].map(s=>{const lbl={"novo":"Novo","contato":"Contato","proposta":"Proposta","fechado":"Fechado","perdido":"Perdido"}[s],sc={"novo":"#888","contato":"#f59e0b","proposta":"#3b82f6","fechado":"#10b981","perdido":"#ef4444"}[s];return<button key={s} onClick={()=>setContatos(p=>p.map(x=>x.id===c.id?{...x,status:s}:x))} style={{padding:"3px 7px",borderRadius:7,border:"1px solid "+(c.status===s?sc:"#e5e5e5"),background:c.status===s?sc+"14":"transparent",color:c.status===s?sc:"#888",fontSize:10,fontWeight:700,cursor:"pointer"}}>{lbl}</button>;})}
              </div>
              <div style={{display:"flex",gap:7}}>
                {c.tel&&<a href={"https://wa.me/55"+c.tel.replace(/\D/g,"")} target="_blank" rel="noreferrer" className="btn btn-wa" style={{flex:1,fontSize:12,padding:"9px",textDecoration:"none"}}>💬</a>}
                <button onClick={()=>{setFormCon(c);setModalCon(true);}} className="btn btn-ghost" style={{flex:1,fontSize:12,padding:"9px"}}>✏️</button>
                <button onClick={()=>{setContatos(p=>p.filter(x=>x.id!==c.id));showWarn("Removido.");}} className="btn btn-r" style={{fontSize:12,padding:"9px"}}>🗑️</button>
              </div>
            </div>);
          })}
        </>}

        {/* ── CONFIG ── */}
        {tab==="cfg"&&<>
          <div style={{fontSize:18,fontWeight:900}}>⚙️ Configurações</div>
          <div className="card" style={{padding:14}}>
            <div style={{fontSize:13,fontWeight:800,marginBottom:12,color:DARK}}>🏢 Dados da Empresa</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[{l:"Nome/Razão Social",f:"nome",p:"Prótons Serviços Elétricos"},{l:"CNPJ/CPF",f:"cnpj",p:"00.000.000/0001-00"},{l:"CREA",f:"crea",p:"CREA-SP 123456"},{l:"Telefone",f:"tel",p:"(11) 99999-9999"},{l:"E-mail",f:"email",p:"contato@email.com"},{l:"Endereço",f:"endereco",p:"Rua..., nº, Cidade"},{l:"PIX",f:"pix",p:"CPF ou CNPJ"}].map(fi=>(
                <div key={fi.f}><label className="lbl">{fi.l}</label><input className="inp" value={emp[fi.f]||""} onChange={e=>setEmp(p=>({...p,[fi.f]:e.target.value}))} placeholder={fi.p}/></div>
              ))}
              <button className="btn btn-gold" onClick={()=>showOk("Dados salvos!")} style={{width:"100%",fontSize:14,padding:"13px"}}>💾 Salvar</button>
            </div>
          </div>
          <div className="card" style={{padding:14}}>
            <div style={{fontSize:13,fontWeight:800,marginBottom:10,color:DARK}}>🧠 Assistente IA</div>
            <div style={{fontSize:13,color:"#888",marginBottom:10}}>Nome atual: <b style={{color:GOLD2}}>{nomeAssist}</b></div>
            <button className="btn btn-dark" onClick={()=>{setNomeIATmp(nomeAssist);setShowNomeIA(true);}} style={{width:"100%",fontSize:13,padding:"12px"}}>✏️ Renomear assistente</button>
          </div>
        </>}

      </div>

      {/* BARRA INFERIOR */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:"1px solid #f0f0f0",display:"flex",zIndex:100,boxShadow:"0 -2px 12px rgba(0,0,0,.08)"}}>
        {[{id:"inicio",em:"🏠",l:"Início"},{id:"prosp",em:"📡",l:"Prospecção"},{id:"os",em:"📋",l:"OS"},{id:"clientes",em:"👥",l:"Clientes"},{id:"calc",em:"⚡",l:"Calculadora"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"10px 4px",border:"none",background:"none",color:tab===t.id?GOLD2:"#aaa",borderTop:`3px solid ${tab===t.id?GOLD:"transparent"}`,cursor:"pointer"}}>
            <span style={{fontSize:20}}>{t.em}</span>
            <span style={{fontSize:9,fontWeight:800}}>{t.l}</span>
          </button>
        ))}
      </div>

      {/* BOTÃO FLUTUANTE */}
      <button onClick={()=>abrirOS()} style={{position:"fixed",bottom:78,right:18,width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${GOLD},${GOLD2})`,border:"none",color:"#1a1a1a",fontSize:24,fontWeight:900,boxShadow:`0 4px 20px ${GOLD}60`,zIndex:150,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>

      {/* CALCULADORA MODAL */}
      {modalCalc&&<div className="mbg" onClick={()=>setModalCalc(false)}>
        <div className="mdl" onClick={e=>e.stopPropagation()} style={{maxHeight:"95vh"}}>
          <div className="hdl"/>
          <div style={{fontSize:16,fontWeight:900,marginBottom:14,color:DARK}}>⚡ Calculadora Elétrica</div>
          <CalculadoraEletrica/>
          <button className="btn btn-ghost" onClick={()=>setModalCalc(false)} style={{width:"100%",fontSize:13,padding:"12px",marginTop:12}}>Fechar</button>
        </div>
      </div>}

      {/* MODAL OS */}
      {modalOS&&<div className="mbg" onClick={()=>setModalOS(false)}>
        <div className="mdl" onClick={e=>e.stopPropagation()}>
          <div className="hdl"/>
          <div style={{fontSize:16,fontWeight:900,marginBottom:14,color:DARK}}>{editOSId?"✏️ Editar OS":"📋 Nova OS"}</div>
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            <div style={{display:"flex",gap:7}}>{[{v:"orcamento",l:"📋 Orçamento"},{v:"contrato",l:"📄 Contrato"}].map(t=><button key={t.v} onClick={()=>setFormOS(p=>({...p,tipo:t.v}))} style={{flex:1,padding:"10px",borderRadius:10,border:`2px solid ${formOS.tipo===t.v?GOLD:"#e5e5e5"}`,background:formOS.tipo===t.v?"#fef9c3":"#f8f8f8",color:formOS.tipo===t.v?GOLD2:"#888",fontSize:13,fontWeight:800,cursor:"pointer"}}>{t.l}</button>)}</div>
            <div><label className="lbl">Cliente cadastrado</label><select className="sel" value={formOS.clienteId||""} onChange={e=>{const c=clientes.find(x=>x.id===e.target.value);setFormOS(p=>({...p,clienteId:e.target.value,clienteNome:c?.nome||"",clienteTel:c?.tel||"",clienteEnd:c?.endereco||""}));}}><option value="">Selecionar...</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
            <div><label className="lbl">Nome do cliente</label><input className="inp" value={formOS.clienteNome||""} onChange={e=>setFormOS(p=>({...p,clienteNome:e.target.value}))} placeholder="Ex: Maria da Silva"/></div>
            <div><label className="lbl">Status</label><select className="sel" value={formOS.status||"orcamento"} onChange={e=>setFormOS(p=>({...p,status:e.target.value}))}>{Object.entries(STATUS_OS).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}</select></div>
            <div className="g2">{[{l:"Nº OS",f:"numero",p:"001"},{l:"Data",f:"data",p:hoje()},{l:"Vencimento",f:"vencimento",p:"dd/mm/aaaa"},{l:"Local",f:"local",p:"Endereço..."}].map(fi=><div key={fi.f}><label className="lbl">{fi.l}</label><input className="inp" value={formOS[fi.f]||""} onChange={e=>setFormOS(p=>({...p,[fi.f]:e.target.value}))} placeholder={fi.p}/></div>)}</div>
            <div><label className="lbl">Pagamento</label><select className="sel" value={formOS.pagamento||"À vista"} onChange={e=>setFormOS(p=>({...p,pagamento:e.target.value}))}>{PGTOS.map(p=><option key={p}>{p}</option>)}</select></div>
            <div><label className="lbl">Descrição</label><textarea className="inp" rows={2} value={formOS.descricao||""} onChange={e=>setFormOS(p=>({...p,descricao:e.target.value}))} style={{resize:"vertical"}}/></div>
            <div>
              <label className="lbl">Serviços</label>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>{servicos.slice(0,8).map(s=><button key={s.id} onClick={()=>setItensOS(p=>[...p,{id:uid(),n:s.nome,v:s.preco,q:1}])} style={{background:"#fef9c3",border:`1px solid ${GOLD}`,color:GOLD2,borderRadius:7,padding:"4px 8px",fontSize:10,fontWeight:800,cursor:"pointer"}}>+{s.nome.slice(0,12)}</button>)}</div>
              <div style={{display:"flex",gap:6,marginBottom:8}}>
                <input className="inp" placeholder="Descrição" value={iN} onChange={e=>setIN(e.target.value)} style={{flex:2}}/>
                <input className="inp" type="number" placeholder="R$" value={iV} onChange={e=>setIV(e.target.value)} style={{width:70}}/>
                <input className="inp" type="number" placeholder="Qtd" value={iQ} onChange={e=>setIQ(e.target.value)} style={{width:52}}/>
                <button className="btn btn-gold" onClick={addItem} style={{padding:"12px",fontSize:16}}>+</button>
              </div>
              {itensOS.length>0&&<div style={{background:"#f8f8f8",borderRadius:10,overflow:"hidden",marginBottom:8}}>{itensOS.map(it=><div key={it.id} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 11px",borderBottom:"1px solid #f0f0f0"}}><span style={{flex:1,fontSize:12,fontWeight:700}}>{it.n}</span><input type="number" value={it.q} onChange={e=>setItensOS(p=>p.map(x=>x.id===it.id?{...x,q:Number(e.target.value)}:x))} style={{width:36,background:"#fff",border:"1px solid #e5e5e5",borderRadius:5,padding:"2px 4px",fontSize:12,textAlign:"center"}}/><span style={{fontSize:12,color:"#10b981",fontWeight:800,width:70,textAlign:"right"}}>{fmt(it.q*it.v)}</span><button onClick={()=>setItensOS(p=>p.filter(x=>x.id!==it.id))} style={{background:"none",border:"none",color:"#ef4444",fontSize:13,cursor:"pointer"}}>✕</button></div>)}</div>}
            </div>
            <div className="g2">
              <div><label className="lbl">Desconto (R$)</label><input className="inp" type="number" value={formOS.desconto||""} onChange={e=>setFormOS(p=>({...p,desconto:Number(e.target.value)}))} placeholder="0"/></div>
              <div><label className="lbl">Sinal/Entrada</label><input className="inp" type="number" value={formOS.sinal||""} onChange={e=>setFormOS(p=>({...p,sinal:Number(e.target.value)}))} placeholder="0"/></div>
            </div>
            {itensOS.length>0&&<div style={{background:"#fef9c3",border:`1px solid ${GOLD}`,borderRadius:10,padding:"11px 13px"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:"#888"}}>Subtotal</span><span style={{fontSize:12,fontWeight:800}}>{fmt(itensOS.reduce((a,b)=>a+b.q*b.v,0))}</span></div><div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #e5e5e5",paddingTop:6}}><span style={{fontSize:13,fontWeight:900,color:DARK}}>TOTAL</span><span style={{fontSize:18,fontWeight:900,color:GOLD2}}>{fmt(itensOS.reduce((a,b)=>a+b.q*b.v,0)-(Number(formOS.desconto)||0))}</span></div></div>}
            <div><label className="lbl">Observações</label><textarea className="inp" rows={2} value={formOS.obs||""} onChange={e=>setFormOS(p=>({...p,obs:e.target.value}))} style={{resize:"vertical"}}/></div>
            <button className="btn btn-gold" onClick={salvarOS} style={{width:"100%",fontSize:14,padding:"13px"}}>💾 Salvar OS</button>
            {editOSId&&<button className="btn btn-r" onClick={()=>{setOrdens(p=>p.filter(o=>o.id!==editOSId));setModalOS(false);showWarn("OS removida.");}} style={{width:"100%",fontSize:12,padding:"11px"}}>🗑️ Excluir</button>}
            <button className="btn btn-ghost" onClick={()=>setModalOS(false)} style={{width:"100%",fontSize:12,padding:"11px"}}>Cancelar</button>
          </div>
        </div>
      </div>}

      {/* MODAL CLIENTE */}
      {modalCli&&<div className="mbg" onClick={()=>setModalCli(false)}>
        <div className="mdl" onClick={e=>e.stopPropagation()}>
          <div className="hdl"/>
          <div style={{fontSize:16,fontWeight:900,marginBottom:14}}>👤 Cliente</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[{l:"Nome",f:"nome",p:"Maria da Silva"},{l:"CPF/CNPJ",f:"cpfCnpj",p:"000.000.000-00"},{l:"Telefone",f:"tel",p:"(11) 99999-9999"},{l:"E-mail",f:"email",p:"email@email.com"},{l:"Endereço",f:"endereco",p:"Rua, nº, bairro"}].map(fi=><div key={fi.f}><label className="lbl">{fi.l}</label><input className="inp" value={formCli[fi.f]||""} onChange={e=>setFormCli(p=>({...p,[fi.f]:e.target.value}))} placeholder={fi.p}/></div>)}
            <button className="btn btn-gold" onClick={()=>{if(clientes.find(c=>c.id===formCli.id))setClientes(p=>p.map(c=>c.id===formCli.id?formCli:c));else setClientes(p=>[formCli,...p]);setModalCli(false);showOk("Salvo!");}} style={{width:"100%",fontSize:14,padding:"13px"}}>💾 Salvar</button>
            <button className="btn btn-ghost" onClick={()=>setModalCli(false)} style={{width:"100%",fontSize:12,padding:"11px"}}>Cancelar</button>
          </div>
        </div>
      </div>}

      {/* MODAL FINANCEIRO */}
      {modalFin&&<div className="mbg" onClick={()=>setModalFin(false)}>
        <div className="mdl" onClick={e=>e.stopPropagation()}>
          <div className="hdl"/>
          <div style={{fontSize:16,fontWeight:900,marginBottom:14}}>💰 Novo Lançamento — {tipoFin==="empresa"?"Empresa":tipoFin==="pessoal"?"Pessoal":"Obra"}</div>
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            <div style={{display:"flex",gap:7}}>{[{v:"receita",l:"📈 Receita",c:"#10b981"},{v:"despesa",l:"📉 Despesa",c:"#ef4444"}].map(t=><button key={t.v} onClick={()=>setFormFin(p=>({...p,tipo:t.v}))} style={{flex:1,padding:"10px",borderRadius:10,border:`2px solid ${formFin.tipo===t.v?t.c:"#e5e5e5"}`,background:formFin.tipo===t.v?t.c+"15":"#f8f8f8",color:formFin.tipo===t.v?t.c:"#888",fontSize:13,fontWeight:800,cursor:"pointer"}}>{t.l}</button>)}</div>
            <div><label className="lbl">Descrição</label><input className="inp" value={formFin.desc} onChange={e=>setFormFin(p=>({...p,desc:e.target.value}))} placeholder="Ex: Pagamento OS #001"/></div>
            <div className="g2">
              <div><label className="lbl">Valor (R$)</label><input className="inp" type="number" value={formFin.valor} onChange={e=>setFormFin(p=>({...p,valor:e.target.value}))} placeholder="0,00"/></div>
              <div><label className="lbl">Data</label><input className="inp" type="date" value={formFin.data} onChange={e=>setFormFin(p=>({...p,data:e.target.value}))}/></div>
            </div>
            <div><label className="lbl">Categoria</label><select className="sel" value={formFin.cat} onChange={e=>setFormFin(p=>({...p,cat:e.target.value}))}>{CATS_FIN.map(c=><option key={c}>{c}</option>)}</select></div>
            {tipoFin==="obra"&&<div><label className="lbl">Nome da obra</label><input className="inp" value={formFin.obra||""} onChange={e=>setFormFin(p=>({...p,obra:e.target.value}))} placeholder="Ex: Casa do João"/></div>}
            <button className="btn btn-gold" onClick={()=>{if(!formFin.desc||!formFin.valor){showWarn("Preencha todos os campos.");return;}setFinAtual(p=>[{...formFin,id:uid(),valor:Number(formFin.valor)},...p]);setModalFin(false);setFormFin({tipo:"receita",desc:"",valor:"",data:new Date().toISOString().slice(0,10),cat:"Serviço",obra:""});showOk("Salvo!");}} style={{width:"100%",fontSize:14,padding:"13px"}}>💾 Salvar</button>
            <button className="btn btn-ghost" onClick={()=>setModalFin(false)} style={{width:"100%",fontSize:12,padding:"11px"}}>Cancelar</button>
          </div>
        </div>
      </div>}

      {/* MODAL AGENDA */}
      {modalAge&&<div className="mbg" onClick={()=>setModalAge(false)}>
        <div className="mdl" onClick={e=>e.stopPropagation()}>
          <div className="hdl"/>
          <div style={{fontSize:16,fontWeight:900,marginBottom:14}}>📅 Novo Compromisso</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[{l:"Título",f:"titulo",p:"Ex: Visita técnica"},{l:"Cliente",f:"cliente",p:"Nome do cliente"},{l:"Observações",f:"obs",p:"Detalhes..."}].map(fi=><div key={fi.f}><label className="lbl">{fi.l}</label><input className="inp" value={formAge[fi.f]||""} onChange={e=>setFormAge(p=>({...p,[fi.f]:e.target.value}))} placeholder={fi.p}/></div>)}
            <div className="g2">
              <div><label className="lbl">Data</label><input className="inp" type="date" value={formAge.data||""} onChange={e=>setFormAge(p=>({...p,data:e.target.value}))}/></div>
              <div><label className="lbl">Hora</label><input className="inp" type="time" value={formAge.hora||""} onChange={e=>setFormAge(p=>({...p,hora:e.target.value}))}/></div>
            </div>
            <button className="btn btn-gold" onClick={()=>{if(!formAge.titulo){showWarn("Digite um título.");return;}setAgenda(p=>[{...formAge,id:formAge.id||uid()},...p]);setModalAge(false);showOk("Salvo!");}} style={{width:"100%",fontSize:14,padding:"13px"}}>💾 Salvar</button>
            <button className="btn btn-ghost" onClick={()=>setModalAge(false)} style={{width:"100%",fontSize:12,padding:"11px"}}>Cancelar</button>
          </div>
        </div>
      </div>}

      {/* MODAL NOVA OBRA */}
      {modalObra&&<div className="mbg" onClick={()=>setModalObra(false)}>
        <div className="mdl" onClick={e=>e.stopPropagation()}>
          <div className="hdl"/>
          <div style={{fontSize:16,fontWeight:900,marginBottom:14}}>🏗️ Nova Obra</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[{l:"Nome da obra",f:"nome",p:"Ex: Residência João Silva"},{l:"Cliente",f:"cliente",p:"Nome do cliente"},{l:"Endereço",f:"endereco",p:"Rua, nº, bairro, cidade"},{l:"Quadro elétrico",f:"quadro",p:"Ex: Quadro 12 disjuntores bifásico"},{l:"Observações",f:"obs",p:"Detalhes da obra..."}].map(fi=><div key={fi.f}><label className="lbl">{fi.l}</label><input className="inp" value={formObra[fi.f]||""} onChange={e=>setFormObra(p=>({...p,[fi.f]:e.target.value}))} placeholder={fi.p}/></div>)}
            <button className="btn btn-gold" onClick={()=>{if(!formObra.nome){showWarn("Digite o nome da obra.");return;}setObras(p=>[{...formObra,id:formObra.id||uid(),comodos:[]},...p]);setModalObra(false);showOk("Obra criada!");}} style={{width:"100%",fontSize:14,padding:"13px"}}>💾 Criar Obra</button>
            <button className="btn btn-ghost" onClick={()=>setModalObra(false)} style={{width:"100%",fontSize:12,padding:"11px"}}>Cancelar</button>
          </div>
        </div>
      </div>}

      {/* MODAL CÔMODO */}
      {modalComodo&&<div className="mbg" onClick={()=>setModalComodo(false)}>
        <div className="mdl" onClick={e=>e.stopPropagation()}>
          <div className="hdl"/>
          <div style={{fontSize:16,fontWeight:900,marginBottom:14}}>🏠 Mapear Cômodo</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div><label className="lbl">Nome do cômodo</label><input className="inp" value={formComodo.nome||""} onChange={e=>setFormComodo(p=>({...p,nome:e.target.value}))} placeholder="Ex: Sala, Quarto 1, Cozinha, Garagem..."/></div>
            <div className="g2">
              {[{l:"🔌 Tomadas",f:"tomadas"},{l:"💡 Lâmpadas",f:"lampadas"},{l:"⚡ Disjuntores",f:"disjuntores"},{l:"🔄 Circuitos",f:"circuitos"},{l:"❄️ Ar-condicionado",f:"ar"},{l:"🔧 Outros pontos",f:"outros"}].map(fi=>(
                <div key={fi.f}>
                  <label className="lbl">{fi.l}</label>
                  <input className="inp" type="number" min="0" value={formComodo[fi.f]||0} onChange={e=>setFormComodo(p=>({...p,[fi.f]:Number(e.target.value)}))} placeholder="0"/>
                </div>
              ))}
            </div>
            <button className="btn btn-gold" onClick={()=>{
              if(!formComodo.nome){showWarn("Digite o nome do cômodo.");return;}
              if(obraAtiva){setObras(p=>p.map(o=>o.id===obraAtiva?{...o,comodos:[...(o.comodos||[]),{...formComodo,id:uid()}]}:o));}
              setModalComodo(false);showOk("Cômodo adicionado!");
            }} style={{width:"100%",fontSize:14,padding:"13px"}}>💾 Salvar Cômodo</button>
            <button className="btn btn-ghost" onClick={()=>setModalComodo(false)} style={{width:"100%",fontSize:12,padding:"11px"}}>Cancelar</button>
          </div>
        </div>
      </div>}

      {/* MODAL VISITA */}
      {modalVisita&&<div className="mbg" onClick={()=>setModalVisita(false)}>
        <div className="mdl" onClick={e=>e.stopPropagation()}>
          <div className="hdl"/>
          <div style={{fontSize:16,fontWeight:900,marginBottom:14}}>📷 Nova Visita Técnica</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div><label className="lbl">Nome da obra/visita</label><input className="inp" value={formVisita.nome||""} onChange={e=>setFormVisita(p=>({...p,nome:e.target.value}))} placeholder="Ex: Obra João Silva — Residencial"/></div>
            <div><label className="lbl">Data</label><input className="inp" type="date" value={formVisita.data||""} onChange={e=>setFormVisita(p=>({...p,data:e.target.value}))}/></div>
            <div><label className="lbl">Observações</label><textarea className="inp" rows={2} value={formVisita.obs||""} onChange={e=>setFormVisita(p=>({...p,obs:e.target.value}))} placeholder="Detalhes da visita..." style={{resize:"vertical"}}/></div>
            <button className="btn btn-gold" onClick={()=>{if(!formVisita.nome){showWarn("Digite o nome.");return;}setVisitas(p=>[{...formVisita,id:formVisita.id||uid(),fotos:[]},...p]);setVisitaAtiva(formVisita.id);setModalVisita(false);showOk("Pasta criada! Agora adicione fotos.");}} style={{width:"100%",fontSize:14,padding:"13px"}}>📁 Criar Pasta</button>
            <button className="btn btn-ghost" onClick={()=>setModalVisita(false)} style={{width:"100%",fontSize:12,padding:"11px"}}>Cancelar</button>
          </div>
        </div>
      </div>}

      {/* MODAL CONTATO */}
      {modalCon&&<div className="mbg" onClick={()=>setModalCon(false)}>
        <div className="mdl" onClick={e=>e.stopPropagation()}>
          <div className="hdl"/>
          <div style={{fontSize:16,fontWeight:900,marginBottom:14}}>🤝 Contato CRM</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[{l:"Nome",f:"nome",p:"Ex: Carlos"},{l:"Empresa",f:"empresa",p:"Ex: Studio Arq"},{l:"Telefone",f:"tel",p:"(11) 99999-9999"},{l:"E-mail",f:"email",p:"email@email.com"}].map(fi=><div key={fi.f}><label className="lbl">{fi.l}</label><input className="inp" value={formCon[fi.f]||""} onChange={e=>setFormCon(p=>({...p,[fi.f]:e.target.value}))} placeholder={fi.p}/></div>)}
            <div><label className="lbl">Segmento</label><select className="sel" value={formCon.segmento||"arquitetura"} onChange={e=>setFormCon(p=>({...p,segmento:e.target.value}))}>{SEGS.map(s=><option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}</select></div>
            <div><label className="lbl">Observações</label><textarea className="inp" rows={2} value={formCon.obs||""} onChange={e=>setFormCon(p=>({...p,obs:e.target.value}))} style={{resize:"vertical"}}/></div>
            <button className="btn btn-gold" onClick={()=>{if(contatos.find(c=>c.id===formCon.id))setContatos(p=>p.map(c=>c.id===formCon.id?formCon:c));else setContatos(p=>[{...formCon,id:formCon.id||uid(),criadoEm:hoje()},...p]);setModalCon(false);showOk("Salvo!");}} style={{width:"100%",fontSize:14,padding:"13px"}}>💾 Salvar</button>
            <button className="btn btn-ghost" onClick={()=>setModalCon(false)} style={{width:"100%",fontSize:12,padding:"11px"}}>Cancelar</button>
          </div>
        </div>
      </div>}

      {/* MODAL ESTOQUE */}
      {modalEst&&<div className="mbg" onClick={()=>setModalEst(false)}>
        <div className="mdl" onClick={e=>e.stopPropagation()}>
          <div className="hdl"/>
          <div style={{fontSize:16,fontWeight:900,marginBottom:14}}>📦 {formEst.id?"Editar Item":"Novo Item"}</div>
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            <div><label className="lbl">Nome do material</label><input className="inp" value={formEst.nome||""} onChange={e=>setFormEst(p=>({...p,nome:e.target.value}))} placeholder="Ex: Cabo 2,5mm"/></div>
            <div className="g2">
              <div><label className="lbl">Quantidade</label><input className="inp" type="number" value={formEst.qty||0} onChange={e=>setFormEst(p=>({...p,qty:Number(e.target.value)}))}/></div>
              <div><label className="lbl">Unidade</label><select className="sel" value={formEst.un||"un"} onChange={e=>setFormEst(p=>({...p,un:e.target.value}))}>{["un","m","kg","l","cx","pc","rolo"].map(u=><option key={u}>{u}</option>)}</select></div>
            </div>
            <div><label className="lbl">Preço unitário (R$)</label><input className="inp" type="number" step="0.01" value={formEst.preco||0} onChange={e=>setFormEst(p=>({...p,preco:Number(e.target.value)}))}/></div>
            <button className="btn btn-gold" onClick={()=>{
              if(!formEst.nome){showWarn("Digite o nome do material.");return;}
              const item={...formEst,id:formEst.id||uid()};
              setEstoque(p=>p.find(x=>x.id===item.id)?p.map(x=>x.id===item.id?item:x):[item,...p]);
              setModalEst(false);showOk("Item salvo!");
            }} style={{width:"100%",fontSize:14,padding:"13px"}}>💾 Salvar</button>
            <button className="btn btn-ghost" onClick={()=>setModalEst(false)} style={{width:"100%",fontSize:12,padding:"11px"}}>Cancelar</button>
          </div>
        </div>
      </div>}

      {/* MODAL PDF */}
      {modalPDF&&osPDF&&<div className="mbg" onClick={()=>setModalPDF(false)}>
        <div className="mdl" onClick={e=>e.stopPropagation()}>
          <div className="hdl"/>
          <div style={{fontSize:16,fontWeight:900,marginBottom:6,color:DARK}}>🖨️ Qual documento gerar?</div>
          <div style={{fontSize:13,color:"#888",marginBottom:16}}>OS #{osPDF.numero} · {osPDF.clienteNome||"Sem cliente"} · {fmt(osPDF.total)}</div>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
            {[
              {tipo:"Orçamento",ico:"📋"},
              {tipo:"Proposta Comercial",ico:"💼"},
              {tipo:"Ordem de Serviço",ico:"🔧"},
              {tipo:"Contrato",ico:"📄"},
              {tipo:"Fatura",ico:"💰"},
            ].map(({tipo,ico})=>(
              <button key={tipo} onClick={()=>{gerarDocumento(osPDF,emp,tipo);setModalPDF(false);}} style={{width:"100%",background:"#f8f8f8",border:"1.5px solid #e5e5e5",color:"#333",borderRadius:12,padding:"14px 16px",fontSize:15,fontWeight:700,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:22}}>{ico}</span>{tipo}
                <span style={{marginLeft:"auto",color:"#ccc",fontSize:18}}>›</span>
              </button>
            ))}
          </div>
          <button className="btn btn-ghost" onClick={()=>setModalPDF(false)} style={{width:"100%",fontSize:13,padding:"12px"}}>Cancelar</button>
        </div>
      </div>}

    </div>
  );
}
