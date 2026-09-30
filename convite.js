(function(){
  function esperar(ms){return new Promise(function(r){setTimeout(r,ms)})}
  function vibrar(){if(navigator.vibrate)navigator.vibrate(40)}

  /* =====================================================================
     SOM — usa arquivos se existirem na mesma pasta; senão gera no navegador
     ===================================================================== */
  var SONS={musica:'musicadefundo.mp3',giz:'giz.mp3',clique:'clique.mp3',falso:'',erro:'',destrava:'',luz:'',susto:'susto.mp3',telefone:'fonetocando.mp3',voz:'voz_jigsaw.mp3',vento:'somvento.mp3'};

  var SOM=(function(){
    var ctx=null,mestre=null,gMusica=null,gEfeitos=null,ruido=null;
    var mudo=false,musicaOn=false,ativos=[],arqMusica=null,pools={},falhou={},timers=[];

    function criarCtx(){
      var AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return false;
      ctx=new AC();
      mestre=ctx.createGain();mestre.gain.value=mudo?0:1;mestre.connect(ctx.destination);
      gMusica=ctx.createGain();gMusica.gain.value=0;gMusica.connect(mestre);
      gEfeitos=ctx.createGain();gEfeitos.gain.value=.9;gEfeitos.connect(mestre);
      var n=ctx.sampleRate*2,buf=ctx.createBuffer(1,n,ctx.sampleRate),d=buf.getChannelData(0);
      for(var i=0;i<n;i++)d[i]=Math.random()*2-1;
      ruido=buf;
      return true;
    }
    function arq(nome){return !!(SONS[nome]&&pools[nome]&&!falhou[nome])}
    function prepararArquivos(){
      ['giz','clique','falso','erro','destrava','luz','susto'].forEach(function(nome){
        if(!SONS[nome])return;
        var qtd=nome==='giz'?2:(nome==='clique'?3:1),lista=[];
        for(var i=0;i<qtd;i++){
          var a=new Audio(SONS[nome]);a.preload='auto';
          a.addEventListener('error',function(){falhou[nome]=true});
          lista.push(a);
          a.muted=true;
          var p=a.play();
          if(p&&p.then)p.then(function(){a.pause();a.currentTime=0;a.muted=mudo}).catch(function(){a.muted=mudo});
        }
        pools[nome]={lista:lista,i:0};
      });
    }
    function tocar(nome,limite,vol){
      var p=pools[nome];if(!p)return;
      var a=p.lista[p.i];p.i=(p.i+1)%p.lista.length;
      try{a.pause();a.currentTime=0}catch(e){}
      a.muted=mudo;a.volume=(vol==null?1:vol);
      var pr=a.play();if(pr&&pr.catch)pr.catch(function(){});
      if(limite){timers.push(setTimeout(function(){a.pause()},limite*1000))}
    }
    function tom(t,f0,f1,dur,vol,tipo,destino){
      var o=ctx.createOscillator(),g=ctx.createGain();
      o.type=tipo||'sine';
      o.frequency.setValueAtTime(f0,t);
      o.frequency.exponentialRampToValueAtTime(Math.max(f1,1),t+dur);
      g.gain.setValueAtTime(0.0001,t);
      g.gain.exponentialRampToValueAtTime(vol,t+Math.min(.01,dur/3));
      g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      o.connect(g);g.connect(destino||gEfeitos);
      o.start(t);o.stop(t+dur+.05);
    }
    function sopro(t,dur,freq,q,vol,destino){
      var s=ctx.createBufferSource();s.buffer=ruido;
      var f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=q;
      var g=ctx.createGain();
      g.gain.setValueAtTime(0.0001,t);
      g.gain.exponentialRampToValueAtTime(vol,t+.004);
      g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      s.connect(f);f.connect(g);g.connect(destino||gEfeitos);
      s.start(t,Math.random());s.stop(t+dur+.05);
    }
    function musicaGerada(){
      if(!ctx)return;
      var t=ctx.currentTime;
      gMusica.gain.setValueAtTime(0,t);gMusica.gain.linearRampToValueAtTime(.55,t+4);
      var pf=ctx.createBiquadFilter();pf.type='lowpass';pf.frequency.value=240;pf.Q.value=3;
      var pg=ctx.createGain();pg.gain.value=.3;pf.connect(pg);pg.connect(gMusica);
      [[55,.5],[55.9,.5],[58.27,.22],[82.7,.16]].forEach(function(n){
        var o=ctx.createOscillator(),g=ctx.createGain();
        o.type='sawtooth';o.frequency.value=n[0];g.gain.value=n[1];
        o.connect(g);g.connect(pf);o.start();
      });
      var lfo=ctx.createOscillator(),lg=ctx.createGain();
      lfo.frequency.value=.07;lg.gain.value=110;lfo.connect(lg);lg.connect(pf.frequency);lfo.start();
      var ag=ctx.createGain();ag.gain.value=.02;ag.connect(gMusica);
      [311.13,440].forEach(function(f){var o=ctx.createOscillator();o.type='sine';o.frequency.value=f;o.connect(ag);o.start()});
      var tl=ctx.createOscillator(),tg=ctx.createGain();
      tl.frequency.value=.11;tg.gain.value=.018;tl.connect(tg);tg.connect(ag.gain);tl.start();
      var vs=ctx.createBufferSource();vs.buffer=ruido;vs.loop=true;
      var vf=ctx.createBiquadFilter();vf.type='bandpass';vf.frequency.value=520;vf.Q.value=.8;
      var vg=ctx.createGain();vg.gain.value=.07;
      var vl=ctx.createOscillator(),vlg=ctx.createGain();vl.frequency.value=.05;vlg.gain.value=280;
      vl.connect(vlg);vlg.connect(vf.frequency);vl.start();
      vs.connect(vf);vf.connect(vg);vg.connect(gMusica);vs.start();
      var bf=ctx.createBiquadFilter();bf.type='lowpass';bf.frequency.value=180;bf.connect(gMusica);
      setInterval(function(){
        var t0=ctx.currentTime+.05;
        tom(t0,66,38,.16,.9,'sine',bf);tom(t0+.24,60,36,.16,.6,'sine',bf);
      },1750);
    }
    function musica(){
      if(musicaOn)return;musicaOn=true;
      if(SONS.musica){
        arqMusica=new Audio(SONS.musica);
        arqMusica.loop=true;arqMusica.volume=.32;arqMusica.muted=mudo;
        arqMusica.addEventListener('error',function(){arqMusica=null;musicaGerada()});
        var p=arqMusica.play();if(p&&p.catch)p.catch(function(){});
        return;
      }
      musicaGerada();
    }
    function giz(atraso,dur,vol){
      if(arq('giz')){timers.push(setTimeout(function(){tocar('giz',dur,vol==null?1:Math.min(1,vol*1.6))},(atraso||0)*1000));return}
      if(!ctx)return;
      var t0=ctx.currentTime+(atraso||0),fim=t0+dur,v=vol||.5;
      var s=ctx.createBufferSource();s.buffer=ruido;s.loop=true;
      var bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=3000;bp.Q.value=.9;
      var hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=1400;
      var g=ctx.createGain();g.gain.setValueAtTime(0,t0);
      s.connect(bp);bp.connect(hp);hp.connect(g);g.connect(gEfeitos);
      var t=t0;
      while(t<fim){
        var seg=.07+Math.random()*.12;
        bp.frequency.setValueAtTime(2200+Math.random()*2600,t);
        g.gain.linearRampToValueAtTime(v*(.35+Math.random()*.65),t+seg*.4);
        g.gain.linearRampToValueAtTime(v*.12,t+seg);
        t+=seg;
      }
      g.gain.linearRampToValueAtTime(0,fim+.05);
      s.start(t0,Math.random());s.stop(fim+.1);
      var item={s:s,g:g};ativos.push(item);
      s.onended=function(){ativos=ativos.filter(function(x){return x!==item})};
    }
    function parar(){
      timers.forEach(clearTimeout);timers=[];
      if(pools.giz)pools.giz.lista.forEach(function(a){try{a.pause()}catch(e){}});
      if(!ctx)return;
      ativos.forEach(function(x){try{x.g.gain.cancelScheduledValues(ctx.currentTime);x.g.gain.setTargetAtTime(0,ctx.currentTime,.03);x.s.stop(ctx.currentTime+.15)}catch(e){}});
      ativos=[];
    }
    function clique(){if(arq('clique')){tocar('clique');return}if(!ctx)return;var t=ctx.currentTime;sopro(t,.05,1800,2,.7);tom(t,230,120,.09,.55,'sine')}
    function tecla(){if(arq('clique')){tocar('clique',null,.6);return}if(!ctx)return;var t=ctx.currentTime;sopro(t,.035,3200,3,.4);tom(t,700,420,.05,.18,'triangle')}
    function anota(){giz(0,.45,.45)}
    function falso(){if(arq('falso')){tocar('falso');return}clique();if(!arq('clique')&&ctx)tom(ctx.currentTime+.03,95,48,.4,.6,'sine')}
    function erro(){if(arq('erro')){tocar('erro');return}if(!ctx)return;var t=ctx.currentTime;var f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=500;f.connect(gEfeitos);tom(t,120,100,.4,.5,'sawtooth',f);tom(t,127,105,.4,.4,'sawtooth',f)}
    function destrava(){if(arq('destrava')){tocar('destrava');return}if(!ctx)return;var t=ctx.currentTime;sopro(t,.03,4500,4,.8);tom(t,1300,900,.07,.3,'triangle');sopro(t+.2,.05,900,2,.9);tom(t+.2,130,55,.25,.8,'sine')}
    function luz(){if(arq('luz')){tocar('luz');return}if(!ctx)return;var t=ctx.currentTime,dur=2.8;var s=ctx.createBufferSource();s.buffer=ruido;s.loop=true;var f=ctx.createBiquadFilter();f.type='bandpass';f.Q.value=1.2;f.frequency.setValueAtTime(300,t);f.frequency.exponentialRampToValueAtTime(4200,t+dur);var g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.55,t+dur*.85);g.gain.linearRampToValueAtTime(0,t+dur+.4);s.connect(f);f.connect(g);g.connect(gEfeitos);s.start(t);s.stop(t+dur+.5);tom(t,180,900,dur,.22,'sine')}
    function susto(){if(arq('susto')){tocar('susto');return}if(!ctx)return;var t=ctx.currentTime;tom(t,900,60,.35,.9,'sawtooth');sopro(t,.12,2200,1.5,.8)}
    function iniciar(){if(!ctx)criarCtx();if(ctx&&ctx.state==='suspended')ctx.resume();prepararArquivos();musica()}
    function alternarMudo(){
      mudo=!mudo;
      if(mestre)mestre.gain.setTargetAtTime(mudo?0:1,ctx.currentTime,.05);
      if(arqMusica)arqMusica.muted=mudo;
      Object.keys(pools).forEach(function(n){pools[n].lista.forEach(function(a){a.muted=mudo})});
      return mudo;
    }
    function volumeMusica(v,seg){if(gMusica&&ctx)gMusica.gain.setTargetAtTime(v,ctx.currentTime,(seg||1)/3);if(arqMusica)arqMusica.volume=Math.min(1,v)}
    document.addEventListener('visibilitychange',function(){
      if(document.hidden){if(ctx)ctx.suspend();if(arqMusica)arqMusica.pause()}
      else{if(ctx)ctx.resume();if(arqMusica&&musicaOn){var p=arqMusica.play();if(p&&p.catch)p.catch(function(){})}}
    });

    /* ---------- telefone tocando (loop de ring, gerado; usa 'telefone.mp3' se existir) ---------- */
    var telInterval=null,telFonte=null;
    function telefoneTocar(){
      if(SONS.telefone){
        telFonte=new Audio(SONS.telefone);telFonte.loop=true;telFonte.muted=mudo;
        telFonte.addEventListener('error',function(){telFonte=null;telefoneToqueGerado()});
        var p=telFonte.play();if(p&&p.catch)p.catch(function(){});
        return;
      }
      telefoneToqueGerado();
    }
    function telefoneToqueGerado(){
      if(!ctx)return;
      function um(){
        var t=ctx.currentTime;
        [0,.35].forEach(function(off){tom(t+off,1050,1050,.28,.5,'sine');tom(t+off,1350,1350,.28,.32,'sine')});
      }
      um();
      telInterval=setInterval(um,2000);
    }
    function telefoneParar(){
      if(telInterval){clearInterval(telInterval);telInterval=null}
      if(telFonte){try{telFonte.pause()}catch(e){}telFonte=null}
    }

    /* ---------- vento ambiente do jardim (loop; usa 'somvento.mp3' se existir) ---------- */
    var ventoFonte=null,ventoNo=null;
    function ventoTocar(){
      if(SONS.vento){
        ventoFonte=new Audio(SONS.vento);ventoFonte.loop=true;ventoFonte.muted=mudo;ventoFonte.volume=.55;
        ventoFonte.addEventListener('error',function(){ventoFonte=null});
        var p=ventoFonte.play();if(p&&p.catch)p.catch(function(){});
        return;
      }
      if(!ctx)return;
      var s=ctx.createBufferSource();s.buffer=ruido;s.loop=true;
      var f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=500;f.Q.value=.6;
      var g=ctx.createGain();g.gain.value=.16;
      s.connect(f);f.connect(g);g.connect(gEfeitos);s.start();
      ventoNo={s:s,g:g};
    }
    function ventoParar(){
      if(ventoFonte){try{ventoFonte.pause()}catch(e){}ventoFonte=null}
      if(ventoNo){try{ventoNo.s.stop()}catch(e){}ventoNo=null}
    }

    /* ---------- voz filtrada como se saísse de um alto-falante de telefone ---------- */
    var vozEl=null,vozNodes=null;
    function vozTelefone(url,aoTerminar){
      if(!ctx){if(aoTerminar)aoTerminar();return null}
      var a=new Audio(url);a.crossOrigin='anonymous';
      var terminou=false;
      function fim(){if(terminou)return;terminou=true;if(aoTerminar)aoTerminar()}
      a.addEventListener('ended',fim);
      a.addEventListener('error',fim);
      try{
        var src=ctx.createMediaElementSource(a);
        var hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=400;
        var lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2900;
        var shaper=ctx.createWaveShaper();
        var curve=new Float32Array(256);
        for(var i=0;i<256;i++){var x=i/128-1;curve[i]=Math.tanh(x*2.1)}
        shaper.curve=curve;
        var g=ctx.createGain();g.gain.value=1.15;
        src.connect(hp);hp.connect(lp);lp.connect(shaper);shaper.connect(g);g.connect(gEfeitos);
        vozNodes={src:src,hp:hp,lp:lp,shaper:shaper,g:g};
      }catch(e){ /* se a fonte não puder ser filtrada (ex.: restrição do arquivo local), toca normal */ }
      a.muted=mudo;
      var p=a.play();if(p&&p.catch)p.catch(fim);
      vozEl=a;
      return a;
    }
    function vozPararSeTocando(){
      if(vozEl){try{vozEl.pause()}catch(e){}vozEl=null}
    }

    return {iniciar:iniciar,giz:giz,parar:parar,clique:clique,tecla:tecla,anota:anota,falso:falso,erro:erro,destrava:destrava,luz:luz,susto:susto,alternarMudo:alternarMudo,volumeMusica:volumeMusica,telefoneTocar:telefoneTocar,telefoneParar:telefoneParar,vozTelefone:vozTelefone,vozPararSeTocando:vozPararSeTocando,ventoTocar:ventoTocar,ventoParar:ventoParar};
  })();

  /* util: linhas no estilo "escrito no vidro" (usado no espelho e no escape room) */
  function montarLinhas(linhas,tam,extra){
    var el=document.createElement('div');
    el.className='frase';
    var i=0,fim=0;
    linhas.forEach(function(t,idx){
      if(!t){var e=document.createElement('span');e.className='esp';el.appendChild(e);return}
      var s=document.createElement('span');
      s.className='ln '+tam+((extra&&extra[idx])?' '+extra[idx]:'');
      s.textContent=t;
      var atraso=i*0.95, dur=1.15;
      s.style.setProperty('--d',atraso+'s');
      s.style.setProperty('--dur',dur+'s');
      s.style.setProperty('--dx',(12+((i*37+11)%68))+'%');
      SOM.giz(atraso,dur*.92,.5);
      fim=Math.max(fim,atraso+dur);
      i++;el.appendChild(s);
    });
    return {el:el,fim:fim};
  }

  /* =====================================================================
     BLOCO 1 · ESPELHO
     ===================================================================== */
  var espelho=document.getElementById('espelho');
  var acoesEspelho=document.getElementById('acoes-espelho');
  var FRASES=[
    {tam:'grande',pausa:2.4,linhas:['NÃO DEVERIA','TER VINDO.']},
    {tam:'grande',pausa:2.4,linhas:['MAS AGORA','JÁ É TARDE.']},
    {tam:'pequena',pausa:0,linhas:['Uma noite','de Halloween.','','Um jogo.','','Você teria','coragem de','continuar?']}
  ];
  var rodada=0;
  async function iniciarEspelho(){
    var minha=++rodada;
    espelho.innerHTML='';acoesEspelho.classList.remove('ligada');
    await esperar(1900); if(minha!==rodada)return;
    for(var k=0;k<FRASES.length;k++){
      var f=FRASES[k], m=montarLinhas(f.linhas,f.tam);
      espelho.appendChild(m.el);
      if(k<FRASES.length-1){
        await esperar((m.fim+f.pausa)*1000); if(minha!==rodada)return;
        m.el.classList.add('sai');
        await esperar(1100); if(minha!==rodada)return;
        m.el.remove();
      }else{
        await esperar((m.fim+1.1)*1000); if(minha!==rodada)return;
        acoesEspelho.classList.add('ligada');
      }
    }
  }
  function pararEspelho(){rodada++;SOM.parar()}

  /* =====================================================================
     BLOCO 2 · ESCAPE ROOM
     ===================================================================== */
  var CODIGO='3817';
  var VIDEO_QUARTO='telacodigo.mp4'; // vídeo mostrado ao entrar no quarto de escape (arquivo na mesma pasta)
  var VIDEO_PORTA='portaabrindo.mp4';// vídeo da porta abrindo, tocado depois do código certo
  var TEXTO_INICIAL=['VOCÊ ESTÁ PRESO.','ENCONTRE O CÓDIGO.'];

  var elPontos=document.getElementById('pontos');
  var elBandeja=document.getElementById('bandeja');
  var elAviso=document.getElementById('aviso');
  var elIntro=document.getElementById('intro');
  var elLuz=document.getElementById('luz');
  var elVideo=document.getElementById('vid-quarto');
  var modalPista=document.getElementById('modal-pista');
  var cartao=document.getElementById('cartao');
  var modalTeclado=document.getElementById('modal-teclado');

  var PONTOS=[
    {id:'relogio',tipo:'pista',slot:0,dig:'3',nome:'Relógio',x:48.5,y:15,w:12,h:12},
    {id:'livros',tipo:'pista',slot:1,dig:'8',nome:'Livros',x:0,y:17,w:17.5,h:33},
    {id:'quadro',tipo:'pista',slot:2,dig:'1',nome:'Quadro',x:81,y:25,w:19,h:21},
    {id:'papeis',tipo:'pista',slot:3,dig:'7',nome:'Papéis',x:79,y:58.5,w:18,h:7.5},
    {id:'janela',tipo:'falso',nome:'Janela',txt:'Algo passou do outro lado do vidro.',x:17,y:22,w:12.5,h:31},
    {id:'boneca',tipo:'falso',nome:'Boneca',txt:'Ele estava olhando pra você.',x:13,y:64,w:24,h:16},
    {id:'pc',tipo:'falso',nome:'Computador',txt:'A tela mostrou seu rosto por um segundo.',x:81,y:48,w:19,h:10},
    {id:'bau',tipo:'falso',nome:'Baú',txt:'Trancado. A chave não está aqui.',x:70,y:80,w:30,h:17},
    {id:'porta',tipo:'porta',nome:'Cadeado da porta',x:52,y:45,w:20,h:8}
  ];
  var ZOOM={
    relogio:{legenda:'O ponteiro grande parou no 3.',svg:'<svg viewBox="0 0 300 300"><defs><radialGradient id="cf" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#d8d0bb"/><stop offset="1" stop-color="#a39a80"/></radialGradient></defs><circle cx="150" cy="150" r="132" fill="#2a1d12"/><circle cx="150" cy="150" r="118" fill="url(#cf)" stroke="#120c07" stroke-width="4"/><g stroke="#2a2418" stroke-width="3"><path d="M150 40v12M150 248v12M40 150h12M248 150h12"/></g><g font-size="24" fill="#2a2418" text-anchor="middle"><text x="150" y="80">XII</text><text x="150" y="234">VI</text><text x="66" y="159">IX</text></g><ellipse cx="228" cy="150" rx="30" ry="24" fill="none" stroke="#b3121a" stroke-width="4" transform="rotate(-8 228 150)"/><text x="228" y="159" font-size="24" fill="#b3121a" text-anchor="middle">III</text><path d="M150 150V96" stroke="#15120c" stroke-width="8" stroke-linecap="round"/><path d="M150 150H214" stroke="#15120c" stroke-width="5" stroke-linecap="round"/><circle cx="150" cy="150" r="9" fill="#15120c"/></svg>'},
    livros:{legenda:'Um livro fora do lugar. Na lombada, um número.',svg:'<svg viewBox="0 0 300 300"><g transform="rotate(-5 150 150)"><rect x="88" y="18" width="124" height="264" rx="7" fill="#4b3421" stroke="#1d130b" stroke-width="4"/><rect x="104" y="92" width="92" height="112" rx="3" fill="#b9a87c" stroke="#22160d" stroke-width="3"/><text x="150" y="176" font-size="78" fill="#b3121a" text-anchor="middle">8</text></g></svg>'},
    quadro:{legenda:'O quadro escondia um papel.',svg:'<svg viewBox="0 0 300 300"><g transform="rotate(4 150 150)"><rect x="48" y="36" width="204" height="228" fill="#d5c9a5" stroke="#8a7a52" stroke-width="2"/><text x="150" y="226" font-size="120" fill="#b3121a" text-anchor="middle">1</text></g></svg>'},
    papeis:{legenda:'Um bilhete rabiscado. Um número circulado.',svg:'<svg viewBox="0 0 300 300"><g transform="rotate(-4 150 150)"><rect x="52" y="30" width="196" height="240" fill="#d9ceac" stroke="#8a7a52" stroke-width="2"/><ellipse cx="150" cy="196" rx="52" ry="48" fill="none" stroke="#b3121a" stroke-width="5" transform="rotate(-6 150 196)"/><text x="150" y="226" font-size="84" fill="#b3121a" text-anchor="middle">7</text></g></svg>'}
  };

  var rodadaE=0,achados=[false,false,false,false],entrada='',avisouTodos=false,pendente=null;

  function aviso(txt){elAviso.classList.remove('mostra');void elAviso.offsetWidth;elAviso.textContent=txt;elAviso.classList.add('mostra')}
  function montarBandeja(){elBandeja.innerHTML='';for(var i=0;i<4;i++){var s=document.createElement('div');s.className='slot';s.innerHTML='<span class="dg">?</span>';elBandeja.appendChild(s)}}
  function preencherSlot(i,d){var s=elBandeja.children[i];s.classList.add('cheio');s.querySelector('.dg').textContent=d}

  function montarPontos(){
    elPontos.innerHTML='';
    PONTOS.forEach(function(p,i){
      var b=document.createElement('button');
      b.type='button';b.className='ponto'+(p.tipo==='porta'?' porta':'');
      b.setAttribute('aria-label',p.nome);
      b.style.left=p.x+'%';b.style.top=p.y+'%';b.style.width=p.w+'%';b.style.height=p.h+'%';
      b.style.setProperty('--pd','-'+((i*0.7)%2.8).toFixed(2)+'s');
      b.addEventListener('click',function(){clicarPonto(p,b)});
      elPontos.appendChild(b);
    });
  }
  function clicarPonto(p,b){
    if(p.tipo==='porta'){SOM.clique();abrirTeclado();return}
    b.classList.add('visto');
    if(p.tipo==='falso'){SOM.falso();aviso(p.txt);vibrar();return}
    SOM.clique();abrirPista(p);
  }
  function abrirPista(p){
    var z=ZOOM[p.id];
    cartao.innerHTML=z.svg+'<p>'+z.legenda+'</p><button class="btn-fino" type="button">Anotar</button>';
    cartao.querySelector('button').addEventListener('click',fecharPista);
    pendente=function(){
      if(!achados[p.slot]){achados[p.slot]=true;preencherSlot(p.slot,p.dig);SOM.anota()}
      if(achados.every(Boolean)&&!avisouTodos){
        avisouTodos=true;
        elPontos.querySelector('.porta').classList.add('forte');
        setTimeout(function(){aviso('Quatro números. Falta a porta.')},500);
      }
    };
    modalPista.classList.add('on');
  }
  function fecharPista(){modalPista.classList.remove('on');if(pendente){var f=pendente;pendente=null;f()}}
  modalPista.addEventListener('click',function(e){if(e.target===modalPista)fecharPista()});

  (function montarTeclado(){
    var teclas='';
    ['1','2','3','4','5','6','7','8','9','x','0','b'].forEach(function(k){
      var rot=k==='x'?'✕':(k==='b'?'⌫':k);
      teclas+='<button type="button" data-k="'+k+'" aria-label="'+rot+'">'+rot+'</button>';
    });
    modalTeclado.innerHTML='<div class="cartao"><div class="visor" id="visor"><span></span><span></span><span></span><span></span></div><p>Quatro números.</p><div class="grade">'+teclas+'</div></div>';
    modalTeclado.addEventListener('click',function(e){
      if(e.target===modalTeclado){fecharTeclado();return}
      var b=e.target.closest('button[data-k]'); if(!b)return;
      var k=b.getAttribute('data-k');SOM.tecla();
      if(k==='x')fecharTeclado();
      else if(k==='b'){entrada=entrada.slice(0,-1);atualizarVisor()}
      else if(entrada.length<4){entrada+=k;atualizarVisor();if(entrada.length===4)setTimeout(verificar,250)}
    });
  })();
  function atualizarVisor(){var sp=modalTeclado.querySelectorAll('.visor span');for(var i=0;i<4;i++)sp[i].textContent=entrada[i]||''}
  function abrirTeclado(){entrada='';atualizarVisor();modalTeclado.classList.add('on')}
  function fecharTeclado(){modalTeclado.classList.remove('on')}

  async function verificar(){
    var minha=rodadaE;
    if(entrada===CODIGO){
      fecharTeclado();
      await esperar(500); if(minha!==rodadaE)return;
      aviso('Clic.');SOM.destrava();
      await esperar(1100); if(minha!==rodadaE)return;
      SOM.luz();elLuz.classList.add('on');
      await esperar(1600); if(minha!==rodadaE)return;
      if(VIDEO_PORTA){
        elVideo.style.opacity='1';elVideo.src=VIDEO_PORTA;elVideo.style.display='block';elVideo.muted=false;
        try{await elVideo.play()}catch(e){elVideo.muted=true;try{await elVideo.play()}catch(e2){}}
        await new Promise(function(r){elVideo.onended=r;setTimeout(r,6000)});
        if(minha!==rodadaE)return;
        elVideo.style.opacity='0';
        await esperar(400); if(minha!==rodadaE)return;
      }else{
        await esperar(1700); if(minha!==rodadaE)return;
      }
      irPara('jigsaw');
    }else{
      var v=modalTeclado.querySelector('.visor');
      v.classList.add('erro');SOM.erro();vibrar();
      await esperar(700);
      v.classList.remove('erro');entrada='';atualizarVisor();
    }
  }
  function resetarEscape(){
    achados=[false,false,false,false];entrada='';avisouTodos=false;pendente=null;
    modalPista.classList.remove('on');modalTeclado.classList.remove('on');
    elIntro.classList.remove('on');elIntro.innerHTML='';
    elBandeja.classList.remove('on');elPontos.classList.remove('ligado');
    elAviso.classList.remove('mostra');elLuz.classList.remove('on');
    elVideo.style.display='none';elVideo.style.opacity='1';
    montarBandeja();montarPontos();
  }
  async function iniciarEscape(){
    var minha=++rodadaE;
    resetarEscape();
    await esperar(1500); if(minha!==rodadaE)return;
    if(VIDEO_QUARTO){
      elVideo.src=VIDEO_QUARTO;elVideo.style.display='block';elVideo.style.opacity='1';elVideo.muted=false;
      try{await elVideo.play()}catch(e){elVideo.muted=true;try{await elVideo.play()}catch(e2){}}
      await new Promise(function(r){elVideo.onended=r;setTimeout(r,20000)});
      if(minha!==rodadaE)return;
      try{elVideo.pause()}catch(e){} // congela no último frame — fica de fundo atrás do texto e das pistas
    }
    var m=montarLinhas(TEXTO_INICIAL,'grande',[null,'verm']);
    elIntro.appendChild(m.el);elIntro.classList.add('on');
    await esperar((m.fim+1.7)*1000); if(minha!==rodadaE)return;
    elIntro.classList.remove('on');
    elBandeja.classList.add('on');elPontos.classList.add('ligado');
  }
  function pararEscape(){rodadaE++;SOM.parar();modalPista.classList.remove('on');modalTeclado.classList.remove('on')}

  /* =====================================================================
     BLOCO 3 · JIGSAW + JARDIM
     ===================================================================== */
  var VIDEO_JIGSAW='videojogsaw.mp4';// arquivo na mesma pasta
  var vidJigsaw=document.getElementById('vid-jigsaw');
  var jigsawLegenda=document.getElementById('jigsaw-legenda');
  var rodadaJ=0;

  async function iniciarJigsaw(){
    var minha=++rodadaJ;
    jigsawLegenda.textContent='';
    vidJigsaw.muted=false;vidJigsaw.src=VIDEO_JIGSAW;
    var tocou=true;
    try{await vidJigsaw.play()}catch(e){
      try{vidJigsaw.muted=true;await vidJigsaw.play()}catch(e2){tocou=false}
    }
    if(!tocou){
      // sem vídeo disponível ainda: mostra a legenda sozinha e segue (música de fundo continua)
      var m=montarLinhas(['"Aonde você pensa','que vai?"','','"Eu tenho mais','um jogo','para você."'],'pequena',['verm','verm']);
      jigsawLegenda.appendChild(m.el);
      await esperar((m.fim+2.2)*1000); if(minha!==rodadaJ)return;
      irPara('jardim');return;
    }
    // o vídeo já tem música própria: abaixa a música de fundo enquanto ele toca
    SOM.volumeMusica(0,.5);
    await new Promise(function(r){vidJigsaw.onended=r;setTimeout(r,9000)});
    if(minha!==rodadaJ)return;
    SOM.volumeMusica(.32,1);
    irPara('jardim');
  }
  function pararJigsaw(){rodadaJ++;try{vidJigsaw.pause()}catch(e){}SOM.volumeMusica(.32,.3)}

  /* --- Jardim: 3 bifurcações em sequência --- */
  var JARDIM_IMGS={gramado:'jardim1.png',bif1:'jardim2.png',corredor:'jardim3.png'};
  // Por enquanto só há 1 bifurcação de verdade (a imagem com os dois caminhos visíveis).
  // A segunda imagem do jardim vira um corredor de passagem (sem escolha) antes da caixa de correio.
  // Quando você tiver a 2ª e a 3ª bifurcação de verdade, é só somar itens aqui (img, certo, personagem).
  var BIFURCACOES=[
    {img:'bif1',certo:'dir'}
  ];
  var CORREDOR_IMG='corredor';
  var STICKERS={
    jason:'jason.png',
    freddy:'fredy.png',
    it:'it.png',
    ghostface:'ghost.png'
  };
  function personagemAleatorio(){
    var chaves=Object.keys(STICKERS);
    return chaves[Math.floor(Math.random()*chaves.length)];
  }

  var imgJardim=document.getElementById('img-jardim');
  var jardimTexto=document.getElementById('jardim-texto');
  var caminhosEl=document.getElementById('caminhos');
  var btnEsq=caminhosEl.querySelector('.esq');
  var btnDir=caminhosEl.querySelector('.dir');
  var elFlash=document.getElementById('flash');
  var elGritou=document.getElementById('gritou');
  var stickerWrap=document.getElementById('sticker-wrap');
  var stickerImg=document.getElementById('sticker-img');
  var elPegou=document.getElementById('pegou');
  var btnTentar=document.getElementById('btn-tentar');

  var rodadaG=0, etapa=0;

  function mostrarTextoJardim(linhas,sub){
    jardimTexto.innerHTML='';
    var t=document.createElement('div');
    t.className='jardim-titulo';
    linhas.forEach(function(l,i){t.innerHTML+=(i?'<br>':'')+l});
    jardimTexto.appendChild(t);
    if(sub){var s=document.createElement('div');s.className='jardim-sub';s.textContent=sub;jardimTexto.appendChild(s)}
  }

  // pré-carrega os 3 stickers assim que o jardim começa, para o susto aparecer sem atraso
  var stickersProntos={};
  function precarregarStickers(){
    Object.keys(STICKERS).forEach(function(nome){
      var im=new Image();im.src=STICKERS[nome];stickersProntos[nome]=im;
    });
  }

  async function iniciarJardim(){
    var minha=++rodadaG;
    etapa=0;
    imgJardim.src=JARDIM_IMGS.gramado;
    caminhosEl.style.display='none';
    elGritou.classList.remove('on');elPegou.classList.remove('on');
    precarregarStickers();
    SOM.ventoTocar();
    mostrarTextoJardim(['SEGUNDO JOGO'],'');
    await esperar(2200); if(minha!==rodadaG)return;
    mostrarTextoJardim(['ATRAVESSE O JARDIM.'],'Escolha com cuidado o seu caminho.');
    await esperar(2400); if(minha!==rodadaG)return;
    jardimTexto.innerHTML='';
    proximaBifurcacao();
  }
  async function proximaBifurcacao(){
    if(etapa>=BIFURCACOES.length){
      // corredor de passagem (sem escolha) antes da caixa de correio
      var minha=rodadaG;
      caminhosEl.style.display='none';
      imgJardim.src=JARDIM_IMGS[CORREDOR_IMG];
      await esperar(2600); if(minha!==rodadaG)return;
      SOM.ventoParar();
      irPara('sala');return;
    }
    var b=BIFURCACOES[etapa];
    imgJardim.src=JARDIM_IMGS[b.img];
    caminhosEl.style.display='block';
    elGritou.classList.remove('on');elPegou.classList.remove('on');
    stickerImg.classList.remove('bate');
  }
  function escolherCaminho(lado){
    var b=BIFURCACOES[etapa];
    SOM.clique();
    if(lado===b.certo){etapa++;proximaBifurcacao();return}
    // caminho errado: sticker entra na hora (já pré-carregado)
    caminhosEl.style.display='none';
    stickerImg.src=STICKERS[b.personagem||personagemAleatorio()];
    stickerImg.style.setProperty('--fromx',lado==='esq'?'-120%':'120%');
    stickerImg.style.setProperty('--rot',lado==='esq'?'-8deg':'8deg');
    elFlash.classList.remove('on');void elFlash.offsetWidth;elFlash.classList.add('on');
    elGritou.classList.add('on');
    SOM.susto();vibrar();
    requestAnimationFrame(function(){stickerImg.classList.add('bate')});
    setTimeout(function(){elPegou.classList.add('on')},650);
  }
  btnEsq.addEventListener('click',function(){escolherCaminho('esq')});
  btnDir.addEventListener('click',function(){escolherCaminho('dir')});
  btnTentar.addEventListener('click',function(){SOM.clique();proximaBifurcacao()});
  function pararJardim(){rodadaG++;SOM.ventoParar()}

  /* =====================================================================
     SALA DO TELEFONE
     ===================================================================== */
  // Texto de apoio (legenda) — troque pelo texto final da fala do Jigsaw.
  // Se você tiver o áudio gravado, coloque o arquivo como "voz_jigsaw.mp3" na mesma pasta:
  // ele toca com um filtro que imita o som saindo de um alto-falante de telefone.
  var VOZ_LINHAS=[
    'Você escapou.',
    'Eu tinha um trato com a aniversariante,','e agora cumprirei minha palavra.',
    'Se você ainda tiver coragem,','aqui estão as informações do aniversário.',
    'Mas não se esqueça:','estarei sempre de olho em você.'
  ];
  var VOZ_DURACAO_SEM_AUDIO=14; // segundos que as legendas ficam na tela quando ainda não há o arquivo de voz

  var salaZoom=document.getElementById('sala-zoom');
  var salaTexto=document.getElementById('sala-texto');
  var btnTelefone=document.getElementById('btn-telefone');
  var legendaVoz=document.getElementById('legenda-voz');
  var legendaCaixa=document.getElementById('legenda-caixa');
  var filtroLigacao=document.getElementById('filtro-ligacao');
  var btnPularVoz=document.getElementById('pular-voz');
  var pretoSala=document.getElementById('preto-sala');
  var rodadaS=0;

  async function iniciarSala(){
    var minha=++rodadaS;
    salaZoom.classList.remove('zoom');pretoSala.classList.remove('on');
    salaTexto.innerHTML='';legendaCaixa.classList.remove('on');legendaVoz.textContent='';
    filtroLigacao.classList.remove('on');
    btnPularVoz.classList.remove('on');
    btnTelefone.classList.remove('mudo');btnTelefone.disabled=false;
    await esperar(1400); if(minha!==rodadaS)return;
    btnTelefone.classList.add('toca');
    SOM.telefoneTocar();
  }
  btnTelefone.addEventListener('click',function(){
    if(btnTelefone.classList.contains('mudo'))return;
    var minha=rodadaS;
    btnTelefone.classList.remove('toca');btnTelefone.classList.add('mudo');
    SOM.telefoneParar();SOM.clique();
    tocarFalaJigsaw(minha);
  });
  function legendasEmSequencia(minha,duracaoTotal){
    var n=VOZ_LINHAS.length,cada=duracaoTotal/n,i=0;
    (function passo(){
      if(minha!==rodadaS)return;
      legendaVoz.textContent=VOZ_LINHAS[i];legendaCaixa.classList.add('on');filtroLigacao.classList.add('on');
      i++;
      if(i<n)setTimeout(passo,cada*1000);
    })();
  }
  async function tocarFalaJigsaw(minha){
    btnPularVoz.classList.add('on');
    var terminouChamado=false;
    function terminar(){
      if(terminouChamado)return;terminouChamado=true;
      if(minha!==rodadaS)return;
      aposFala(minha);
    }
    btnPularVoz.onclick=function(){SOM.vozPararSeTocando();terminar()};
    if(SONS.voz){
      var a=SOM.vozTelefone(SONS.voz,terminar);
      // legendas acompanham a duração real do áudio, quando o navegador consegue lê-la
      if(a){
        a.addEventListener('loadedmetadata',function(){
          if(isFinite(a.duration)&&a.duration>0)legendasEmSequencia(minha,a.duration);
        });
        setTimeout(function(){if(!legendaVoz.classList.contains('on'))legendasEmSequencia(minha,VOZ_DURACAO_SEM_AUDIO)},600);
      }
    }else{
      legendasEmSequencia(minha,VOZ_DURACAO_SEM_AUDIO);
      setTimeout(terminar,VOZ_DURACAO_SEM_AUDIO*1000);
    }
  }
  async function aposFala(minha){
    legendaCaixa.classList.remove('on');filtroLigacao.classList.remove('on');btnPularVoz.classList.remove('on');
    await esperar(700); if(minha!==rodadaS)return;
    salaZoom.classList.add('zoom');
    await esperar(2200); if(minha!==rodadaS)return;
    pretoSala.classList.add('on');
    await esperar(900); if(minha!==rodadaS)return;
    irPara('info');
  }
  function pararSala(){
    rodadaS++;SOM.telefoneParar();SOM.vozPararSeTocando();
    btnTelefone.classList.remove('toca');
  }

  /* =====================================================================
     TROCA DE TELAS
     ===================================================================== */
  function irPara(id){
    var atual=document.querySelector('.tela.ativa');
    var prox=document.getElementById('tela-'+id);
    if(!prox||atual===prox)return;
    atual.classList.remove('ativa');
    prox.classList.add('ativa');
    if(id==='espelho'){iniciarEspelho()}else{pararEspelho()}
    if(id==='escape'){iniciarEscape()}else{pararEscape()}
    if(id==='jigsaw'){iniciarJigsaw()}else{pararJigsaw()}
    if(id==='jardim'){iniciarJardim()}else{pararJardim()}
    if(id==='sala'){iniciarSala()}else{pararSala()}
  }
  window.CONVITE={irPara:irPara};

  document.getElementById('btn-prosseguir').addEventListener('click',function(){SOM.clique();irPara('escape')});
  document.getElementById('btn-pular').addEventListener('click',function(){SOM.clique();irPara('info')});
  [].forEach.call(document.querySelectorAll('[data-voltar]'),function(b){b.addEventListener('click',function(){irPara('espelho')})});

  /* =====================================================================
     PÁGINA DE INFORMAÇÕES — botões abrem um painel na hora (sem sair da tela)
     Para editar os textos de cada painel, mude o HTML dentro de #info-conteudo.
     ===================================================================== */
  var modalInfo=document.getElementById('modal-info');
  var cartaoInfo=document.getElementById('cartao-info');
  var fonteInfo=document.getElementById('info-conteudo');
  document.querySelectorAll('#tela-info [data-info]').forEach(function(b){
    b.addEventListener('click',function(){
      SOM.clique();
      var chave=b.getAttribute('data-info');
      var origem=fonteInfo.querySelector('[data-conteudo="'+chave+'"]');
      cartaoInfo.innerHTML=(origem?origem.innerHTML:'')+'<button class="btn-fino fechar-info" type="button">Fechar</button>';
      cartaoInfo.querySelector('.fechar-info').addEventListener('click',function(){modalInfo.classList.remove('on')});
      if(chave==='presenca')ligarFormularioRSVP();
      modalInfo.classList.add('on');
    });
  });
  modalInfo.addEventListener('click',function(e){if(e.target===modalInfo)modalInfo.classList.remove('on')});

  // RSVP: só visual, não envia pra lugar nenhum — é o convidado dizendo "vou" ou "não vou" na tela.
  // Se você quiser receber isso de verdade, dá pra trocar o "return" do submit por um link do WhatsApp com esse texto.
  function ligarFormularioRSVP(){
    var form=cartaoInfo.querySelector('.rsvp');
    var obrigado=cartaoInfo.querySelector('.rsvp-obrigado');
    var valor='';
    cartaoInfo.querySelectorAll('.rsvp-op').forEach(function(op){
      op.addEventListener('click',function(){
        SOM.clique();
        cartaoInfo.querySelectorAll('.rsvp-op').forEach(function(o){o.classList.remove('sel')});
        op.classList.add('sel');valor=op.getAttribute('data-val');
      });
    });
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var nome=cartaoInfo.querySelector('.rsvp-nome').value.trim();
      if(!nome||!valor)return;
      SOM.destrava();
      form.style.display='none';
      obrigado.style.display='block';
      obrigado.textContent=valor==='sim'
        ? nome+', sua presença está marcada. Até lá — se tiver coragem.'
        : nome+', você vai perder o susto. A porta continua aberta, caso mude de ideia.';
    });
  }

  var btnSom=document.getElementById('btn-som');
  document.getElementById('btn-entrar').addEventListener('click',function(){
    SOM.iniciar();SOM.clique();
    btnSom.hidden=false;
    irPara('espelho');
  });
  btnSom.addEventListener('click',function(){
    var m=SOM.alternarMudo();
    btnSom.classList.toggle('mudo',m);
    btnSom.setAttribute('aria-label',m?'Ligar o som':'Desligar o som');
  });
})();
