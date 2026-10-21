# Plêiade · site

Site do grupo Plêiade, que reúne as marcas **hellys.** e **INNOVAR**. É uma carta celeste interativa: o visitante acende as sete estrelas do símbolo, conhece cada marca como um fenômeno diferente do mesmo céu e escolhe uma rota de contato.

No ar em **https://hellys-cpu.github.io/pleiade/**

## O que tem

- **O céu:** o cursor funciona como uma luneta, e as sete estrelas acendem e se ligam ao passar por elas ou ao rolar a página.
- **hellys. · satélite artificial:**
  - os nanorrobôs montam o satélite, do caos à ordem;
  - Atena, a engenheira de bordo, solda as peças;
  - Aurora, a comunicação de bordo, troca dados com a antena.
- **INNOVAR · supernova:** a explosão que espalha os elementos de que nascem novas estrelas.
- **As próximas · região não mapeada:** cinco lugares vagos na távola.
- **A távola, Ligue os pontos e Escolha uma rota.**
- **Aurora, a guia,** que conversa com quem visita.

Sem bibliotecas: HTML, CSS e JavaScript puros. O site funciona no celular e respeita quem pede menos movimento (`prefers-reduced-motion`): tudo fica parado e legível.

## Estrutura

| Caminho | O que é |
| --- | --- |
| `public/index.html` | A página |
| `public/estilo.css` | Estilos, com os tokens do design system da Plêiade |
| `public/site.js` | Céu, satélite, supernova, távola, jogo e guia |
| `public/marca/` | Logos da Plêiade e da hellys. |
| `public/og.jpg` | Imagem de prévia do link (1200 × 630) |
| `og/og.html` | Fonte da imagem de prévia |

## Rodar no computador

Qualquer servidor estático serve a pasta `public`, por exemplo:

```bash
python -m http.server 5190 --directory public
```

Depois é só abrir `http://localhost:5190`.

## Publicar

Cada `push` na `main` publica a pasta `public` no GitHub Pages pelo fluxo `.github/workflows/pages.yml`.

## Imagem de prévia

Para gerar a `og.jpg` de novo, tire um print de `og/og.html` em 1200 × 630, por exemplo com o Edge em modo headless:

```bash
msedge --headless=new --hide-scrollbars --window-size=1200,630 --virtual-time-budget=6000 --screenshot=og.png og/og.html
```

Depois converta para JPEG em `public/og.jpg`.
