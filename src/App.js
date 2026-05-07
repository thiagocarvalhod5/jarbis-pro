import { useState, useRef, useEffect } from "react";

// ── CONFIG ────────────────────────────────────────────────────
const SUPA_URL = "https://hrqhqqakvkdkapfijhij.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhycWhxcWFrdmtka2FwZmlqaGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDc1OTYsImV4cCI6MjA5MzU4MzU5Nn0.5YM_CUIuaSmb4lZngDXqJdEuPbGF53F5Qc9nbXLkk2k";
const HOTMART  = "https://hotmart.com/produto/protons-prospect";
const CASA_KEY = "64b4a4ee0c6a8f0c68c1fd3b8a802377edaa123d2de0dba7afb356bd8d165b55c496506456420da93d6483203b2713d322e658fca01e62ff3cd86b6476cbf043";
const GOLD     = "#F5C518";
const GOLD2    = "#C9A227";
const DARK     = "#1a1a1a";

// ── UTILS ─────────────────────────────────────────────────────
const fmt  = v => (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const hoje = () => new Date().toLocaleDateString("pt-BR");
const uid  = () => Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ── SUPABASE ──────────────────────────────────────────────────
const SH = {"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Content-Type":"application/json"};
async function dbGet(t,c,v){try{const r=await fetch(`${SUPA_URL}/rest/v1/${t}?${c}=eq.${encodeURIComponent(v)}&select=*&order=criado_em.desc`,{headers:SH});return await r.json();}catch{return[];}}
async function dbIns(t,d){try{const r=await fetch(`${SUPA_URL}/rest/v1/${t}`,{method:"POST",headers:{...SH,"Prefer":"return=representation"},body:JSON.stringify(d)});const j=await r.json();return Array.isArray(j)?j[0]:j;}catch{return null;}}
async function dbUpd(t,c,v,d){try{await fetch(`${SUPA_URL}/rest/v1/${t}?${c}=eq.${encodeURIComponent(v)}`,{method:"PATCH",headers:{...SH,"Prefer":"return=representation"},body:JSON.stringify(d)});}catch{}}
async function dbDel(t,c,v){try{await fetch(`${SUPA_URL}/rest/v1/${t}?${c}=eq.${encodeURIComponent(v)}`,{method:"DELETE",headers:SH});}catch{}}
async function fazerLogin(email,senha){const rows=await dbGet("usuarios","email",email.toLowerCase().trim());if(!rows||rows.length===0)return{erro:"E-mail não encontrado."};const u=rows[0];if(u.senha!==senha)return{erro:"Senha incorreta."};return{usuario:u};}
async function fazerCadastro(nome,email,senha){const ex=await dbGet("usuarios","email",email.toLowerCase().trim());if(ex&&ex.length>0)return{erro:"E-mail já cadastrado."};const u=await dbIns("usuarios",{nome,email:email.toLowerCase().trim(),senha,plano:"gratis",assinatura_ativa:false,creditos_prospeccao:5});if(!u)return{erro:"Erro ao criar conta."};return{usuario:u};}
function loginGoogle(){window.location.href=`${SUPA_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin)}`;}

// ── ASAAS PAGAMENTO ───────────────────────────────────────────
const PACOTES=[
  {creditos:20, valor:27,  label:"Starter",   desc:"20 contatos",  cor:"#10b981"},
  {creditos:50, valor:47,  label:"Pro",        desc:"50 contatos",  cor:GOLD2},
  {creditos:200,valor:147, label:"Business",   desc:"200 contatos", cor:"#6366f1"},
];

async function criarPagamento(email,nome,creditos,cpf){
  try{
    const r=await fetch("/api/pagar",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email,nome,creditos,cpf:cpf||""})
    });
    return await r.json();
  }catch(e){return{erro:"Erro de conexão: "+e.message};}
}

