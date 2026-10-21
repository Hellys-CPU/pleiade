/*
 * Plêiade · site institucional.
 * O céu que acende, a Aurora que guia, a supernova da INNOVAR, a távola e o jogo de ligar os pontos.
 * Sem bibliotecas. Quem pede menos movimento recebe tudo parado e legível.
 */
(() => {
  "use strict";

  const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const toque = matchMedia("(hover: none)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const sessao = {
    ler(k) {
      try { return sessionStorage.getItem(k); } catch { return null; }
    },
    gravar(k, v) {
      try { sessionStorage.setItem(k, v); } catch { /* janela anônima: vale só nesta página */ }
    },
  };
  /** Cada parte roda isolada: se uma falhar, o resto do site continua de pé. */
  const parte = (fn) => {
    try { return fn(); } catch (erro) { console.error(erro); return undefined; }
  };

  /* ---------- Aparecer ao rolar (primeiro, para nada ficar escondido) ---------- */
  parte(() => {
    const itens = $$(".revelar");
    if (!("IntersectionObserver" in window)) {
      itens.forEach((el) => el.classList.add("visto"));
      return;
    }
    const io = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (e.isIntersecting) {
          e.target.classList.add("visto");
          io.unobserve(e.target);
        }
      }
    }, { rootMargin: "0px 0px -8% 0px" });
    itens.forEach((el) => io.observe(el));
  });

  /* ---------- Aurora, a guia ---------- */
  const guia = parte(() => {
    const el = $("[data-guia]");
    const fala = $("[data-fala]", el);
    const leitor = $("[data-fala-leitor]", el);
    let dispensada = sessao.ler("pleiade:guia") === "fora";
    let some, digitar;
    const ditas = new Set();
    const avulsas = [
      "Eu sou a Aurora, comunicação de bordo da hellys. A Atena é a engenheira.",
      "As Plêiades ficam a uns 440 anos-luz daqui. Nós viemos de site mesmo.",
      "A olho nu dá para ver sete. Com luneta, são centenas.",
      "Céu aceso fica aceso. Prometo.",
    ];
    let proxima = 0;

    function dizer(texto, { chave, ms = 6000 } = {}) {
      if (dispensada || !texto) return;
      if (chave) {
        if (ditas.has(chave)) return;
        ditas.add(chave);
      }
      el.hidden = false;
      clearTimeout(some);
      clearInterval(digitar);
      // Força o reflow para a transição de entrada rodar mesmo logo depois de mostrar
      void el.offsetWidth;
      el.classList.add("guia--falando");
      leitor.textContent = texto;
      if (calmo) {
        fala.textContent = texto;
      } else {
        let i = 0;
        fala.textContent = "";
        digitar = setInterval(() => {
          fala.textContent = texto.slice(0, ++i);
          if (i >= texto.length) clearInterval(digitar);
        }, 22);
      }
      some = setTimeout(() => el.classList.remove("guia--falando"), ms + texto.length * 22);
    }

    $(".guia-avatar", el).addEventListener("click", () => {
      dizer(avulsas[proxima++ % avulsas.length]);
    });
    $("[data-fechar-guia]", el).addEventListener("click", () => {
      dispensada = true;
      el.hidden = true;
      sessao.gravar("pleiade:guia", "fora");
    });

    return { dizer };
  }) || { dizer() {} };

  /* ---------- O céu da abertura ---------- */
  parte(() => {
    const sec = $(".ceu");
    const cv = $(".ceu-canvas", sec);
    const ctx = cv.getContext("2d");
    const estrelas = $$(".estrela", sec);
    const fios = $$(".fio", sec);
    const pontos = $$(".contagem li", sec);
    const numero = $("[data-acesas]", sec);
    const botao = $("[data-acender]", sec);
    const dica = $("[data-dica]", sec);
    const topo = $(".topo");
    const aglomerado = $(".aglomerado", sec);

    // A ordem dos fios na logo: Atlas → Alcyone → Merope → Electra → Celaeno → Taygeta → Maia
    const ORDEM = [0, 1, 2, 5, 6, 4, 3];
    const acesas = new Set();
    let completo = false;
    let mexeu = false;

    if (toque && dica) dica.textContent = "Arraste o dedo pelo céu, ou role a página.";

    function acender(i, origem) {
      if (acesas.has(i)) return;
      acesas.add(i);
      estrelas[i].classList.add("acesa");
      for (const f of fios) {
        if (acesas.has(+f.dataset.de) && acesas.has(+f.dataset.para)) f.classList.add("on");
      }
      pontos.forEach((p, k) => p.classList.toggle("on", acesas.has(k)));
      numero.textContent = String(acesas.size);
      if (origem === "lente" && acesas.size === 1) guia.dizer("Achou uma. Faltam seis.", { chave: "primeira" });
      if (acesas.size === 7) concluir(origem);
    }

    function concluir(origem) {
      if (completo) return;
      completo = true;
      sec.classList.add("ceu--aceso");
      botao.disabled = true;
      sessao.gravar("pleiade:ceu", "aceso");
      if (origem !== "memoria") {
        setTimeout(() => guia.dizer("Pronto. Essa é a Plêiade.", { chave: "aceso" }), 900);
      }
    }

    function acenderTodas(origem, passo) {
      ORDEM.forEach((i, k) => {
        if (calmo || !passo) acender(i, origem);
        else setTimeout(() => acender(i, origem), k * passo);
      });
    }

    /* Campo de estrelas + luneta */
    let W = 0;
    let H = 0;
    let R = 150;
    let campo = [];
    const lente = { x: -999, y: -999, a: 0, alvo: 0 };
    let visivel = true;
    let quadro = 0;

    function montar() {
      const r = sec.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const novaLargura = Math.round(r.width);
      const refazer = novaLargura !== Math.round(W) || Math.abs(r.height - H) > 120;
      W = r.width;
      H = r.height;
      R = W < 720 ? 110 : 150;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (refazer || !campo.length) {
        const n = Math.min(720, Math.round((W * H) / 1700));
        campo = [];
        for (let k = 0; k < n; k++) {
          // A maioria é fraca demais para o olho: só aparece na luneta
          const fraca = Math.random() < 0.6;
          campo.push({
            x: Math.random() * W,
            y: Math.random() * H,
            r: fraca ? 0.35 + Math.random() * 0.55 : 0.5 + Math.random() * 1.0,
            a: fraca ? Math.random() * 0.04 : 0.14 + Math.random() * (Math.random() < 0.12 ? 0.7 : 0.38),
            f: Math.random() * 6.2832,
            v: 0.4 + Math.random() * 1.2,
            c: Math.random() < 0.1 ? "255,228,200" : Math.random() < 0.5 ? "205,225,255" : "243,246,251",
          });
        }
      }
      desenhar(performance.now());
    }

    function desenhar(t) {
      ctx.clearRect(0, 0, W, H);
      const lx = lente.x;
      const ly = lente.y;
      const la = lente.a;
      const R2 = R * R;
      for (const s of campo) {
        let a = calmo ? s.a : s.a * (0.7 + 0.3 * Math.sin(t * 0.001 * s.v + s.f));
        if (la > 0.01) {
          const dx = s.x - lx;
          const dy = s.y - ly;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            const k = 1 - Math.sqrt(d2) / R;
            a += k * k * 0.95 * la;
          }
        }
        if (a < 0.015) continue;
        ctx.fillStyle = `rgba(${s.c},${a > 1 ? 1 : a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.2832);
        ctx.fill();
      }
      if (la > 0.01) {
        ctx.save();
        ctx.globalAlpha = la;
        const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, R);
        g.addColorStop(0, "rgba(143,193,255,0.07)");
        g.addColorStop(1, "rgba(143,193,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(lx, ly, R, 0, 6.2832);
        ctx.fill();
        ctx.strokeStyle = "rgba(156,196,255,0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(lx, ly, R, 0, 6.2832);
        ctx.stroke();
        ctx.beginPath();
        for (const [ux, uy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          ctx.moveTo(lx + ux * (R - 12), ly + uy * (R - 12));
          ctx.lineTo(lx + ux * (R + 5), ly + uy * (R + 5));
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    function laco(t) {
      quadro = 0;
      lente.a += (lente.alvo - lente.a) * 0.12;
      desenhar(t);
      if (visivel && !document.hidden) quadro = requestAnimationFrame(laco);
    }

    function ligar() {
      if (!calmo && !quadro && visivel) quadro = requestAnimationFrame(laco);
    }

    function mover(e) {
      const r = sec.getBoundingClientRect();
      lente.x = e.clientX - r.left;
      lente.y = e.clientY - r.top;
      lente.alvo = 1;
      mexeu = true;
      const raio = Math.max(46, R * 0.42);
      estrelas.forEach((g, i) => {
        if (acesas.has(i)) return;
        const c = $(".corpo", g).getBoundingClientRect();
        const dx = c.left + c.width / 2 - e.clientX;
        const dy = c.top + c.height / 2 - e.clientY;
        if (dx * dx + dy * dy < raio * raio) acender(i, "lente");
      });
      if (calmo) {
        lente.a = 1;
        desenhar(0);
      } else {
        ligar();
      }
    }

    function soltar() {
      lente.alvo = 0;
      if (calmo) {
        lente.a = 0;
        desenhar(0);
      }
    }

    sec.addEventListener("pointermove", mover, { passive: true });
    sec.addEventListener("pointerdown", mover, { passive: true });
    sec.addEventListener("pointerleave", soltar);
    sec.addEventListener("pointercancel", soltar);
    sec.addEventListener("pointerup", (e) => {
      if (e.pointerType !== "mouse") setTimeout(soltar, 500);
    });

    /* Rolar também acende, uma estrela por vez, na ordem dos fios */
    let pedido = false;
    function rolar() {
      pedido = false;
      const p = window.scrollY / (sec.offsetHeight * 0.45);
      const n = Math.min(7, Math.floor(p * 7));
      for (let k = 0; k < n; k++) acender(ORDEM[k], "rolagem");
    }
    window.addEventListener("scroll", () => {
      if (window.scrollY > 4) mexeu = true;
      if (!completo && !pedido) {
        pedido = true;
        requestAnimationFrame(rolar);
      }
    }, { passive: true });

    botao.addEventListener("click", () => {
      mexeu = true;
      acenderTodas("botao", 150);
    });

    /* Só anima enquanto o céu está na tela */
    new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting;
      if (visivel) ligar();
    }).observe(sec);

    new IntersectionObserver(([e]) => {
      topo.dataset.logo = e.isIntersecting ? "oculto" : "visivel";
    }, { rootMargin: "-64px 0px 0px 0px" }).observe(aglomerado);

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) ligar();
    });

    let espera;
    window.addEventListener("resize", () => {
      clearTimeout(espera);
      espera = setTimeout(montar, 150);
    });

    montar();
    ligar();

    if (calmo || sessao.ler("pleiade:ceu") === "aceso") {
      acenderTodas("memoria", 0);
      setTimeout(() => guia.dizer(calmo ? "Oi. O céu já está aceso para você." : "De volta? O céu continua aceso."), 1200);
    } else {
      setTimeout(() => guia.dizer("Parece que alguém olhou pro céu…", { chave: "oi" }), 1200);
      setTimeout(() => {
        if (!acesas.size) {
          guia.dizer(toque ? "Arrasta o dedo pelas estrelas fortes. Ou só rola." : "Passa o cursor pelas estrelas mais fortes. Ou só rola.", { chave: "dica" });
        }
      }, 7500);
      // Quem só fica olhando também vê o céu acender, devagar
      setTimeout(() => {
        if (!acesas.size && !mexeu) acenderTodas("sozinho", 420);
      }, 16000);
    }
  });

  /* ---------- Falas da Aurora pelo caminho ---------- */
  parte(() => {
    const falas = {
      empresas: "Cada empresa aqui é um fenômeno. Spoiler: uma delas explode.",
      tavola: "Cinco lugares vagos. A gente guarda a cadeira.",
      jogo: "Intervalo. Bora ligar uns pontos?",
      rotas: "Escolha uma rota. Eu fico de olho daqui.",
    };
    const io = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (e.isIntersecting) {
          guia.dizer(falas[e.target.id], { chave: e.target.id });
          io.unobserve(e.target);
        }
      }
    }, { rootMargin: "-45% 0px -45% 0px" });
    Object.keys(falas).forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
  });

  /* ---------- Os olhos das personagens seguem o cursor ---------- */
  parte(() => {
    if (toque) return;
    let pedido = false;
    let mx = 0;
    let my = 0;
    function olhar() {
      pedido = false;
      for (const p of $$(".personagem")) {
        const r = p.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        const dx = mx - (r.left + r.width / 2);
        const dy = my - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) || 1;
        const alcance = r.width * 0.08 * Math.min(1, d / 180);
        p.style.setProperty("--ox", `${((dx / d) * alcance).toFixed(1)}px`);
        p.style.setProperty("--oy", `${((dy / d) * alcance).toFixed(1)}px`);
      }
    }
    document.addEventListener("pointermove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!pedido) {
        pedido = true;
        requestAnimationFrame(olhar);
      }
    }, { passive: true });
  });

  /* ---------- hellys.: o satélite que o enxame monta ---------- */
  parte(() => {
    const caixa = $("[data-satelite]");
    const cv = $("canvas", caixa);
    const ctx = cv.getContext("2d");
    const botao = $("[data-montar]", caixa);
    const COR = { nevoa: "232,236,241", atena: "255,138,61", aurora: "63,201,168" };

    // O satélite num espaço de 100 × 60 (centro em 50, 30): duas asas de três painéis, corpo, antena parabólica
    const ASA = { atena: [[8, 17.5], [18.5, 28], [29, 38]], aurora: [[62, 71.5], [72, 81.5], [82.5, 92]] };
    const PRATO = { cx: 50, cy: 9, rx: 7.5, ry: 2, fundo: 12.5, foco: [50, 3.5] };
    // O monograma "h." do kit da hellys. (01-logo/secundarias/h-minusculo), em vetor: acompanha o balanço sem tremer
    const MONO_H = new Path2D("M196 0L70 0L70-700L196-700L196-435L214-435Q222-451 239-467Q256-483 284.50-493.50Q313-504 357-504L357-504Q415-504 458.50-477.50Q502-451 526-404.50Q550-358 550-296L550-296L550 0L424 0L424-286Q424-342 396.50-370Q369-398 318-398L318-398Q260-398 228-359.50Q196-321 196-252L196-252L196 0Z");
    const MONO_PONTO = new Path2D("M756 14L756 14Q715 14 687.50-12.50Q660-39 660-81L660-81Q660-123 687.50-149.50Q715-176 756-176L756-176Q796-176 823-149.50Q850-123 850-81L850-81Q850-39 823-12.50Q796 14 756 14Z");

    // Os traços por onde os nanorrobôs se alinham
    const SEG = [];
    const linha = (x0, y0, x1, y1, cor) => SEG.push([x0, y0, x1, y1, cor]);
    const ret = (x0, y0, x1, y1, cor) => {
      linha(x0, y0, x1, y0, cor);
      linha(x1, y0, x1, y1, cor);
      linha(x1, y1, x0, y1, cor);
      linha(x0, y1, x0, y0, cor);
    };
    for (const lado of ["atena", "aurora"]) {
      for (const [a, b] of ASA[lado]) {
        ret(a, 25, b, 35, lado);
        linha(a, 30, b, 30, lado);
        linha((a + b) / 2, 25, (a + b) / 2, 35, lado);
      }
    }
    ret(44, 17, 56, 41, "nevoa");
    linha(38, 30, 44, 30, "nevoa");
    linha(56, 30, 62, 30, "nevoa");
    linha(50, 17, 50, 11, "nevoa");
    for (let i = 0; i < 12; i++) {
      const a0 = (i / 12) * 6.2832;
      const a1 = ((i + 1) / 12) * 6.2832;
      linha(PRATO.cx + Math.cos(a0) * PRATO.rx, PRATO.cy + Math.sin(a0) * PRATO.ry, PRATO.cx + Math.cos(a1) * PRATO.rx, PRATO.cy + Math.sin(a1) * PRATO.ry, "nevoa");
    }
    linha(46.5, 41, 47.5, 43.5, "nevoa");
    linha(47.5, 43.5, 52.5, 43.5, "nevoa");
    linha(52.5, 43.5, 53.5, 41, "nevoa");
    linha(44, 40, 40.5, 46, "nevoa");
    linha(56, 40, 59.5, 46, "nevoa");

    const robos = [];
    for (const [x0, y0, x1, y1, cor] of SEG) {
      const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 1.9));
      for (let k = 0; k < n; k++) {
        robos.push({
          ax: x0 + ((x1 - x0) * k) / n,
          ay: y0 + ((y1 - y0) * k) / n,
          cor,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          atraso: Math.random() * 0.7,
          // Órbita no caos: cada um gira em volta da sua líder, num raio e ritmo próprios
          th: Math.random() * 6.2832,
          raio: cor === "nevoa" ? 0.06 + Math.random() * 0.2 : 0.1 + Math.random() * 0.09,
          w: (cor === "nevoa" ? 0.25 : 0.7) * (0.7 + Math.random() * 0.6),
          f: Math.random() * 6.2832,
        });
      }
    }

    const lider = {
      atena: { el: $(".sat-atena", caixa), x: 0, y: 0 },
      aurora: { el: $(".sat-aurora", caixa), x: 0, y: 0 },
    };

    let W = 0;
    let H = 0;
    let k = 1;
    let cx = 0;
    let cy = 0;
    let estado = calmo ? "montado" : "caos";
    let desde = -1e9;
    let forma = calmo ? 1 : 0;
    let quadro = 0;
    let ultimo = 0;
    let visivel = false;
    let mexeu = false;
    let espera = 0;
    // A Atena solda; a Aurora troca pacotes de dados com a antena
    let solda = null;
    let proximaSolda = 0;
    let faiscas = [];
    let pacote = null;
    let proximoPacote = 0;
    let subiu = true;

    const px = (x, y, bob = 0) => [cx + (x - 50) * k, cy + (y - 30) * k + bob];
    const balanco = (t) => (estado === "montado" && !calmo ? Math.sin(t * 0.0011) * 3 : 0);
    // As asas giram devagar, buscando o sol: a altura dos painéis varia um pouco
    const abertura = (t) => (calmo ? 1 : 0.86 + 0.14 * Math.cos(t * 0.0005));

    function postos(t) {
      if (estado === "montado") {
        const b = calmo ? 0 : Math.sin(t * 0.0013) * 4;
        const [ax, ay] = px(21, 57);
        const [bx, by] = px(79, 57);
        return { atena: [ax, ay + b], aurora: [bx, by - b] };
      }
      return {
        atena: [W * 0.34 + Math.sin(t * 0.0007) * W * 0.07, H * 0.46 + Math.cos(t * 0.0009) * H * 0.08],
        aurora: [W * 0.66 + Math.cos(t * 0.0008) * W * 0.07, H * 0.54 + Math.sin(t * 0.001) * H * 0.07],
      };
    }

    function espalhar() {
      for (const r of robos) {
        r.x = W * (0.12 + Math.random() * 0.76);
        r.y = H * (0.12 + Math.random() * 0.7);
      }
    }

    function assentar(t) {
      // Sem animação: cada coisa direto no seu lugar
      const p = postos(t);
      for (const nome of ["atena", "aurora"]) {
        lider[nome].x = p[nome][0];
        lider[nome].y = p[nome][1];
      }
      if (estado === "montado") {
        for (const r of robos) [r.x, r.y] = px(r.ax, r.ay);
      }
    }

    function medir() {
      const r = caixa.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const primeira = !W;
      W = r.width;
      H = r.height;
      k = Math.min((W * 0.92) / 100, (H * 0.6) / 60);
      cx = W / 2;
      cy = H * 0.4;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (primeira) {
        espalhar();
        assentar(performance.now());
      } else if (calmo) {
        assentar(performance.now());
      }
      desenhar(performance.now());
    }

    function receber() {
      const el = lider.aurora.el;
      el.classList.remove("recebendo");
      void el.offsetWidth;
      el.classList.add("recebendo");
      setTimeout(() => el.classList.remove("recebendo"), 900);
    }

    function passo(dt, t) {
      const p = postos(t);
      for (const nome of ["atena", "aurora"]) {
        const L = lider[nome];
        const f = Math.min(1, 0.05 * dt);
        L.x += (p[nome][0] - L.x) * f;
        L.y += (p[nome][1] - L.y) * f;
      }
      const e = (t - desde) / 1000;
      const b = balanco(t);
      const alvoForma = estado === "montado" && e > 1.2 ? 1 : 0;
      forma += (alvoForma - forma) * Math.min(1, (alvoForma ? 0.04 : 0.15) * dt);

      const h = abertura(t);
      for (const r of robos) {
        if (estado === "montado" && e > r.atraso) {
          const [tx, ty] = px(r.ax, r.cor === "nevoa" ? r.ay : 30 + (r.ay - 30) * h, b);
          r.vx = (r.vx + (tx - r.x) * 0.05 * dt) * 0.8 ** dt;
          r.vy = (r.vy + (ty - r.y) * 0.05 * dt) * 0.8 ** dt;
        } else {
          // No caos, cada enxame zumbe em volta da sua líder; os brancos vagam pelo meio, mais devagar
          const L = lider[r.cor];
          const ox = L ? L.x : W * 0.5;
          const oy = L ? L.y : H * 0.42;
          const ang = r.th + (r.w * t) / 1000;
          const R = r.raio * Math.min(W, H) * (1 + 0.18 * Math.sin(t * 0.0021 + r.f));
          const tx = ox + Math.cos(ang) * R;
          const ty = oy + Math.sin(ang) * R * 0.78;
          r.vx = (r.vx + (tx - r.x) * 0.02 * dt + (Math.random() - 0.5) * 0.3 * dt) * 0.86 ** dt;
          r.vy = (r.vy + (ty - r.y) * 0.02 * dt + (Math.random() - 0.5) * 0.3 * dt) * 0.86 ** dt;
        }
        r.x += r.vx * dt;
        r.y += r.vy * dt;
        if (r.x < 6) r.vx += 0.5 * dt;
        if (r.x > W - 6) r.vx -= 0.5 * dt;
        if (r.y < 6) r.vy += 0.5 * dt;
        if (r.y > H - 6) r.vy -= 0.5 * dt;
      }

      // Com o satélite de pé, a tripulação trabalha
      if (estado === "montado" && forma > 0.9) {
        if (!solda && t > proximaSolda) {
          const alvo = robos[Math.floor(Math.random() * robos.length)];
          solda = { t0: t, x: alvo.ax, y: alvo.ay, dur: 950 };
          lider.atena.el.classList.add("soldando");
        }
        if (solda && t - solda.t0 > solda.dur) {
          solda = null;
          lider.atena.el.classList.remove("soldando");
          proximaSolda = t + 1600 + Math.random() * 2600;
        }
        if (!pacote && t > proximoPacote) {
          subiu = !subiu;
          pacote = { t0: t, dur: 1150, sobe: subiu };
        }
        if (pacote && t - pacote.t0 > pacote.dur) {
          if (!pacote.sobe) receber();
          pacote = null;
          proximoPacote = t + 2200 + Math.random() * 1600;
        }
      } else if (solda || pacote) {
        solda = null;
        pacote = null;
        lider.atena.el.classList.remove("soldando");
      }

      if (solda) {
        const [sx, sy] = px(solda.x, solda.y, b);
        for (let i = 0; i < 2; i++) {
          faiscas.push({ x: sx, y: sy, vx: (Math.random() - 0.5) * 3.2, vy: -Math.random() * 2.4, v: 1 });
        }
      }
      for (const f of faiscas) {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.vy += 0.12 * dt;
        f.v -= 0.035 * dt;
      }
      faiscas = faiscas.filter((f) => f.v > 0);
    }

    function traco(x0, y0, x1, y1, b) {
      const [ax, ay] = px(x0, y0, b);
      const [bx, by] = px(x1, y1, b);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    function bolinha(x, y, r) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.2832);
      ctx.fill();
    }

    function desenharSatelite(t, b, a) {
      ctx.save();
      ctx.globalAlpha = a;

      // Braços das asas
      ctx.strokeStyle = "rgba(143,160,178,0.95)";
      ctx.lineWidth = Math.max(1.2, k * 0.4);
      traco(38, 30, 44, 30, b);
      traco(56, 30, 62, 30, b);

      // Asas: três painéis cada, com células que brilham na cor da dona e um reflexo que passa
      const h = abertura(t);
      for (const lado of ["atena", "aurora"]) {
        const c = COR[lado];
        const [wx0] = px(ASA[lado][0][0], 30, b);
        const [wx1] = px(ASA[lado][2][1], 30, b);
        const fase = calmo ? -1 : ((t * 0.00018 + (lado === "aurora" ? 0.45 : 0)) % 1.5) - 0.25;
        const gx = wx0 + (wx1 - wx0) * fase;
        ASA[lado].forEach(([x0, x1], n) => {
          const [ax, ay] = px(x0, 30 - 5 * h, b);
          const [bx, by] = px(x1, 30 + 5 * h, b);
          const w = bx - ax;
          const hh = by - ay;
          ctx.fillStyle = "rgba(16,20,26,0.96)";
          ctx.fillRect(ax, ay, w, hh);
          const cw = w / 4;
          const ch = hh / 2;
          const m = Math.max(0.8, k * 0.18);
          for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 2; j++) {
              const luz = calmo ? 0.2 : 0.16 + 0.07 * Math.sin(t * 0.0016 + i * 0.9 + j * 1.7 + (lado === "aurora" ? 2 : 0));
              ctx.fillStyle = `rgba(${c},${luz.toFixed(3)})`;
              ctx.fillRect(ax + i * cw + m, ay + j * ch + m, cw - 2 * m, ch - 2 * m);
            }
          }
          if (fase > -0.2 && fase < 1.2) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(ax, ay, w, hh);
            ctx.clip();
            const g = ctx.createLinearGradient(gx - 30, ay, gx + 30, by);
            g.addColorStop(0, "rgba(255,255,255,0)");
            g.addColorStop(0.5, "rgba(255,255,255,0.2)");
            g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = g;
            ctx.fillRect(ax, ay, w, hh);
            ctx.restore();
          }
          ctx.strokeStyle = `rgba(${c},0.8)`;
          ctx.lineWidth = 1;
          ctx.strokeRect(ax + 0.5, ay + 0.5, w - 1, hh - 1);
          // Dobradiças entre os painéis
          if (n > 0) {
            ctx.fillStyle = "rgba(143,160,178,0.9)";
            bolinha(...px(x0 - 0.5, 30, b), Math.max(1.2, k * 0.28));
          }
        });
      }

      // Corpo metálico
      const [bx0, by0] = px(44, 17, b);
      const [bx1, by1] = px(56, 41, b);
      const g = ctx.createLinearGradient(bx0, 0, bx1, 0);
      g.addColorStop(0, "#1e2631");
      g.addColorStop(0.32, "#46546a");
      g.addColorStop(0.55, "#2a3341");
      g.addColorStop(1, "#141a22");
      ctx.fillStyle = g;
      ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
      ctx.strokeStyle = "rgba(232,236,241,0.6)";
      ctx.lineWidth = 1;
      ctx.strokeRect(bx0 + 0.5, by0 + 0.5, bx1 - bx0 - 1, by1 - by0 - 1);
      ctx.strokeStyle = "rgba(143,160,178,0.4)";
      traco(44, 24, 56, 24, b);
      traco(44, 35, 56, 35, b);

      // Monograma h. no casco (a caixa do desenho vai de 70 a 850 em x e de -700 a 14 em y)
      const [mx, my] = px(50, 29.5, b);
      const escalaMono = (k * 6) / 714;
      ctx.save();
      ctx.translate(mx, my);
      ctx.scale(escalaMono, escalaMono);
      ctx.translate(-460, 343);
      ctx.fillStyle = "rgba(232,236,241,0.92)";
      ctx.fill(MONO_H);
      ctx.fillStyle = "#ff8a3d";
      ctx.fill(MONO_PONTO);
      ctx.restore();

      // Sensor de estrelas e luz de status
      const [sx, sy] = px(46.4, 20.3, b);
      ctx.fillStyle = "#0b0f15";
      bolinha(sx, sy, Math.max(1.6, k * 0.9));
      ctx.strokeStyle = "rgba(232,236,241,0.5)";
      ctx.stroke();
      const acesa = calmo || Math.sin(t * 0.004) > 0.55;
      const [lx, ly] = px(53.8, 20.3, b);
      ctx.fillStyle = acesa ? "rgba(166,244,225,1)" : "rgba(63,201,168,0.35)";
      bolinha(lx, ly, Math.max(1.3, k * 0.5));
      if (acesa) {
        const gl = ctx.createRadialGradient(lx, ly, 0, lx, ly, k * 2.4);
        gl.addColorStop(0, "rgba(63,201,168,0.55)");
        gl.addColorStop(1, "rgba(63,201,168,0)");
        ctx.fillStyle = gl;
        bolinha(lx, ly, k * 2.4);
      }

      // Propulsor e antenas finas
      ctx.fillStyle = "#1e2631";
      ctx.strokeStyle = "rgba(232,236,241,0.45)";
      ctx.beginPath();
      const q = [[46.5, 41], [53.5, 41], [52.5, 43.5], [47.5, 43.5]].map(([x, y]) => px(x, y, b));
      ctx.moveTo(...q[0]);
      q.slice(1).forEach((pt) => ctx.lineTo(...pt));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(143,160,178,0.8)";
      traco(44, 40, 40.5, 46, b);
      traco(56, 40, 59.5, 46, b);
      ctx.fillStyle = "rgba(232,236,241,0.9)";
      bolinha(...px(40.5, 46, b), Math.max(1.2, k * 0.35));
      bolinha(...px(59.5, 46, b), Math.max(1.2, k * 0.35));

      // Mastro e antena parabólica
      ctx.strokeStyle = "rgba(143,160,178,0.95)";
      ctx.lineWidth = Math.max(1, k * 0.3);
      traco(50, 17, 50, 11, b);
      const [pcx, pcy] = px(PRATO.cx, PRATO.cy, b);
      const [, pfy] = px(50, PRATO.fundo, b);
      const rx = PRATO.rx * k;
      const ry = PRATO.ry * k;
      const tigela = ctx.createLinearGradient(0, pcy, 0, pfy);
      tigela.addColorStop(0, "#8fa0b2");
      tigela.addColorStop(1, "#2a3341");
      ctx.fillStyle = tigela;
      ctx.beginPath();
      ctx.moveTo(pcx - rx, pcy);
      ctx.quadraticCurveTo(pcx, pcy + 2 * (pfy - pcy), pcx + rx, pcy);
      ctx.ellipse(pcx, pcy, rx, ry, 0, 0, Math.PI);
      ctx.fill();
      const dentro = ctx.createRadialGradient(pcx, pcy, 0, pcx, pcy, rx);
      dentro.addColorStop(0, "#46546a");
      dentro.addColorStop(1, "#171d26");
      ctx.fillStyle = dentro;
      ctx.beginPath();
      ctx.ellipse(pcx, pcy, rx, ry, 0, 0, 6.2832);
      ctx.fill();
      ctx.strokeStyle = "rgba(232,236,241,0.8)";
      ctx.lineWidth = 1;
      ctx.stroke();
      const [fx, fy] = px(...PRATO.foco, b);
      ctx.strokeStyle = "rgba(143,160,178,0.8)";
      ctx.beginPath();
      ctx.moveTo(pcx - rx * 0.8, pcy);
      ctx.lineTo(fx, fy);
      ctx.lineTo(pcx + rx * 0.8, pcy);
      ctx.stroke();
      ctx.fillStyle = "rgba(232,236,241,0.95)";
      bolinha(fx, fy, Math.max(1.4, k * 0.5));

      ctx.restore();
    }

    function desenhar(t) {
      ctx.clearRect(0, 0, W, H);
      const e = (t - desde) / 1000;
      const b = balanco(t);

      // Os nanorrobôs: no caos, enxames coloridos; montados, viram o brilho fino da estrutura
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const alfa = estado === "montado" ? 0.95 - forma * 0.75 : 0.75;
      for (const r of robos) {
        ctx.fillStyle = `rgba(${COR[r.cor]},${alfa.toFixed(3)})`;
        bolinha(r.x, r.y, r.cor === "nevoa" ? 1.5 : 1.9);
      }
      ctx.restore();

      if (forma > 0.01) desenharSatelite(t, b, forma);

      if (estado === "montado" && forma > 0.5) {
        const [sx, sy] = px(...PRATO.foco, b);
        // O satélite transmite: arcos saindo da antena
        if (!calmo) {
          ctx.lineWidth = 1;
          for (const atraso of [0, 0.33, 0.66]) {
            const f = ((e - 1.8) / 2.4 + atraso) % 1;
            if (f < 0) continue;
            ctx.strokeStyle = `rgba(232,236,241,${(0.4 * (1 - f) * forma).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(sx, sy, (3 + f * 14) * k, Math.PI * 1.22, Math.PI * 1.78);
            ctx.stroke();
          }
        }

        // Aurora e a antena trocam pacotes de dados
        if (pacote) {
          const f = (t - pacote.t0) / pacote.dur;
          const A = lider.aurora;
          const ay = A.y - A.el.offsetHeight * 0.45;
          ctx.save();
          ctx.setLineDash([3, 6]);
          ctx.strokeStyle = `rgba(63,201,168,${(0.3 * Math.sin(Math.PI * f)).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(A.x, ay);
          ctx.stroke();
          ctx.restore();
          const [x0, y0, x1, y1] = pacote.sobe ? [A.x, ay, sx, sy] : [sx, sy, A.x, ay];
          const suave = f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2;
          const qx = x0 + (x1 - x0) * suave;
          const qy = y0 + (y1 - y0) * suave;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          const gp = ctx.createRadialGradient(qx, qy, 0, qx, qy, 10);
          gp.addColorStop(0, "rgba(220,255,245,1)");
          gp.addColorStop(0.3, "rgba(63,201,168,0.7)");
          gp.addColorStop(1, "rgba(63,201,168,0)");
          ctx.fillStyle = gp;
          bolinha(qx, qy, 10);
          ctx.restore();
        }

        // Atena solda: feixe laranja e faíscas
        if (solda) {
          const [wx, wy] = px(solda.x, solda.y, b);
          const A = lider.atena;
          const tremor = 0.6 + Math.random() * 0.4;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.lineCap = "round";
          ctx.strokeStyle = `rgba(255,138,61,${(0.25 * tremor).toFixed(3)})`;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(A.x, A.y);
          ctx.lineTo(wx, wy);
          ctx.stroke();
          ctx.strokeStyle = `rgba(255,220,190,${(0.9 * tremor).toFixed(3)})`;
          ctx.lineWidth = 1.3;
          ctx.stroke();
          const gs = ctx.createRadialGradient(wx, wy, 0, wx, wy, 12);
          gs.addColorStop(0, `rgba(255,255,255,${tremor.toFixed(3)})`);
          gs.addColorStop(0.35, "rgba(255,170,100,0.6)");
          gs.addColorStop(1, "rgba(255,138,61,0)");
          ctx.fillStyle = gs;
          bolinha(wx, wy, 12);
          ctx.restore();
        }
      }

      if (faiscas.length) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (const f of faiscas) {
          ctx.fillStyle = `rgba(255,${Math.round(170 + 80 * f.v)},${Math.round(90 + 120 * f.v)},${f.v.toFixed(3)})`;
          bolinha(f.x, f.y, 1.2);
        }
        ctx.restore();
      }

      for (const nome of ["atena", "aurora"]) {
        const L = lider[nome];
        L.el.style.transform = `translate(${L.x.toFixed(1)}px, ${L.y.toFixed(1)}px) translate(-50%, -50%)`;
      }
    }

    function laco(t) {
      quadro = 0;
      const dt = ultimo ? Math.min(3, (t - ultimo) / 16.67) : 1;
      ultimo = t;
      passo(dt, t);
      desenhar(t);
      if (visivel && !document.hidden) quadro = requestAnimationFrame(laco);
      else ultimo = 0;
    }

    function ligar() {
      if (!calmo && !quadro && visivel) quadro = requestAnimationFrame(laco);
    }

    function alternar() {
      estado = estado === "montado" ? "caos" : "montado";
      desde = performance.now();
      caixa.classList.toggle("satelite--montado", estado === "montado");
      botao.textContent = estado === "montado" ? "Soltar o enxame" : "Montar o satélite";
      if (estado === "caos") {
        // Desmonta com um empurrão: cada robô sai voando
        for (const r of robos) {
          r.vx = (Math.random() - 0.5) * 9;
          r.vy = (Math.random() - 0.5) * 9;
        }
      } else {
        proximaSolda = desde + 2600;
        proximoPacote = desde + 3400;
        setTimeout(() => guia.dizer("Montado. A Atena cuidou da engenharia; eu, da conversa.", { chave: "satelite" }), calmo ? 0 : 1800);
      }
      if (calmo) {
        forma = estado === "montado" ? 1 : 0;
        if (estado === "caos") espalhar();
        assentar(performance.now());
        desenhar(performance.now());
      }
      ligar();
    }

    botao.addEventListener("click", () => {
      mexeu = true;
      alternar();
    });

    function pular(el) {
      el.classList.remove("pulando");
      void el.offsetWidth;
      el.classList.add("pulando");
    }
    lider.atena.el.addEventListener("click", () => {
      pular(lider.atena.el);
      guia.dizer("Essa é a Atena, engenheira de bordo. Se o sistema está de pé, foi ela.");
    });
    lider.aurora.el.addEventListener("click", () => {
      pular(lider.aurora.el);
      guia.dizer("Essa sou eu, comunicação de bordo. Por isso eu falo tanto.");
    });

    // Quem só fica olhando também vê o enxame se organizar
    new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting;
      if (visivel) ligar();
    }).observe(caixa);
    new IntersectionObserver(([e]) => {
      clearTimeout(espera);
      if (e.isIntersecting) {
        espera = setTimeout(() => {
          if (!mexeu && estado === "caos" && visivel) alternar();
        }, 3800);
      }
    }, { threshold: 0.5 }).observe(caixa);

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) ligar();
    });

    let redim;
    window.addEventListener("resize", () => {
      clearTimeout(redim);
      redim = setTimeout(medir, 150);
    });

    if (calmo) {
      caixa.classList.add("satelite--montado");
      botao.textContent = "Soltar o enxame";
    }
    medir();
  });

  /* ---------- Supernova da INNOVAR ---------- */
  parte(() => {
    const caixa = $("[data-supernova]");
    const cv = $("canvas", caixa);
    const ctx = cv.getContext("2d");
    const botao = $("[data-explodir]", caixa);
    const CORES = ["211,140,255", "242,155,255", "255,122,217", "156,196,255", "255,209,102", "255,255,255"];
    let W = 0;
    let H = 0;
    let cx = 0;
    let cy = 0;
    let escala = 1;
    let estado = "calma";
    let t0 = 0;
    let particulas = [];
    let novas = [];
    let quadro = 0;
    let ultimo = 0;
    let visivel = false;

    function montar() {
      const r = caixa.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const antes = { cx, cy };
      W = r.width;
      H = r.height;
      cx = W / 2;
      cy = H * 0.44;
      escala = Math.min(W, H) / 400;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Se a caixa mudou de tamanho no meio da explosão, leva os restos junto
      if (particulas.length && antes.cx) {
        const dx = cx - antes.cx;
        const dy = cy - antes.cy;
        for (const p of particulas) { p.x += dx; p.y += dy; }
      }
      desenhar(performance.now());
    }

    function nucleo(x, y, r, a) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.18, `rgba(246,230,255,${0.9 * a})`);
      g.addColorStop(0.4, `rgba(211,140,255,${0.45 * a})`);
      g.addColorStop(1, "rgba(211,140,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 3, 0, 6.2832);
      ctx.fill();
    }

    function desenhar(t) {
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      if (estado === "calma") {
        const pulso = calmo ? 1 : 1 + 0.1 * Math.sin(t * 0.003);
        nucleo(cx, cy, 15 * escala * pulso, 1);
        const L = 52 * escala * pulso;
        ctx.strokeStyle = "rgba(211,140,255,0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - L, cy);
        ctx.lineTo(cx + L, cy);
        ctx.moveTo(cx, cy - L);
        ctx.lineTo(cx, cy + L);
        ctx.stroke();
        ctx.restore();
        return;
      }
      const e = (t - t0) / 1000;
      if (e < 0.6) {
        const k = 1 - e / 0.6;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7);
        g.addColorStop(0, `rgba(255,240,255,${0.85 * k})`);
        g.addColorStop(0.3, `rgba(211,140,255,${0.35 * k})`);
        g.addColorStop(1, "rgba(211,140,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      if (e < 2.2) {
        const rr = (e / 2.2) ** 0.6 * Math.max(W, H) * 0.75;
        ctx.strokeStyle = `rgba(242,200,255,${0.5 * (1 - e / 2.2)})`;
        ctx.lineWidth = 2 * escala;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, 6.2832);
        ctx.stroke();
      }
      // Brilho difuso da nebulosa que fica
      const n = Math.min(1, e / 1.5);
      const neb = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.46);
      neb.addColorStop(0, `rgba(211,140,255,${0.1 * n})`);
      neb.addColorStop(0.65, `rgba(255,122,217,${0.06 * n})`);
      neb.addColorStop(1, "rgba(156,196,255,0)");
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, W, H);
      for (const p of particulas) {
        ctx.fillStyle = `rgba(${p.c},${p.a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fill();
      }
      const resto = Math.max(0, 1 - e / 1.2);
      if (resto > 0) nucleo(cx, cy, (15 + 30 * (1 - resto)) * escala, resto);
      // As estrelas novas que nascem dos restos
      for (const s of novas) {
        const k = Math.min(1, (e - s.t) / 1.2);
        if (k <= 0) continue;
        const brilho = calmo ? 1 : 0.75 + 0.25 * Math.sin(t * 0.004 + s.f);
        const raio = 10 * escala;
        const g = ctx.createRadialGradient(s.p.x, s.p.y, 0, s.p.x, s.p.y, raio);
        g.addColorStop(0, `rgba(255,255,255,${0.95 * k * brilho})`);
        g.addColorStop(0.25, `rgba(230,241,255,${0.45 * k * brilho})`);
        g.addColorStop(1, "rgba(143,193,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.p.x, s.p.y, raio, 0, 6.2832);
        ctx.fill();
      }
      ctx.restore();
    }

    function passo(dt) {
      // A casca continua crescendo bem devagar, sem sair do quadro
      const limite = Math.min(W, H) * 0.48;
      for (const p of particulas) {
        const longe = Math.hypot(p.x - cx, p.y - cy) < limite ? 0.00012 : 0;
        p.x += p.vx * dt + (p.x - cx) * longe * dt;
        p.y += p.vy * dt + (p.y - cy) * longe * dt;
        p.vx *= 0.975 ** dt;
        p.vy *= 0.975 ** dt;
        p.a = Math.max(p.piso, p.a * 0.993 ** dt);
      }
    }

    function escolherNovas(e) {
      const lim = Math.min(W, H) * 0.42;
      const candidatas = particulas.filter((p) => {
        const d = Math.hypot(p.x - cx, p.y - cy);
        return d > 40 * escala && d < lim;
      });
      const saida = [];
      for (let k = 0; k < 6 && candidatas.length; k++) {
        const p = candidatas.splice(Math.floor(Math.random() * candidatas.length), 1)[0];
        saida.push({ p, t: e + k * 0.35, f: Math.random() * 6.2832 });
      }
      return saida;
    }

    function laco(t) {
      quadro = 0;
      const dt = ultimo ? Math.min(3, (t - ultimo) / 16.67) : 1;
      ultimo = t;
      if (estado !== "calma") {
        passo(dt);
        const e = (t - t0) / 1000;
        if (!novas.length && e > 1.6) novas = escolherNovas(e);
      }
      desenhar(t);
      if (visivel && !document.hidden) quadro = requestAnimationFrame(laco);
      else ultimo = 0;
    }

    function ligar() {
      if (!calmo && !quadro && visivel) quadro = requestAnimationFrame(laco);
    }

    function explodir() {
      estado = "explosao";
      t0 = performance.now();
      particulas = [];
      novas = [];
      // A maior parte vira uma casca (o resto da supernova); o resto enche o miolo
      const casca = Math.min(W, H) * 0.0095;
      for (let k = 0; k < 360; k++) {
        const ang = Math.random() * 6.2832;
        const vel = Math.random() < 0.7 ? casca * (0.82 + Math.random() * 0.3) : casca * Math.random() ** 1.4;
        particulas.push({
          x: cx,
          y: cy,
          vx: Math.cos(ang) * vel,
          vy: Math.sin(ang) * vel,
          r: (0.5 + Math.random() * 1.8) * Math.max(0.8, escala),
          c: CORES[Math.floor(Math.random() * CORES.length)],
          a: 0.9,
          piso: 0.12 + Math.random() * 0.35,
        });
      }
      botao.textContent = "Explodir de novo";
      guia.dizer("Calma. É arte.", { chave: "supernova" });
      if (calmo) {
        // Sem animação: mostra direto o que sobra da explosão
        for (let s = 0; s < 160; s++) passo(1);
        t0 = performance.now() - 6000;
        novas = escolherNovas(1.6).map((s) => ({ ...s, t: 0 }));
        desenhar(performance.now());
        return;
      }
      ligar();
    }

    caixa.addEventListener("click", explodir);

    new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting;
      if (visivel) ligar();
    }).observe(caixa);

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) ligar();
    });

    let espera;
    window.addEventListener("resize", () => {
      clearTimeout(espera);
      espera = setTimeout(montar, 150);
    });
    montar();
  });

  /* ---------- A távola ---------- */
  parte(() => {
    const legenda = $("[data-legenda]");
    const lugares = $$(".lugar");
    for (const l of lugares) {
      const mostrar = () => {
        lugares.forEach((o) => o.removeAttribute("aria-current"));
        l.setAttribute("aria-current", "true");
        legenda.textContent = l.dataset.lugar;
      };
      l.addEventListener("click", mostrar);
      l.addEventListener("mouseenter", mostrar);
      l.addEventListener("focus", mostrar);
    }
  });

  /* ---------- Ligue os pontos ---------- */
  parte(() => {
    const raiz = $("[data-jogo]");
    const camada = $(".tabuleiro-estrelas", raiz);
    const ligados = $(".tabuleiro-ligados", raiz);
    const dicaG = $(".tabuleiro-dica", raiz);
    const placar = $("[data-ligacoes]", raiz);
    const msg = $("[data-jogo-msg]", raiz);
    const SVG = "http://www.w3.org/2000/svg";

    // As sete Plêiades, nas posições do símbolo (x %, y %, tamanho px)…
    const PLEIADES = [[18, 68.4, 7], [42.8, 62.6, 10], [60.1, 80, 6], [67.8, 31.6, 6], [77.1, 20, 5.5], [81.3, 60.6, 7], [82, 41.3, 4.5]];
    // …e sete estrelas só de passagem
    const PASSAGEM = [[8, 30, 5], [28, 22, 6], [50, 10, 4.5], [54, 44, 6.5], [93, 82, 5], [34, 88, 5.5], [93, 12, 4]];
    const ARESTAS = [[0, 1], [1, 2], [2, 5], [5, 6], [6, 4], [4, 3], [3, 1]];
    const chave = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
    const alvo = new Set(ARESTAS.map(([a, b]) => chave(a, b)));
    const todas = [
      ...PLEIADES.map(([x, y, t], id) => ({ x, y, t, id, real: true })),
      ...PASSAGEM.map(([x, y, t], i) => ({ x, y, t, id: 7 + i, real: false })),
    ];

    const botoes = new Map();
    const feitas = new Set();
    let sel = null;

    // Ordem de leitura (de cima para baixo) para o teclado não entregar a resposta
    todas
      .slice()
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .forEach((s, k) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = s.id === 1 ? "ponto alcyone" : "ponto";
        b.style.setProperty("--x", `${s.x}%`);
        b.style.setProperty("--y", `${s.y}%`);
        b.style.setProperty("--t", `${s.t}px`);
        b.setAttribute("aria-label", `Estrela ${k + 1}`);
        b.setAttribute("aria-pressed", "false");
        b.appendChild(document.createElement("span"));
        b.addEventListener("click", () => tocar(s));
        camada.appendChild(b);
        botoes.set(s.id, b);
      });

    function linha(a, b, classe) {
      const l = document.createElementNS(SVG, "line");
      l.setAttribute("x1", a.x);
      l.setAttribute("y1", a.y);
      l.setAttribute("x2", b.x);
      l.setAttribute("y2", b.y);
      if (classe) l.setAttribute("class", classe);
      return l;
    }

    function marcar(s) {
      botoes.forEach((b) => b.setAttribute("aria-pressed", "false"));
      if (s) botoes.get(s.id).setAttribute("aria-pressed", "true");
      sel = s;
    }

    function tremer(s) {
      const b = botoes.get(s.id);
      b.classList.remove("tremer");
      void b.offsetWidth;
      b.classList.add("tremer");
    }

    function tocar(s) {
      if (raiz.classList.contains("jogo--completo")) return;
      if (!s.real) {
        tremer(s);
        marcar(null);
        msg.textContent = "Essa não é das Sete Irmãs. Está só de passagem.";
        return;
      }
      if (!sel) {
        marcar(s);
        msg.textContent = "Agora toque numa vizinha dela.";
        return;
      }
      if (sel.id === s.id) {
        marcar(null);
        msg.textContent = "";
        return;
      }
      const k = chave(sel.id, s.id);
      if (alvo.has(k)) {
        if (!feitas.has(k)) {
          feitas.add(k);
          ligados.appendChild(linha(sel, s));
          botoes.get(sel.id).classList.add("ligado");
          botoes.get(s.id).classList.add("ligado");
          placar.textContent = String(feitas.size);
          msg.textContent = feitas.size < 7 ? "Isso. Continue a partir dela." : "";
        }
        marcar(s);
        if (feitas.size === 7) vencer();
      } else {
        const l = linha(sel, s, "errado");
        ligados.appendChild(l);
        setTimeout(() => l.remove(), 650);
        tremer(s);
        marcar(null);
        msg.textContent = "Essas duas não se ligam na Plêiade.";
      }
    }

    function vencer() {
      raiz.classList.add("jogo--completo");
      marcar(null);
      msg.textContent = "Você desenhou a Plêiade.";
      guia.dizer("Você desenhou a Plêiade. Já pode trabalhar num observatório.", { chave: "jogo" });
    }

    $("[data-dica-jogo]", raiz).addEventListener("click", () => {
      dicaG.replaceChildren(...ARESTAS.map(([a, b]) => linha(todas[a], todas[b])));
      msg.textContent = "É o mesmo desenho do céu lá de cima. A dica some em 2 segundos.";
      setTimeout(() => dicaG.replaceChildren(), 2200);
    });

    $("[data-recomecar]", raiz).addEventListener("click", () => {
      feitas.clear();
      ligados.replaceChildren();
      botoes.forEach((b) => b.classList.remove("ligado"));
      marcar(null);
      placar.textContent = "0";
      msg.textContent = "";
      raiz.classList.remove("jogo--completo");
    });
  });

  /* ---------- Rotas: copiar o e-mail ---------- */
  parte(() => {
    for (const b of $$("[data-copiar]")) {
      b.addEventListener("click", async () => {
        const saida = $("[data-copiado]", b.closest(".rota"));
        try {
          await navigator.clipboard.writeText(b.dataset.copiar);
          saida.textContent = "E-mail copiado.";
        } catch {
          saida.textContent = b.dataset.copiar;
        }
        setTimeout(() => { saida.textContent = ""; }, 3500);
      });
    }
  });
})();
