"use client";
import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════
   SELLMYSLABS.NET — Premium Graded Card Acquisition Platform
   SEO-optimized • Structured Data • Open Graph • Semantic HTML
   ═══════════════════════════════════════════════════════════════ */

// ─── COURTYARD PAYOUT RATES ───
const COURTYARD = {
  pokemon:    { min: 5,  max: 200, fmv: 95,  lowConf: 50  },
  football:   { min: 10, max: 200, fmv: 100, lowConf: 50  },
  baseball:   { min: 10, max: 200, fmv: 90,  lowConf: 50  },
  basketball: { min: 10, max: 200, fmv: 90,  lowConf: 50  },
  hockey:     { min: 10, max: 200, fmv: 95,  lowConf: 100 },
  soccer:     { min: 10, max: 300, fmv: 95,  lowConf: 100 },
  onepiece:   { min: 10, max: 500, fmv: 100, lowConf: 100 },
};

const CATS = [
  { v: "pokemon",    l: "Pokémon",     icon: "⚡", kw: "sell pokemon cards" },
  { v: "football",   l: "Football",    icon: "🏈", kw: "sell football cards" },
  { v: "baseball",   l: "Baseball",    icon: "⚾", kw: "sell baseball cards" },
  { v: "basketball", l: "Basketball",  icon: "🏀", kw: "sell basketball cards" },
  { v: "hockey",     l: "Hockey",      icon: "🏒", kw: "sell hockey cards" },
  { v: "soccer",     l: "Soccer",      icon: "⚽", kw: "sell soccer cards" },
  { v: "onepiece",   l: "One Piece",   icon: "🏴‍☠️", kw: "sell one piece cards" },
];

const GRADERS = ["PSA", "CGC", "BGS"];
const SOURCES = ["Instagram", "Facebook", "TikTok", "Reddit", "Referral", "Google Search", "Card Show", "YouTube", "Other"];
const STATUSES = {
  pending:  { l: "Pending",  c: "#FBBF24", bg: "rgba(251,191,36,0.1)" },
  offered:  { l: "Offered",  c: "#60A5FA", bg: "rgba(96,165,250,0.1)" },
  accepted: { l: "Accepted", c: "#34D399", bg: "rgba(52,211,153,0.1)" },
  declined: { l: "Declined", c: "#F87171", bg: "rgba(248,113,113,0.1)" },
};

// ─── STORAGE (localStorage for production) ───
const load = (k, fb) => { try { if (typeof window === 'undefined') return fb; const d = localStorage.getItem(k); return d ? JSON.parse(d) : fb; } catch { return fb; } };
const save = (k, d) => { try { if (typeof window !== 'undefined') localStorage.setItem(k, JSON.stringify(d)); } catch {} };

// SEO is handled by layout.js metadata export

// Styles are in globals.css