async function buscarCreditos(email){
  try{
    const rows=await dbGet("usuarios","email",email.toLowerCase().trim());
    if(rows&&rows.length>0)return Number(rows[0].creditos_prospeccao||0);
    return 0;
  }catch{return 0;}
}
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
    const norm=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
    const body={
      municipio:[norm(municipio)],
      codigo_atividade_principal:CNAES[seg]||["7111100"],
      ...(bairro&&bairro.trim()?{bairro:[norm(bairro)]}:{})
    };
    const r=await fetch("/api/buscar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(!r.ok)return null;
    const data=await r.json();
    return data;
  }catch(e){return null;}
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
    r.onerror  = e=>onError("Não entendi. Tente novamente.");
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
  if(c.includes("foto")||c.includes("visita"))
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
      <div className="card" style={{padding:14}}>
        <div style={{fontSize:14,fontWeight:800,marginBottom:10,color:DARK}}>Tipo de Cálculo</div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
          {TIPOS.map(t=><button key={t.id} onClick={()=>{setTipo(t.id);setRes(null);}} style={{padding:"8px 12px",borderRadius:10,border:`2px solid ${tipo===t.id?GOLD:"#e5e5e5"}`,background:tipo===t.id?"#fef9c3":"#f8f8f8",color:tipo===t.id?GOLD2:"#555",fontSize:12,fontWeight:800,cursor:"pointer"}}>{t.l}</button>)}
        </div>
      </div>

      <div className="card" style={{padding:14}}>
        <div style={{fontSize:14,fontWeight:800,marginBottom:12,color:DARK}}>⚡ Dados</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {tipo!=="arcondicionado"&&tipo!=="carga"&&<div><label className="lbl">{tipo==="motor"?"Potência do motor (cv/kW)":"Potência (W)"}</label><input className="inp" type="number" value={form.pot} onChange={e=>setForm(p=>({...p,pot:e.target.value}))} placeholder={tipo==="motor"?"Ex: 5 (cv) ou 3.7 (kW)":"Ex: 1500"}/></div>}
          {tipo==="arcondicionado"&&<div><label className="lbl">Capacidade (BTU)</label><select className="sel" value={form.btu} onChange={e=>setForm(p=>({...p,btu:e.target.value}))}><option value="">Selecione...</option>{[7000,9000,12000,18000,24000,30000,36000,48000,60000].map(b=><option key={b} value={b}>{b.toLocaleString()} BTU</option>)}</select></div>}
          {tipo==="carga"&&<>
            <div><label className="lbl">Carga total instalada (W)</label><input className="inp" type="number" value={form.cargaTotal} onChange={e=>setForm(p=>({...p,cargaTotal:e.target.value}))} placeholder="Soma de todas as cargas"/></div>
            <div><label className="lbl">Fator de demanda</label><select className="sel" value={form.fd} onChange={e=>setForm(p=>({...p,fd:e.target.value}))}><option value="0.5">50% — Grande residência</option><option value="0.6">60% — Residência média</option><option value="0.7">70% — Residência pequena</option><option value="0.8">80% — Comércio</option><option value="1.0">100% — Industrial</option></select></div>
          </>}
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

// ── PDF + COMPARTILHAMENTO ────────────────────────────────────
function gerarDocumento(os,emp,tipoDoc){
  const fmtN=v=>(v||0).toFixed(2).replace(".",",");
  const itens=(os.itens||[]).map(s=>`<tr><td style="padding:8px 6px;border-bottom:1px solid #f0f0f0">${s.n}</td><td style="padding:8px 6px;border-bottom:1px solid #f0f0f0;text-align:center">${s.q}</td><td style="padding:8px 6px;border-bottom:1px solid #f0f0f0;text-align:right">R$${fmtN(s.v)}</td><td style="padding:8px 6px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700">R$${fmtN(s.q*s.v)}</td></tr>`).join("");
  const total=(os.itens||[]).reduce((a,b)=>a+b.q*b.v,0)-(Number(os.desconto)||0);

  const textoWA=`*${tipoDoc} Nº ${os.numero||"001"}*\n*${emp.nome||"Prótons Serviços Elétricos"}*\n\n*Cliente:* ${os.clienteNome||"—"}\n*Local:* ${os.local||"—"}\n*Data:* ${os.data||hoje()}\n*Pagamento:* ${os.pagamento||"—"}\n\n*Serviços:*\n${(os.itens||[]).map(i=>`• ${i.n} (${i.q}x) — R$${fmtN(i.q*i.v)}`).join("\n")}\n\n*TOTAL: R$${fmtN(total)}*\n${os.obs?"\n*Obs:* "+os.obs:""}`;

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${tipoDoc} ${os.numero||"001"}</title><style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:20px;max-width:720px;margin:0 auto;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1a1a1a;padding-bottom:14px;margin-bottom:18px;}
  .empresa{font-size:18px;font-weight:900;color:#1a1a1a;}
  .sub{font-size:11px;color:#666;margin-top:3px;}
  .titulo{background:#1a1a1a;color:#F5C518;padding:10px 14px;font-size:16px;font-weight:900;border-radius:6px;margin-bottom:16px;}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;}
  .info-box{background:#f8f8f8;border-radius:8px;padding:10px;}
  .info-label{font-size:10px;color:#888;font-weight:700;text-transform:uppercase;margin-bottom:3px;}
  .info-val{font-size:13px;font-weight:700;}
  table{width:100%;border-collapse:collapse;margin-bottom:14px;}
  th{background:#f5f5f5;padding:8px 6px;text-align:left;font-size:11px;color:#555;font-weight:700;border-bottom:2px solid #e5e5e5;}
  .total-box{display:flex;justify-content:flex-end;margin-top:8px;}
  .total-inner{min-width:220px;border-top:2px solid #1a1a1a;padding-top:8px;}
  .total-row{display:flex;justify-content:space-between;margin-bottom:5px;font-size:13px;}
  .total-final{display:flex;justify-content:space-between;font-size:19px;font-weight:900;}
  .assinatura{margin-top:48px;text-align:center;border-top:1px solid #ccc;padding-top:10px;font-size:12px;color:#555;}
  .btn-share{display:block;width:100%;margin:20px 0 8px;padding:14px;background:#25D366;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:900;cursor:pointer;font-family:Arial,sans-serif;}
  .btn-print{display:block;width:100%;padding:12px;background:#1a1a1a;color:#F5C518;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif;}
  @media print{.btn-share,.btn-print{display:none;}}
  </style></head><body>
  <div class="header">
    <div>
      <div class="empresa">⚡ ${emp.nome||"Prótons Serviços Elétricos"}</div>
      <div class="sub">${emp.cnpj?"CNPJ: "+emp.cnpj:""}${emp.crea?" · CREA: "+emp.crea:""}</div>
      <div class="sub">${emp.tel||""}${emp.email?" · "+emp.email:""}</div>
    </div>
    <div style="text-align:right;font-size:12px;color:#888"><div>Nº ${os.numero||"001"}</div><div>${os.data||hoje()}</div></div>
  </div>
  <div class="titulo">${tipoDoc}</div>
  <div class="info">
    <div class="info-box"><div class="info-label">Cliente</div><div class="info-val">${os.clienteNome||"—"}</div><div class="sub">${os.clienteTel||""}</div></div>
    <div class="info-box"><div class="info-label">Local</div><div class="info-val">${os.local||"—"}</div></div>
    <div class="info-box"><div class="info-label">Pagamento</div><div class="info-val">${os.pagamento||"—"}</div></div>
    <div class="info-box"><div class="info-label">Vencimento</div><div class="info-val">${os.vencimento||"—"}</div></div>
  </div>
  ${os.descricao?`<div style="background:#fef9c3;border-left:4px solid #F5C518;padding:10px 14px;border-radius:6px;margin-bottom:14px;font-size:13px">${os.descricao}</div>`:""}
  <table><thead><tr><th>Descrição</th><th style="text-align:center">Qtd</th><th style="text-align:right">Unit.</th><th style="text-align:right">Total</th></tr></thead><tbody>${itens}</tbody></table>
  <div class="total-box"><div class="total-inner">
    ${Number(os.desconto)>0?`<div class="total-row"><span>Desconto</span><span style="color:#ef4444">- R$${fmtN(Number(os.desconto))}</span></div>`:""}
    ${Number(os.sinal)>0?`<div class="total-row"><span>Entrada</span><span>R$${fmtN(Number(os.sinal))}</span></div>`:""}
    <div class="total-final"><span>TOTAL</span><span style="color:#C9A227">R$${fmtN(total)}</span></div>
  </div></div>
  ${os.obs?`<div style="margin-top:14px;background:#f8f8f8;border-radius:8px;padding:12px"><div style="font-size:11px;color:#888;font-weight:700;margin-bottom:4px">OBSERVAÇÕES</div><div style="font-size:13px">${os.obs}</div></div>`:""}
  <div class="assinatura">${emp.nome||"Prótons Serviços Elétricos"}${emp.crea?"<br>CREA: "+emp.crea:""}</div>
  <button class="btn-share" onclick="compartilhar()">💬 Compartilhar no WhatsApp</button>
  <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
  <script>
    const textoDoc = ${JSON.stringify(textoWA)};
    function compartilhar(){
      if(navigator.share){
        navigator.share({title:'${tipoDoc} Nº ${os.numero||"001"}',text:textoDoc})
          .catch(()=>abrirWA());
      } else { abrirWA(); }
    }
    function abrirWA(){
      window.open('https://wa.me/?text='+encodeURIComponent(textoDoc),'_blank');
    }
  </script>
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
      <div style={{width:"100%",maxWidth:400,background:"rgba(255,255,255,.05)",border:`1px solid ${GOLD}30`,borderRadius:20,padding:24,animation:"fadeU