// ─── MAIN APP ───
export default function SellMySlabs() {
  const [page, setPage] = useState("home");
  const [subs, setSubs] = useState([]);
  const [selId, setSelId] = useState(null);
  const [ready, setReady] = useState(false);
  const [auth, setAuth] = useState(false);
  const [pin, setPin] = useState("");
  const [lead, setLead] = useState(null);

  useEffect(() => { setSubs(load("sms-subs",[])); setReady(true); }, []);
  useEffect(() => { if(ready) save("sms-subs",subs); }, [subs,ready]);

  const addSub = s => {
    const ns = {...s, id:Date.now().toString(), status:"pending", createdAt:new Date().toISOString(), offerPrice:null, notes:"", fmv:"", confidence:"3", lead};
    setSubs(p=>[ns,...p]); return ns.id;
  };
  const addBulk = cards => {
    const ns = cards.map((c,i)=>({...c, id:(Date.now()+i).toString(), status:"pending", createdAt:new Date().toISOString(), offerPrice:null, notes:"", fmv:"", confidence:"3", lead, images:[]}));
    setSubs(p=>[...ns,...p]);
  };
  const upSub = (id,u) => setSubs(p=>p.map(s=>s.id===id?{...s,...u}:s));
  const delSub = id => { setSubs(p=>p.filter(s=>s.id!==id)); if(selId===id)setSelId(null); };
  const sel = subs.find(s=>s.id===selId);

  return (
    <>
      <div className="noise"/>
      <div className="grid-bg" style={{minHeight:"100vh",position:"relative",zIndex:1}}>
        {/* NAV — semantic <header> */}
        <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 28px",borderBottom:"1px solid var(--border)",backdropFilter:"blur(24px)",position:"sticky",top:0,zIndex:100,background:"rgba(5,5,7,0.8)"}}>
          <a onClick={()=>{setPage("home");setSelId(null)}} style={{cursor:"pointer",display:"flex",alignItems:"center",gap:12,textDecoration:"none",color:"inherit"}} aria-label="Sell My Slabs Home">
            <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#C8A961,#8B6914)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,fontWeight:900,color:"#050507"}}>S</div>
            <div>
              <div style={{fontSize:18,fontWeight:800,letterSpacing:"-0.03em",lineHeight:1}}><span className="gold-text">SellMySlabs</span></div>
              <div className="mono" style={{fontSize:9,color:"var(--text3)",letterSpacing:".15em",textTransform:"uppercase"}}>Graded Card Buyers</div>
            </div>
          </a>
          <nav style={{display:"flex",alignItems:"center",gap:8}} aria-label="Main navigation">
            {["home","submit"].map(v=>(
              <button key={v} onClick={()=>{setPage(v);setSelId(null)}}
                style={{padding:"8px 18px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:500,fontFamily:"'Outfit',sans-serif",
                  background:(page===v||(v==="submit"&&page==="bulk"))?"var(--gold-glow)":"transparent",
                  color:(page===v||(v==="submit"&&page==="bulk"))?"var(--gold)":"var(--text3)",transition:"all .2s"}}>
                {v==="home"?"Home":"Sell Cards"}
              </button>
            ))}
            {auth?(
              <button onClick={()=>{setPage("admin");setSelId(null)}}
                style={{padding:"8px 18px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:500,fontFamily:"'Outfit',sans-serif",
                  background:(page==="admin"||page==="detail")?"var(--gold-glow)":"transparent",
                  color:(page==="admin"||page==="detail")?"var(--gold)":"var(--text3)",transition:"all .2s"}}>
                Dashboard
              </button>
            ):(
              <div style={{display:"flex",alignItems:"center",gap:4,marginLeft:8}}>
                <input type="password" placeholder="PIN" value={pin} onChange={e=>setPin(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"&&pin==="2024"){setAuth(true);setPage("admin");setPin("")}}}
                  style={{width:56,padding:"7px 10px",borderRadius:7,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text)",fontSize:12,fontFamily:"'JetBrains Mono',monospace",outline:"none"}}/>
                <button onClick={()=>{if(pin==="2024"){setAuth(true);setPage("admin");setPin("")}}}
                  style={{padding:"7px 12px",borderRadius:7,border:"none",background:"var(--gold)",color:"var(--bg)",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>→</button>
              </div>
            )}
          </nav>
        </header>

        <main style={{maxWidth:page==="home"?1200:980,margin:"0 auto",padding:"0 24px 60px"}}>
          {page==="home" && <Landing onStart={ld=>{setLead(ld);setPage("submit")}}/>}
          {page==="submit" && <SubmitSingle onSubmit={s=>addSub(s)} onBulk={()=>setPage("bulk")} lead={lead}/>}
          {page==="bulk" && <BulkSubmit onSubmit={cards=>addBulk(cards)} onSingle={()=>setPage("submit")}/>}
          {page==="admin"&&auth && <Dashboard subs={subs} onSelect={id=>{setSelId(id);setPage("detail")}} onDelete={delSub}/>}
          {page==="detail"&&auth&&sel && <Detail sub={sel} onUpdate={u=>upSub(sel.id,u)} onBack={()=>{setPage("admin");setSelId(null)}} onDelete={()=>{delSub(sel.id);setPage("admin")}}/>}
        </main>

        {/* FOOTER — semantic + SEO keyword-rich */}
        {page==="home" && (
          <footer style={{borderTop:"1px solid var(--border)",padding:"48px 28px 32px",maxWidth:1200,margin:"0 auto"}}>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:40,marginBottom:40}}>
              <div>
                <div style={{fontSize:18,fontWeight:800,marginBottom:12}}><span className="gold-text">SellMySlabs</span></div>
                <p style={{fontSize:13,color:"var(--text3)",lineHeight:1.8,maxWidth:320}}>
                  The fast, trusted way to sell your graded trading cards for cash. We buy PSA, CGC & BGS slabs across Pokémon, sports cards, and One Piece. Competitive offers within 24 hours.
                </p>
              </div>
              <div>
                <h4 style={{fontSize:11,fontWeight:600,color:"var(--gold)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:14}} className="mono">We Buy</h4>
                <ul style={{listStyle:"none",fontSize:13,color:"var(--text2)",lineHeight:2.2}}>
                  <li>PSA Graded Cards</li><li>CGC Graded Cards</li><li>BGS Graded Cards</li>
                </ul>
              </div>
              <div>
                <h4 style={{fontSize:11,fontWeight:600,color:"var(--gold)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:14}} className="mono">Categories</h4>
                <ul style={{listStyle:"none",fontSize:13,color:"var(--text2)",lineHeight:2.2}}>
                  <li>Pokémon Cards</li><li>Football Cards</li><li>Baseball Cards</li><li>Basketball Cards</li><li>Hockey Cards</li><li>Soccer Cards</li><li>One Piece Cards</li>
                </ul>
              </div>
              <div>
                <h4 style={{fontSize:11,fontWeight:600,color:"var(--gold)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:14}} className="mono">Info</h4>
                <ul style={{listStyle:"none",fontSize:13,color:"var(--text2)",lineHeight:2.2}}>
                  <li>How It Works</li><li>Submit Cards</li><li>Bulk Submit</li><li>FAQ</li>
                </ul>
              </div>
            </div>
            <div className="glow-line" style={{marginBottom:20}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,color:"var(--text3)"}}>
              <span>© {new Date().getFullYear()} SellMySlabs.net — All rights reserved.</span>
              <span className="mono" style={{fontSize:10}}>Sell graded cards for cash — PSA, CGC, BGS</span>
            </div>
          </footer>
        )}
      </div>
    </>
  );
}

// ─── LANDING PAGE ───
function Landing({ onStart }) {
  const [form, setForm] = useState({name:"",email:"",phone:"",source:""});
  const set = f => e => setForm(p=>({...p,[f]:e.target.value}));
  const valid = form.name && form.email;

  return (
    <div>
      {/* HERO — <section> with semantic heading */}
      <section style={{padding:"100px 0 80px",textAlign:"center",position:"relative"}} aria-label="Sell your graded cards for cash">
        <div style={{position:"absolute",top:"10%",left:"50%",transform:"translateX(-50%)",width:600,height:400,borderRadius:"50%",background:"radial-gradient(ellipse,rgba(200,169,97,.06) 0%,transparent 70%)",pointerEvents:"none"}}/>

        <div className="au" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 16px",borderRadius:100,border:"1px solid rgba(200,169,97,.2)",background:"rgba(200,169,97,.05)",marginBottom:28,fontSize:12,fontWeight:500,color:"var(--gold)"}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:"var(--green)",animation:"pulse 2s infinite"}}/>
          Now buying Hockey & Soccer collections
        </div>

        <h1 className="au1 hero-title" style={{fontSize:"clamp(42px,7vw,76px)",fontWeight:900,letterSpacing:"-0.04em",lineHeight:1.05,marginBottom:24,maxWidth:800,margin:"0 auto 24px"}}>
          Sell Your <span className="gold-text">Graded Slabs</span> for Cash
        </h1>

        <p className="au2" style={{fontSize:18,color:"var(--text2)",maxWidth:580,margin:"0 auto 20px",lineHeight:1.7,fontWeight:300}}>
          We buy PSA, CGC & BGS graded cards — Pokémon, sports cards, One Piece and more. Submit your cards and get a competitive offer within 24 hours. If it's a fit, we pay fast.
        </p>

        <div className="au3 glow-line" style={{maxWidth:200,margin:"0 auto 48px"}}/>

        {/* STATS */}
        <div className="au3 stats-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:2,maxWidth:680,margin:"0 auto 60px",borderRadius:16,overflow:"hidden",border:"1px solid var(--border)"}}>
          {[{n:"10K+",l:"Cards Acquired"},{n:"$2M+",l:"Total Payouts"},{n:"24hr",l:"Offer Turnaround"},{n:"98%",l:"Satisfaction Rate"}].map((s,i)=>(
            <div key={i} style={{padding:"28px 16px",background:"var(--surface)",textAlign:"center"}}>
              <div className="mono" style={{fontSize:26,fontWeight:700,color:"var(--gold2)",letterSpacing:"-0.02em",animation:`countUp .6s ease ${.2+i*.1}s both`}}>{s.n}</div>
              <div style={{fontSize:11,color:"var(--text3)",marginTop:4,fontWeight:500}}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* WHAT WE BUY — keyword-rich section */}
      <section className="au4" style={{marginBottom:72}} aria-label="Card categories we buy">
        <div style={{textAlign:"center",marginBottom:32}}>
          <h2 className="mono" style={{fontSize:14,fontWeight:600,color:"var(--gold)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:12}}>What We Buy</h2>
          <p style={{fontSize:16,color:"var(--text2)",fontWeight:300}}>Graded cards from PSA, CGC & BGS across all major categories</p>
        </div>
        <div className="cats-flex" style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
          {CATS.map((c,i)=>(
            <article key={c.v} className="card-hover" style={{padding:"20px 28px",borderRadius:14,border:"1px solid var(--border)",background:"var(--surface)",textAlign:"center",minWidth:110,animation:`fadeUp .5s ease ${.3+i*.06}s both`}}
              aria-label={`We buy graded ${c.l} cards`}>
              <div style={{fontSize:28,marginBottom:8}}>{c.icon}</div>
              <div style={{fontSize:13,fontWeight:600,color:"var(--text2)"}}>{c.l}</div>
            </article>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="au4" style={{marginBottom:72}} aria-label="How to sell your graded cards">
        <div style={{textAlign:"center",marginBottom:40}}>
          <h2 className="mono" style={{fontSize:14,fontWeight:600,color:"var(--gold)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:12}}>How It Works</h2>
          <h3 style={{fontSize:32,fontWeight:800,letterSpacing:"-0.03em"}}>Three Simple Steps to Sell Your Cards</h3>
        </div>
        <div className="steps-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
          {[
            {n:"01",t:"Submit Your Cards",d:"Enter your graded card details and upload photos. Single cards or bulk collections — we handle both. PSA, CGC & BGS accepted."},
            {n:"02",t:"We Review & Offer",d:"Our team reviews every submission individually. If your card meets our buying criteria, we'll send a competitive offer within 24 hours. Not every card is guaranteed an offer, but we always respond."},
            {n:"03",t:"Get Paid Fast",d:"Accept the offer, ship your cards, and get paid. Simple, secure, and fast. No auction fees, no waiting around."},
          ].map((s,i)=>(
            <article key={i} style={{padding:32,borderRadius:16,border:"1px solid var(--border)",background:"var(--surface)",position:"relative",overflow:"hidden"}}>
              <div className="mono" style={{fontSize:48,fontWeight:800,color:"rgba(200,169,97,.07)",position:"absolute",top:16,right:20,lineHeight:1}}>{s.n}</div>
              <div className="mono" style={{fontSize:11,color:"var(--gold)",marginBottom:12,letterSpacing:".1em"}}>STEP {s.n}</div>
              <h4 style={{fontSize:20,fontWeight:700,marginBottom:10,letterSpacing:"-0.02em"}}>{s.t}</h4>
              <p style={{fontSize:14,color:"var(--text2)",lineHeight:1.7,fontWeight:300}}>{s.d}</p>
            </article>
          ))}
        </div>
      </section>

      {/* GRADING COMPANIES */}
      <section className="au5" style={{marginBottom:72}} aria-label="Accepted grading companies">
        <div style={{textAlign:"center",marginBottom:16}}>
          <h2 className="mono" style={{fontSize:12,color:"var(--text3)",letterSpacing:".1em",textTransform:"uppercase"}}>Accepted Grading Companies</h2>
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:32,alignItems:"center",padding:"16px 0"}}>
          {GRADERS.map(g=>(
            <div key={g} style={{padding:"14px 36px",borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)"}}>
              <span style={{fontSize:22,fontWeight:800,letterSpacing:".08em",color:"var(--text2)"}}>{g}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ — SEO-rich, matches JSON-LD */}
      <section className="au5" style={{marginBottom:72,maxWidth:720,margin:"0 auto 72px"}} aria-label="Frequently asked questions about selling graded cards">
        <div style={{textAlign:"center",marginBottom:32}}>
          <h2 className="mono" style={{fontSize:14,fontWeight:600,color:"var(--gold)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:12}}>FAQ</h2>
          <h3 style={{fontSize:28,fontWeight:800,letterSpacing:"-0.03em"}}>Common Questions</h3>
        </div>
        {[
          {q:"What graded cards do you buy?",a:"We buy PSA, CGC, and BGS graded cards across Pokémon, football, baseball, basketball, hockey, soccer, and One Piece categories."},
          {q:"How fast will I get an offer?",a:"We review every submission individually and typically respond within 24 hours with an offer or status update."},
          {q:"Is every card guaranteed to receive an offer?",a:"No. We review every submission but offers are based on our current buying criteria, market conditions, and inventory needs. We'll always let you know either way."},
          {q:"How do I get paid?",a:"Once you accept an offer and ship your cards, we process payment quickly. We support multiple payment methods for your convenience."},
          {q:"Can I submit multiple cards at once?",a:"Yes! We offer both single card submission and bulk submission via CSV upload or manual multi-card entry for larger collections."},
        ].map((f,i)=>(
          <details key={i} style={{marginBottom:8,borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)",overflow:"hidden"}}>
            <summary style={{padding:"18px 20px",cursor:"pointer",fontSize:15,fontWeight:600,color:"var(--text)",listStyle:"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              {f.q} <span style={{color:"var(--gold)",fontSize:18,fontWeight:300,flexShrink:0,marginLeft:12}}>+</span>
            </summary>
            <div style={{padding:"0 20px 18px",fontSize:14,color:"var(--text2)",lineHeight:1.7}}>{f.a}</div>
          </details>
        ))}
      </section>

      {/* LEAD CAPTURE CTA */}
      <section style={{marginBottom:40}} aria-label="Start selling your graded cards">
        <div style={{maxWidth:560,margin:"0 auto",padding:40,borderRadius:20,border:"1px solid rgba(200,169,97,.15)",background:"linear-gradient(180deg,rgba(200,169,97,.04) 0%,var(--surface) 100%)",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,var(--gold),transparent)",opacity:.4}}/>
          <div style={{textAlign:"center",marginBottom:28}}>
            <h2 style={{fontSize:28,fontWeight:800,letterSpacing:"-0.03em",marginBottom:8}}>Ready to Sell Your Cards?</h2>
            <p style={{fontSize:14,color:"var(--text2)",fontWeight:300}}>Tell us about yourself and start submitting your graded slabs.</p>
          </div>
          <div className="form-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div><label className="label">Name *</label><input className="input" placeholder="Your name" value={form.name} onChange={set("name")}/></div>
            <div><label className="label">Email *</label><input className="input" type="email" placeholder="you@email.com" value={form.email} onChange={set("email")}/></div>
            <div><label className="label">Phone</label><input className="input" placeholder="(555) 123-4567" value={form.phone} onChange={set("phone")}/></div>
            <div><label className="label">How'd You Find Us?</label><select className="sel" value={form.source} onChange={set("source")}><option value="">Select...</option>{SOURCES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <button className="btn-gold" disabled={!valid} onClick={()=>valid&&onStart(form)} style={{width:"100%",padding:16,borderRadius:12,fontSize:15,letterSpacing:".02em"}}>
            Start Submitting Cards →
          </button>
          <p style={{textAlign:"center",fontSize:11,color:"var(--text3)",marginTop:14,lineHeight:1.6}}>
            Submitting a card does not guarantee an offer or purchase. All submissions are reviewed individually and offers are made at our discretion based on current buying criteria.
          </p>
        </div>
      </section>
    </div>
  );
}

// ─── SINGLE SUBMISSION ───
function SubmitSingle({ onSubmit, onBulk, lead }) {
  const [form, setForm] = useState({category:"",gradingCompany:"",certNumber:"",cardName:"",grade:"",askingPrice:"",name:lead?.name||"",email:lead?.email||"",phone:lead?.phone||""});
  const [images, setImages] = useState([]);
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(0);
  const set = f => e => setForm(p=>({...p,[f]:e.target.value}));
  const handleImg = e => { Array.from(e.target.files).forEach(f=>{const r=new FileReader();r.onload=ev=>setImages(p=>[...p,{name:f.name,data:ev.target.result}]);r.readAsDataURL(f)}); };
  const canSubmit = form.category&&form.gradingCompany&&form.certNumber&&form.cardName&&form.grade&&form.name&&form.email;

  const submit = () => { if(!canSubmit) return; onSubmit({...form,images}); setDone(true); setCount(c=>c+1); };
  const reset = () => { setForm(f=>({...f,category:"",gradingCompany:"",certNumber:"",cardName:"",grade:"",askingPrice:""})); setImages([]); setDone(false); };

  if (done) return (
    <div style={{textAlign:"center",padding:"100px 20px"}}>
      <div className="au" style={{width:72,height:72,borderRadius:"50%",background:"rgba(52,211,153,.08)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px",border:"1px solid rgba(52,211,153,.15)"}}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h2 className="au1" style={{fontSize:28,fontWeight:800,letterSpacing:"-0.03em",marginBottom:8}}>Card #{count} Submitted!</h2>
      <p className="au2" style={{color:"var(--text2)",fontSize:15,maxWidth:440,margin:"0 auto 12px",lineHeight:1.7,fontWeight:300}}>We'll review your card and get back to you at {lead?.email||form.email} within 24 hours.</p>
      <p className="au2" style={{color:"var(--text3)",fontSize:12,maxWidth:400,margin:"0 auto 32px",lineHeight:1.6}}>If your card meets our current buying criteria, we'll send you a competitive offer. If not, we'll let you know.</p>
      <div className="au3" style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
        <button className="btn-gold" onClick={reset} style={{padding:"14px 28px",borderRadius:12,fontSize:14}}>Submit Another Card</button>
        <button className="btn-ghost" onClick={onBulk} style={{padding:"14px 28px",borderRadius:12,fontSize:14}}>Bulk Submit →</button>
      </div>
    </div>
  );

  return (
    <div style={{paddingTop:40}}>
      <div className="au" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:36,flexWrap:"wrap",gap:16}}>
        <div>
          <h1 style={{fontSize:32,fontWeight:800,letterSpacing:"-0.03em",marginBottom:8}}>Submit a Card</h1>
          <p style={{color:"var(--text2)",fontSize:15,fontWeight:300}}>We accept PSA, CGC & BGS graded cards only.</p>
        </div>
        <button className="btn-ghost" onClick={onBulk} style={{padding:"10px 20px",borderRadius:10,fontSize:13}}>Bulk Submit →</button>
      </div>

      <div className="au1" style={{padding:28,borderRadius:16,border:"1px solid var(--border)",background:"var(--surface)",marginBottom:16}}>
        <div className="mono" style={{fontSize:11,color:"var(--gold)",letterSpacing:".1em",marginBottom:16}}>CONTACT</div>
        <div className="form-grid-3" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
          <div><label className="label">Name *</label><input className="input" value={form.name} onChange={set("name")}/></div>
          <div><label className="label">Email *</label><input className="input" type="email" value={form.email} onChange={set("email")}/></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={set("phone")}/></div>
        </div>
      </div>

      <div className="au2" style={{padding:28,borderRadius:16,border:"1px solid var(--border)",background:"var(--surface)",marginBottom:16}}>
        <div className="mono" style={{fontSize:11,color:"var(--gold)",letterSpacing:".1em",marginBottom:16}}>CARD DETAILS</div>
        <div className="form-grid-3" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:14}}>
          <div><label className="label">Category *</label><select className="sel" value={form.category} onChange={set("category")}><option value="">Select...</option>{CATS.map(c=><option key={c.v} value={c.v}>{c.icon} {c.l}</option>)}</select></div>
          <div><label className="label">Grading Company *</label><select className="sel" value={form.gradingCompany} onChange={set("gradingCompany")}><option value="">Select...</option>{GRADERS.map(g=><option key={g} value={g}>{g}</option>)}</select></div>
          <div><label className="label">Cert # *</label><input className="input input-m" placeholder="e.g. 12345678" value={form.certNumber} onChange={set("certNumber")}/></div>
        </div>
        <div className="form-grid-3" style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:14}}>
          <div><label className="label">Card Name / Description *</label><input className="input" placeholder="e.g. 2023 Pokémon 151 Charizard ex #006" value={form.cardName} onChange={set("cardName")}/></div>
          <div><label className="label">Grade *</label><input className="input input-m" placeholder="e.g. 10" value={form.grade} onChange={set("grade")}/></div>
          <div><label className="label">Asking Price</label><div style={{position:"relative"}}><span className="mono" style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"var(--text3)",fontSize:13}}>$</span><input className="input input-m" style={{paddingLeft:28}} placeholder="0.00" value={form.askingPrice} onChange={set("askingPrice")}/></div></div>
        </div>
      </div>

      <div className="au3" style={{padding:28,borderRadius:16,border:"1px solid var(--border)",background:"var(--surface)",marginBottom:16}}>
        <div className="mono" style={{fontSize:11,color:"var(--gold)",letterSpacing:".1em",marginBottom:16}}>PHOTOS</div>
        <label style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:"40px 20px",borderRadius:14,border:"2px dashed var(--border)",cursor:"pointer",transition:"border .2s"}}
          onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(200,169,97,.3)"} onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          <span style={{fontSize:14,color:"var(--text2)"}}>Upload front & back photos</span>
          <span style={{fontSize:11,color:"var(--text3)"}}>PNG, JPG — up to 10MB each</span>
          <input type="file" accept="image/*" multiple onChange={handleImg} style={{display:"none"}}/>
        </label>
        {images.length>0&&(
          <div style={{display:"flex",gap:10,marginTop:14,flexWrap:"wrap"}}>
            {images.map((img,i)=>(
              <div key={i} style={{position:"relative",width:80,height:110,borderRadius:10,overflow:"hidden",border:"1px solid var(--border)"}}>
                <img src={img.data} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                <button onClick={()=>setImages(p=>p.filter((_,idx)=>idx!==i))} style={{position:"absolute",top:4,right:4,width:20,height:20,borderRadius:"50%",background:"rgba(0,0,0,.8)",border:"none",color:"#fff",cursor:"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="au4" style={{padding:"14px 18px",borderRadius:12,border:"1px solid rgba(251,191,36,.1)",background:"rgba(251,191,36,.03)",marginBottom:16,display:"flex",alignItems:"flex-start",gap:10}}>
        <span style={{fontSize:16,lineHeight:1.4,flexShrink:0}}>ℹ️</span>
        <p style={{fontSize:12,color:"var(--text2)",lineHeight:1.6,margin:0}}>
          <strong style={{color:"var(--gold2)"}}>Please note:</strong> Submitting a card does not guarantee a purchase. We review every submission and make offers based on our current buying criteria, market conditions, and inventory needs. We'll respond within 24 hours either way.
        </p>
      </div>

      <button className="btn-gold au4" onClick={submit} disabled={!canSubmit} style={{width:"100%",padding:18,borderRadius:14,fontSize:16}}>Submit for Review</button>
    </div>
  );
}

// ─── BULK SUBMISSION ───
function BulkSubmit({ onSubmit, onSingle }) {
  const [mode, setMode] = useState(null);
  const [rows, setRows] = useState([{category:"",gradingCompany:"",certNumber:"",cardName:"",grade:"",askingPrice:""}]);
  const [csvData, setCsvData] = useState([]);
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(0);

  const addRow = () => setRows(p=>[...p,{category:"",gradingCompany:"",certNumber:"",cardName:"",grade:"",askingPrice:""}]);
  const updateRow = (i,f,v) => setRows(p=>p.map((r,idx)=>idx===i?{...r,[f]:v}:r));
  const removeRow = i => setRows(p=>p.filter((_,idx)=>idx!==i));

  const handleCSV = e => {
    const file=e.target.files[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload = ev => {
      const lines=ev.target.result.split("\n").map(l=>l.split(",").map(c=>c.trim().replace(/^"|"$/g,"")));
      if(lines.length<2)return;
      const h=lines[0].map(x=>x.toLowerCase());
      const parsed=[];
      for(let i=1;i<lines.length;i++){
        const row=lines[i]; if(row.length<3)continue;
        const obj={};
        h.forEach((hd,j)=>{
          if(hd.includes("categ"))obj.category=(row[j]||"").toLowerCase().replace(/[^a-z]/g,"");
          else if(hd.includes("grad")&&hd.includes("comp"))obj.gradingCompany=row[j]||"";
          else if(hd.includes("cert"))obj.certNumber=row[j]||"";
          else if(hd.includes("card")||hd.includes("name")||hd.includes("desc"))obj.cardName=row[j]||"";
          else if(hd.includes("grade")&&!hd.includes("comp"))obj.grade=row[j]||"";
          else if(hd.includes("price")||hd.includes("ask"))obj.askingPrice=row[j]||"";
        });
        if(obj.cardName||obj.certNumber)parsed.push(obj);
      }
      setCsvData(parsed);
    };
    reader.readAsText(file);
  };

  const submitAll = () => {
    const cards=mode==="csv"?csvData:rows.filter(r=>r.certNumber&&r.cardName);
    if(!cards.length)return; onSubmit(cards); setCount(cards.length); setDone(true);
  };

  if(done) return (
    <div style={{textAlign:"center",padding:"100px 20px"}}>
      <div className="au" style={{width:72,height:72,borderRadius:"50%",background:"rgba(52,211,153,.08)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px",border:"1px solid rgba(52,211,153,.15)"}}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h2 className="au1" style={{fontSize:28,fontWeight:800,marginBottom:8,letterSpacing:"-0.03em"}}>{count} Cards Submitted!</h2>
      <p className="au2" style={{color:"var(--text2)",fontSize:15,maxWidth:460,margin:"0 auto 12px",lineHeight:1.7,fontWeight:300}}>We'll review your collection and get back to you within 24 hours.</p>
      <p className="au2" style={{color:"var(--text3)",fontSize:12,maxWidth:420,margin:"0 auto 32px",lineHeight:1.6}}>Offers are made on a per-card basis depending on our current buying criteria. Not all cards may receive an offer.</p>
      <button className="btn-gold au3" onClick={onSingle} style={{padding:"14px 28px",borderRadius:12,fontSize:14}}>Back to Submit</button>
    </div>
  );

  return (
    <div style={{paddingTop:40}}>
      <div className="au" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:36,flexWrap:"wrap",gap:16}}>
        <div>
          <h1 style={{fontSize:32,fontWeight:800,letterSpacing:"-0.03em",marginBottom:8}}>Bulk Submit</h1>
          <p style={{color:"var(--text2)",fontSize:15,fontWeight:300}}>Submit multiple graded cards at once via CSV or manual entry.</p>
        </div>
        <button className="btn-ghost" onClick={onSingle} style={{padding:"10px 20px",borderRadius:10,fontSize:13}}>← Single Card</button>
      </div>

      {!mode&&(
        <div className="au1 form-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div className="card-hover" onClick={()=>setMode("csv")} style={{padding:40,borderRadius:16,border:"1px solid var(--border)",background:"var(--surface)",textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:12}}>📄</div>
            <h3 style={{fontSize:18,fontWeight:700,marginBottom:8,letterSpacing:"-0.02em"}}>Upload CSV</h3>
            <p style={{fontSize:13,color:"var(--text2)",fontWeight:300,lineHeight:1.6}}>Upload a spreadsheet with columns: Category, Grading Company, Cert Number, Card Name, Grade, Asking Price</p>
          </div>
          <div className="card-hover" onClick={()=>setMode("manual")} style={{padding:40,borderRadius:16,border:"1px solid var(--border)",background:"var(--surface)",textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:12}}>✏️</div>
            <h3 style={{fontSize:18,fontWeight:700,marginBottom:8,letterSpacing:"-0.02em"}}>Manual Entry</h3>
            <p style={{fontSize:13,color:"var(--text2)",fontWeight:300,lineHeight:1.6}}>Add cards row by row. Great for smaller collections.</p>
          </div>
        </div>
      )}

      {mode==="csv"&&(
        <div className="au1">
          <div style={{padding:28,borderRadius:16,border:"1px solid var(--border)",background:"var(--surface)",marginBottom:16}}>
            <label style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,padding:"48px 20px",borderRadius:14,border:"2px dashed var(--border)",cursor:"pointer",transition:"border .2s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(200,169,97,.3)"} onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
              <span style={{fontSize:32}}>📊</span>
              <span style={{fontSize:15,color:"var(--text2)"}}>Drop your CSV file here or click to browse</span>
              <span className="mono" style={{fontSize:11,color:"var(--text3)"}}>Required columns: Category, Grading Company, Cert Number, Card Name, Grade</span>
              <input type="file" accept=".csv,.tsv,.txt" onChange={handleCSV} style={{display:"none"}}/>
            </label>
          </div>
          {csvData.length>0&&(
            <div style={{padding:28,borderRadius:16,border:"1px solid var(--border)",background:"var(--surface)",marginBottom:16}}>
              <div className="mono" style={{fontSize:11,color:"var(--gold)",letterSpacing:".1em",marginBottom:16}}>{csvData.length} CARDS PARSED</div>
              <div style={{maxHeight:300,overflow:"auto",borderRadius:10,border:"1px solid var(--border)"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:"var(--surface2)"}}>
                    {["Category","Grader","Cert #","Card Name","Grade","Ask"].map(h=>(
                      <th key={h} className="mono" style={{padding:"10px 12px",textAlign:"left",color:"var(--text3)",fontWeight:600,fontSize:10,letterSpacing:".08em",borderBottom:"1px solid var(--border)"}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{csvData.slice(0,20).map((r,i)=>(
                    <tr key={i} style={{borderBottom:"1px solid var(--border)"}}>
                      <td style={{padding:"8px 12px",color:"var(--text2)"}}>{r.category}</td>
                      <td style={{padding:"8px 12px",color:"var(--text2)"}}>{r.gradingCompany}</td>
                      <td className="mono" style={{padding:"8px 12px",color:"var(--text2)"}}>{r.certNumber}</td>
                      <td style={{padding:"8px 12px",color:"var(--text)"}}>{r.cardName}</td>
                      <td className="mono" style={{padding:"8px 12px",color:"var(--gold)"}}>{r.grade}</td>
                      <td className="mono" style={{padding:"8px 12px",color:"var(--text2)"}}>{r.askingPrice?`$${r.askingPrice}`:"—"}</td>
                    </tr>
                  ))}</tbody>
                </table>
                {csvData.length>20&&<div style={{padding:12,textAlign:"center",fontSize:12,color:"var(--text3)"}}>+ {csvData.length-20} more</div>}
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:12}}>
            <button className="btn-ghost" onClick={()=>{setMode(null);setCsvData([])}} style={{padding:"14px 24px",borderRadius:12,fontSize:14}}>← Back</button>
            <button className="btn-gold" onClick={submitAll} disabled={!csvData.length} style={{flex:1,padding:16,borderRadius:12,fontSize:15}}>Submit {csvData.length} Cards</button>
          </div>
        </div>
      )}

      {mode==="manual"&&(
        <div className="au1">
          <div style={{padding:28,borderRadius:16,border:"1px solid var(--border)",background:"var(--surface)",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <span className="mono" style={{fontSize:11,color:"var(--gold)",letterSpacing:".1em"}}>{rows.length} CARD{rows.length!==1?"S":""}</span>
              <button className="btn-ghost" onClick={addRow} style={{padding:"6px 14px",borderRadius:8,fontSize:12}}>+ Add Row</button>
            </div>
            <div style={{maxHeight:400,overflow:"auto"}}>
              {rows.map((r,i)=>(
                <div key={i} className="bulk-row" style={{display:"grid",gridTemplateColumns:"1fr .8fr 1fr 2fr .6fr .8fr 32px",gap:8,marginBottom:8,alignItems:"end"}}>
                  <div>{i===0&&<label className="label">Category</label>}<select className="sel" style={{padding:"10px 12px",fontSize:12}} value={r.category} onChange={e=>updateRow(i,"category",e.target.value)}><option value="">Cat...</option>{CATS.map(c=><option key={c.v} value={c.v}>{c.l}</option>)}</select></div>
                  <div>{i===0&&<label className="label">Grader</label>}<select className="sel" style={{padding:"10px 12px",fontSize:12}} value={r.gradingCompany} onChange={e=>updateRow(i,"gradingCompany",e.target.value)}><option value="">...</option>{GRADERS.map(g=><option key={g} value={g}>{g}</option>)}</select></div>
                  <div>{i===0&&<label className="label">Cert #</label>}<input className="input input-m" style={{padding:"10px 12px",fontSize:12}} placeholder="Cert #" value={r.certNumber} onChange={e=>updateRow(i,"certNumber",e.target.value)}/></div>
                  <div>{i===0&&<label className="label">Card Name</label>}<input className="input" style={{padding:"10px 12px",fontSize:12}} placeholder="Card description" value={r.cardName} onChange={e=>updateRow(i,"cardName",e.target.value)}/></div>
                  <div>{i===0&&<label className="label">Grade</label>}<input className="input input-m" style={{padding:"10px 12px",fontSize:12}} placeholder="10" value={r.grade} onChange={e=>updateRow(i,"grade",e.target.value)}/></div>
                  <div>{i===0&&<label className="label">Ask $</label>}<input className="input input-m" style={{padding:"10px 12px",fontSize:12}} placeholder="$" value={r.askingPrice} onChange={e=>updateRow(i,"askingPrice",e.target.value)}/></div>
                  <button onClick={()=>rows.length>1&&removeRow(i)} style={{width:32,height:38,borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"var(--text3)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,marginTop:i===0?22:0}}>✕</button>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:12}}>
            <button className="btn-ghost" onClick={()=>setMode(null)} style={{padding:"14px 24px",borderRadius:12,fontSize:14}}>← Back</button>
            <button className="btn-gold" onClick={submitAll} disabled={!rows.filter(r=>r.certNumber&&r.cardName).length} style={{flex:1,padding:16,borderRadius:12,fontSize:15}}>Submit {rows.filter(r=>r.certNumber&&r.cardName).length} Cards</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN DASHBOARD ───
function Dashboard({ subs, onSelect, onDelete }) {
  const [filt, setFilt] = useState("all");
  const list = filt==="all"?subs:subs.filter(s=>s.status===filt);
  const ct = {all:subs.length, pending:subs.filter(s=>s.status==="pending").length, offered:subs.filter(s=>s.status==="offered").length, accepted:subs.filter(s=>s.status==="accepted").length};
  const totalVal = subs.filter(s=>s.status==="accepted"&&s.offerPrice).reduce((a,s)=>a+(parseFloat(s.offerPrice)||0),0);
  const totalMargin = subs.filter(s=>s.status==="accepted"&&s.offerPrice&&s.fmv).reduce((a,s)=>{
    const r=COURTYARD[s.category]; if(!r)return a;
    return a+((parseFloat(s.fmv)*r.fmv/100)-parseFloat(s.offerPrice));
  },0);

  return (
    <div style={{paddingTop:40}}>
      <div className="au" style={{marginBottom:28}}>
        <h1 style={{fontSize:28,fontWeight:800,letterSpacing:"-0.03em",marginBottom:4}}>Dashboard</h1>
        <p style={{color:"var(--text3)",fontSize:14}}>{subs.length} submissions</p>
      </div>

      <div className="au1 dash-stats" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:24}}>
        {[
          {l:"Pending",v:ct.pending,c:"#FBBF24"},{l:"Offered",v:ct.offered,c:"#60A5FA"},
          {l:"Accepted",v:ct.accepted,c:"#34D399"},
          {l:"Revenue",v:"$"+totalVal.toLocaleString(undefined,{maximumFractionDigits:0}),c:"var(--gold2)"},
          {l:"Margin",v:"$"+totalMargin.toLocaleString(undefined,{maximumFractionDigits:0}),c:totalMargin>=0?"#34D399":"#F87171"},
        ].map((s,i)=>(
          <div key={i} style={{padding:"20px 16px",borderRadius:14,border:"1px solid var(--border)",background:"var(--surface)"}}>
            <div className="mono" style={{fontSize:10,color:"var(--text3)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:6}}>{s.l}</div>
            <div className="mono" style={{fontSize:22,fontWeight:700,color:s.c,letterSpacing:"-0.02em"}}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="au2" style={{display:"flex",gap:6,marginBottom:18,flexWrap:"wrap"}}>
        {["all","pending","offered","accepted","declined"].map(f=>(
          <button key={f} onClick={()=>setFilt(f)} style={{padding:"7px 16px",borderRadius:8,border:"1px solid "+(filt===f?"rgba(200,169,97,.3)":"var(--border)"),background:filt===f?"var(--gold-glow)":"transparent",color:filt===f?"var(--gold)":"var(--text3)",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"'Outfit',sans-serif",textTransform:"capitalize"}}>{f}</button>
        ))}
      </div>

      {!list.length?(
        <div style={{textAlign:"center",padding:"60px 20px",color:"var(--text3)"}}>No submissions</div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {list.map((sub,i)=>{
            const st=STATUSES[sub.status]; const cat=CATS.find(c=>c.v===sub.category);
            return (
              <div key={sub.id} className="card-hover" onClick={()=>onSelect(sub.id)}
                style={{padding:"14px 18px",borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)",display:"flex",justifyContent:"space-between",alignItems:"center",animation:`slideIn .3s ease ${i*.03}s both`}}>
                <div style={{display:"flex",alignItems:"center",gap:14,flex:1,minWidth:0}}>
                  {sub.images?.[0]?<img src={sub.images[0].data} alt="" style={{width:42,height:56,borderRadius:8,objectFit:"cover",border:"1px solid var(--border)",flexShrink:0}}/>
                    :<div style={{width:42,height:56,borderRadius:8,background:"var(--surface2)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text3)",fontSize:18,flexShrink:0}}>{cat?.icon||"🃏"}</div>}
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sub.cardName}</div>
                    <div style={{fontSize:12,color:"var(--text3)",marginTop:2}}>{cat?.l||"—"} · {sub.gradingCompany} · {sub.grade} · {sub.name||sub.lead?.name||"—"}</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:14,flexShrink:0}}>
                  {sub.offerPrice&&<span className="mono" style={{fontSize:14,fontWeight:600,color:"var(--gold)"}}>${sub.offerPrice}</span>}
                  <span className="badge" style={{color:st.c,background:st.bg}}>{st.l}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ADMIN DETAIL + MARGIN CALCULATOR ───
function Detail({ sub, onUpdate, onBack, onDelete }) {
  const [fmv,setFmv]=useState(sub.fmv||"");
  const [offer,setOffer]=useState(sub.offerPrice||"");
  const [notes,setNotes]=useState(sub.notes||"");
  const [conf,setConf]=useState(sub.confidence||"3");

  const rate=COURTYARD[sub.category];
  const fN=parseFloat(fmv)||0, oN=parseFloat(offer)||0, cN=parseInt(conf)||3;
  const lowC=cN<=2;
  const inRange=rate&&fN>=rate.min&&fN<=(lowC?rate.lowConf:rate.max);
  const cpay=inRange?fN*rate.fmv/100:null;
  const margin=cpay&&oN?cpay-oN:null;
  const mPct=margin&&oN?(margin/oN)*100:null;

  const doSave = status => onUpdate({fmv,offerPrice:offer,notes,confidence:conf,status:status||sub.status});
  const cat=CATS.find(c=>c.v===sub.category);
  const st=STATUSES[sub.status];

  return (
    <div style={{paddingTop:40}}>
      <button className="btn-ghost" onClick={onBack} style={{padding:"8px 16px",borderRadius:8,fontSize:13,marginBottom:28}}>← Dashboard</button>

      <div className="au detail-header" style={{display:"flex",gap:24,marginBottom:28}}>
        {sub.images?.[0]&&<img src={sub.images[0].data} alt="" style={{width:120,height:164,borderRadius:14,objectFit:"cover",border:"1px solid var(--border)"}}/>}
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,flexWrap:"wrap"}}>
            <h2 style={{fontSize:24,fontWeight:800,letterSpacing:"-0.03em",margin:0}}>{sub.cardName}</h2>
            <span className="badge" style={{color:st.c,background:st.bg}}>{st.l}</span>
          </div>
          <div className="form-grid-2" style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"6px 28px",fontSize:13,color:"var(--text2)"}}>
            <div><span style={{color:"var(--text3)"}}>Category:</span> {cat?.icon} {cat?.l}</div>
            <div><span style={{color:"var(--text3)"}}>Grader:</span> {sub.gradingCompany}</div>
            <div><span style={{color:"var(--text3)"}}>Cert #:</span> <span className="mono">{sub.certNumber}</span></div>
            <div><span style={{color:"var(--text3)"}}>Grade:</span> <span className="mono">{sub.grade}</span></div>
            <div><span style={{color:"var(--text3)"}}>Seller:</span> {sub.name||sub.lead?.name}</div>
            <div><span style={{color:"var(--text3)"}}>Email:</span> {sub.email||sub.lead?.email}</div>
            {(sub.phone||sub.lead?.phone)&&<div><span style={{color:"var(--text3)"}}>Phone:</span> {sub.phone||sub.lead?.phone}</div>}
            {sub.askingPrice&&<div><span style={{color:"var(--text3)"}}>Asking:</span> <span className="mono">${sub.askingPrice}</span></div>}
            {sub.lead?.source&&<div><span style={{color:"var(--text3)"}}>Source:</span> {sub.lead.source}</div>}
          </div>
        </div>
      </div>

      {sub.images?.length>1&&(
        <div style={{display:"flex",gap:10,marginBottom:24,overflowX:"auto"}}>
          {sub.images.map((img,i)=><img key={i} src={img.data} alt="" style={{width:100,height:140,borderRadius:12,objectFit:"cover",border:"1px solid var(--border)",flexShrink:0}}/>)}
        </div>
      )}

      {/* MARGIN CALCULATOR */}
      <div className="au1" style={{padding:28,borderRadius:16,border:"1px solid rgba(200,169,97,.15)",background:"linear-gradient(180deg,rgba(200,169,97,.03) 0%,var(--surface) 100%)",marginBottom:16,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,var(--gold),transparent)",opacity:.3}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:8}}>
          <div>
            <div className="mono" style={{fontSize:11,color:"var(--gold)",letterSpacing:".1em"}}>MARGIN CALCULATOR</div>
            <div style={{fontSize:12,color:"var(--text3)",marginTop:4}}>
              {cat?.l} → Courtyard pays <span className="mono" style={{color:"var(--gold2)"}}>{rate?.fmv}%</span> FMV
              ({lowC?`$${rate?.min}–$${rate?.lowConf} low conf`:`$${rate?.min}–$${rate?.max}`})
            </div>
          </div>
        </div>

        <div className="form-grid-3" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:18}}>
          <div><label className="label">FMV Estimate *</label><div style={{position:"relative"}}><span className="mono" style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"var(--text3)",fontSize:13}}>$</span><input className="input input-m" style={{paddingLeft:28,background:"rgba(0,0,0,.3)"}} value={fmv} onChange={e=>setFmv(e.target.value)}/></div></div>
          <div><label className="label">Your Offer *</label><div style={{position:"relative"}}><span className="mono" style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"var(--text3)",fontSize:13}}>$</span><input className="input input-m" style={{paddingLeft:28,background:"rgba(0,0,0,.3)"}} value={offer} onChange={e=>setOffer(e.target.value)}/></div></div>
          <div><label className="label">Confidence</label><select className="sel" style={{background:"rgba(0,0,0,.3)"}} value={conf} onChange={e=>setConf(e.target.value)}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}{n<=2?" (low range)":""}</option>)}</select></div>
        </div>

        <div className="form-grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          <div style={{padding:16,borderRadius:12,background:"rgba(0,0,0,.3)",border:"1px solid var(--border)"}}>
            <div className="mono" style={{fontSize:10,color:"var(--text3)",letterSpacing:".08em",marginBottom:6}}>COURTYARD PAYS</div>
            <div className="mono" style={{fontSize:24,fontWeight:700,color:cpay!==null?"var(--gold2)":"var(--red)"}}>{cpay!==null?`$${cpay.toFixed(2)}`:"Out of range"}</div>
          </div>
          <div style={{padding:16,borderRadius:12,background:"rgba(0,0,0,.3)",border:"1px solid var(--border)"}}>
            <div className="mono" style={{fontSize:10,color:"var(--text3)",letterSpacing:".08em",marginBottom:6}}>YOUR MARGIN</div>
            <div className="mono" style={{fontSize:24,fontWeight:700,color:margin>0?"var(--green)":margin<0?"var(--red)":"var(--text3)"}}>{margin!==null?`${margin>=0?"+":""}$${margin.toFixed(2)}`:"—"}</div>
          </div>
          <div style={{padding:16,borderRadius:12,background:"rgba(0,0,0,.3)",border:"1px solid var(--border)"}}>
            <div className="mono" style={{fontSize:10,color:"var(--text3)",letterSpacing:".08em",marginBottom:6}}>MARGIN %</div>
            <div className="mono" style={{fontSize:24,fontWeight:700,color:mPct>0?"var(--green)":mPct<0?"var(--red)":"var(--text3)"}}>{mPct!==null?`${mPct.toFixed(1)}%`:"—"}</div>
          </div>
        </div>

        {cpay===null&&fN>0&&(
          <div style={{marginTop:14,padding:"12px 16px",borderRadius:10,background:"rgba(248,113,113,.06)",border:"1px solid rgba(248,113,113,.12)",fontSize:12,color:"#FCA5A5"}}>
            FMV ${fmv} is outside Courtyard's range for {cat?.l}. Contact Cory for large sheets: 208 405 5000
          </div>
        )}
      </div>

      <div className="au2" style={{padding:28,borderRadius:16,border:"1px solid var(--border)",background:"var(--surface)",marginBottom:24}}>
        <label className="label">Internal Notes</label>
        <textarea className="input" value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="Comp sales, condition notes, etc." style={{resize:"vertical"}}/>
      </div>

      <div className="au3" style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <button className="btn-ghost" onClick={()=>doSave()} style={{padding:"12px 22px",borderRadius:10,fontSize:13}}>Save</button>
        <button className="btn-gold" onClick={()=>doSave("offered")} disabled={!offer} style={{padding:"12px 22px",borderRadius:10,fontSize:13,opacity:offer?1:.3}}>Mark Offered · ${offer||"—"}</button>
        <button onClick={()=>doSave("accepted")} style={{padding:"12px 22px",borderRadius:10,border:"none",background:"rgba(52,211,153,.1)",color:"var(--green)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Accepted</button>
        <button onClick={()=>doSave("declined")} style={{padding:"12px 22px",borderRadius:10,border:"none",background:"rgba(248,113,113,.08)",color:"var(--red)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Declined</button>
        <button onClick={onDelete} style={{padding:"12px 22px",borderRadius:10,border:"1px solid rgba(248,113,113,.15)",background:"transparent",color:"var(--text3)",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"'Outfit',sans-serif",marginLeft:"auto"}}>Delete</button>
      </div>
    </div>
  );
}
