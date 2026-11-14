// Painel (Tasks 9 e 10): prévia do projeto em forma de página, com os blocos do construtor na ordem
// arrastada e o carrossel em leque funcionando (arrastar, setas e contador, como na Home).
// Mostra o português; os outros idiomas aparecem no editor. Não é idêntica à página final.
(function () {
  var CMS = window.CMS;
  var h = window.h;
  var React = window.__SVELTIA_CMS_REACT__;
  if (!CMS || !h || !React) return;

  CMS.registerPreviewStyle('/admin/previa.css?v=202611140700');

  function js(valor) {
    return valor && valor.toJS ? valor.toJS() : valor;
  }
  function pt(valor) {
    var v = js(valor);
    return v && typeof v === 'object' ? v.pt || '' : v || '';
  }
  function imagem(props, caminho) {
    if (!caminho) return '';
    var asset = props.getAsset(caminho);
    return asset ? String(asset) : caminho;
  }
  function miniatura(link) {
    var m = /(?:watch\?v=|shorts\/|embed\/|youtu\.be\/)([\w-]{11})/.exec(link || '');
    return m ? 'https://i.ytimg.com/vi/' + m[1] + '/hqdefault.jpg' : '';
  }
  function paragrafos(texto) {
    return String(texto || '')
      .split(/\n\s*\n/)
      .filter(function (p) { return p.trim(); })
      .map(function (p, i) { return h('p', { key: i }, p.replace(/\*\*\*(.+?)\*\*\*/g, '$1')); });
  }
  function video(link, chave) {
    var mini = miniatura(link);
    return h('div', { key: chave, className: 'midia video' }, [
      mini ? h('img', { key: 'i', src: mini, alt: '' }) : null,
      h('span', { key: 'p', className: 'play' }, '▶'),
    ]);
  }

  // Carrossel em leque: destaque no meio, as outras alternando dos lados, com arrastar, setas e contador
  function Leque(props) {
    var lista = props.imagens || [];
    var destaque = Math.min(Math.max((props.destaque || 1) - 1, 0), Math.max(lista.length - 1, 0));
    var outras = lista.filter(function (_, i) { return i !== destaque; });
    var esquerda = [];
    var direita = [];
    outras.forEach(function (src, i) { (i % 2 === 0 ? direita : esquerda).push(src); });
    var ordem = esquerda.reverse().concat(lista.length ? [lista[destaque]] : [], direita);
    var inicial = esquerda.length;

    var estado = React.useState(inicial);
    var atual = estado[0];
    var setAtual = estado[1];
    var arraste = React.useRef(null);
    React.useEffect(function () { setAtual(inicial); }, [lista.join('|'), destaque]);

    function ir(i) { setAtual(Math.max(0, Math.min(ordem.length - 1, i))); }
    function inicio(e) { arraste.current = e.clientX; }
    function fim(e) {
      if (arraste.current === null) return;
      var dx = e.clientX - arraste.current;
      arraste.current = null;
      if (Math.abs(dx) > 30) ir(atual + (dx < 0 ? 1 : -1));
    }

    return h('div', { className: 'leque-previa' }, [
      h('div', { key: 'p', className: 'leque-palco', onPointerDown: inicio, onPointerUp: fim, onPointerLeave: fim },
        ordem.map(function (src, i) {
          var d = i - atual;
          var ad = Math.abs(d);
          var estilo = {
            transform: 'translateX(' + d * 62 + '%) translateY(' + Math.pow(ad, 1.5) * 8 + '%) rotate(' + d * (4.5 + ad * 0.8) + 'deg)',
            zIndex: 100 - ad,
            opacity: ad > 3 ? 0 : 1,
          };
          return h('figure', { key: i, className: 'leque-cartao' + (d === 0 ? ' centro' : ''), style: estilo, onClick: function () { ir(i); } },
            String(src).indexOf('video:') === 0
              ? [src.slice(6) ? h('img', { key: 'i', src: imagem(props.base, src.slice(6)), alt: '', draggable: false }) : null, h('span', { key: 'p', className: 'play' }, '▶')]
              : h('img', { src: imagem(props.base, src), alt: '', draggable: false }));
        })),
      h('div', { key: 'c', className: 'leque-controles' }, [
        h('button', { key: 'a', type: 'button', onClick: function () { ir(atual - 1); }, 'aria-label': 'Anterior' }, '←'),
        h('span', { key: 'n' }, ordem.length ? atual + 1 + ' / ' + ordem.length : '0 / 0'),
        h('button', { key: 'b', type: 'button', onClick: function () { ir(atual + 1); }, 'aria-label': 'Próxima' }, '→'),
      ]),
    ]);
  }

  function bloco(props, secao, i) {
    var titulo = pt(secao.titulo);
    var cabeca = titulo && secao.tipo !== 'chamada' ? h('h2', { key: 't', className: secao.tipo === 'carrossel' ? 'titulo-carrossel' : '' }, titulo) : null;
    var corpo = null;
    if (secao.tipo === 'texto') corpo = h('div', { key: 'c' }, paragrafos(pt(secao.texto)));
    if (secao.tipo === 'video') corpo = (secao.videos || []).map(function (v, j) { return video(v.link, j); });
    if (secao.tipo === 'imagem-tela-cheia') corpo = h('img', { key: 'c', className: 'tela-cheia', src: imagem(props, secao.imagem), alt: '' });
    if (secao.tipo === 'galeria') {
      corpo = h('div', { key: 'c', className: 'galeria' }, (secao.imagens || []).map(function (item, j) {
        var src = typeof item === 'string' ? item : item.imagem;
        var formato = typeof item === 'string' ? secao.formato || 'grade' : item.formato;
        return h('div', { key: j, className: 'item ' + formato }, h('img', { src: imagem(props, src), alt: '' }));
      }));
    }
    if (secao.tipo === 'carrossel') {
      // Imagens e vídeos na ordem do painel; no cartão do vídeo, a capa (ou fundo escuro) com o play
      var itens = [];
      (secao.conteudo || []).forEach(function (c) {
        if (c.tipo === 'imagens') itens = itens.concat(c.imagens || []);
        else if (c.tipo === 'video') itens.push('video:' + (c.capa || ''));
      });
      corpo = h(Leque, { key: 'c', imagens: itens, destaque: secao.destaque, base: props });
    }
    if (secao.tipo === 'chamada') {
      corpo = h('div', { key: 'c', className: 'chamada' }, [
        h('p', { key: 1, className: 'chamada-titulo' }, pt(secao.titulo)),
        pt(secao.texto) ? h('p', { key: 2 }, pt(secao.texto)) : null,
        h('span', { key: 3, className: 'chamada-botao' }, pt(secao.botao) + ' ↗'),
      ]);
    }
    return h('section', { key: i, className: 'bloco bloco-' + secao.tipo }, [cabeca, corpo]);
  }

  function Projeto(props) {
    var dados = props.entry.get('data');
    var topo = dados.get('topo') || 'video';
    var videos = js(dados.get('videos')) || [];
    var galeria = js(dados.get('galeria')) || [];
    var secoes = js(dados.get('secoes')) || [];
    var capa = imagem(props, dados.get('capa'));
    var ano = dados.get('ano');
    var midia = topo === 'video' && videos.length ? video(videos[0].link, 'v') : capa ? h('div', { key: 'm', className: 'midia' }, h('img', { src: capa, alt: '' })) : null;

    return h('div', { className: 'pagina' }, [
      dados.get('publicado') ? null : h('p', { key: 'r', className: 'aviso' }, 'Rascunho: não aparece no site'),
      h('section', { key: 'c', className: 'cinema' }, [
        h('h1', { key: 't' }, pt(dados.get('titulo')) || 'Título do projeto'),
        h('p', { key: 'k', className: 'categoria' }, pt(dados.get('categoria'))),
        midia,
      ]),
      ano ? h('dl', { key: 'f', className: 'ficha' }, h('div', null, [h('dt', { key: 1 }, 'Ano'), h('dd', { key: 2 }, String(ano))])) : null,
      h('p', { key: 'res', className: 'resumo' }, pt(dados.get('resumo'))),
      h('section', { key: 's', className: 'bloco' }, [h('h2', { key: 1 }, 'Sobre o projeto'), h('div', { key: 2 }, paragrafos(pt(dados.get('sobre'))))]),
      secoes.map(function (s, i) { return bloco(props, s, 'b' + i); }),
      galeria.length
        ? h('section', { key: 'g', className: 'bloco' }, [
            h('h2', { key: 1 }, 'Galeria'),
            h('div', { key: 2, className: 'galeria' }, galeria.map(function (item, i) {
              if (item.tipo === 'video') return h('div', { key: i, className: 'item larga' }, video(item.link, 'v'));
              return h('div', { key: i, className: 'item ' + (item.formato || 'larga') }, h('img', { src: imagem(props, item.imagem), alt: '' }));
            })),
          ])
        : null,
    ]);
  }

  // As duas coleções (Publicados e Rascunhos) são a mesma pasta; a prévia vale para as duas
  CMS.registerPreviewTemplate('projetos', Projeto);
  CMS.registerPreviewTemplate('rascunhos', Projeto);

  // Prévia da Home (pedido do dono, 14/11/2026): a dobra dos Bastidores, com o carrossel em leque funcionando,
  // na ordem e com o destaque escolhidos. As outras seções da Home não aparecem aqui (só no site)
  function Home(props) {
    var dados = props.entry.get('data');
    var textos = js(dados.get('textos')) || {};
    var b = textos.bastidores || {};
    var carrossel = js(dados.get('carrossel')) || {};
    var itens = [];
    (carrossel.conteudo || []).forEach(function (c) {
      if (c.tipo === 'imagens') itens = itens.concat(c.imagens || []);
      else if (c.tipo === 'video') itens.push('video:' + (c.capa || ''));
    });
    return h('div', { className: 'pagina home-previa' }, [
      h('p', { key: 'a', className: 'aviso-home' }, 'Prévia da dobra Bastidores. As outras seções da Home aparecem só no site.'),
      h('section', { key: 'b', className: 'bastidores' }, [
        h('h2', { key: 't', className: 'bastidores-titulo' }, [
          h('span', { key: 1, className: 'sans' }, pt(b.sans) || 'BASTIDORES'),
          h('span', { key: 2, className: 'serifa' }, pt(b.serifa)),
        ]),
        itens.length
          ? h(Leque, { key: 'l', imagens: itens, destaque: carrossel.destaque, base: props })
          : h('p', { key: 'v', className: 'vazio' }, 'Nenhuma imagem escolhida: o site mostra as capas dos projetos, na ordem de "Ordem dos projetos". Adicione imagens ou vídeos em "Bastidores: imagens e vídeos do carrossel".'),
        h('p', { key: 's', className: 'bastidores-sub' }, pt(b.subtitulo)),
      ]),
    ]);
  }
  CMS.registerPreviewTemplate('home', Home);

  // Tela inicial do painel (estilo Aethra): saudação e atalhos em cartões grandes
  var atalhos = [
    { icone: 'mail', titulo: 'Mensagens', texto: 'Contatos recebidos pelo formulário do site.', link: '#/pages/mensagens' },
    { icone: 'add_circle', titulo: 'Novo projeto', texto: 'Crie um projeto (comece como rascunho).', link: '#/collections/rascunhos/new' },
    { icone: 'folder_open', titulo: 'Meus projetos', texto: 'Editar, publicar ou deixar como rascunho.', link: '#/collections/projetos' },
    { icone: 'swap_vert', titulo: 'Ordem dos projetos', texto: 'Arraste para mudar a ordem em Trabalhos.', link: '#/collections/ordem/entries/ordem' },
    { icone: 'home', titulo: 'Home do site', texto: 'Destaques, textos e seções ligadas ou desligadas.', link: '#/collections/home/entries/home' },
    { icone: 'menu', titulo: 'Menu, rodapé e redes', texto: 'Links, redes sociais e ícone da aba.', link: '#/collections/site/entries/site' },
    { icone: 'open_in_new', titulo: 'Ver o site', texto: 'Abre elliotparker.com.br numa aba nova.', link: 'https://elliotparker.com.br', fora: true },
  ];

  // Tela inicial no estilo FacilityFlow: tabela dos projetos publicados à esquerda; números e atalhos à direita
  // GitHub com o login do próprio painel (o Sveltia guarda o token neste navegador depois do login).
  // Lê os projetos do repositório privado, inclusive rascunhos, e grava a situação com um commit (auditoria pelo Git, D-009).
  // Endereço do editor: rascunho abre na coleção Rascunhos (a coleção Publicados não mostra rascunhos) e a
  // entrada é o nome do arquivo, que pode ser diferente do campo url
  function editar(p) {
    return '#/collections/' + (p.publicado ? 'projetos' : 'rascunhos') + '/entries/' + encodeURIComponent(p.arquivo || p.url);
  }

  var REPO = 'Elliot-Parker/portfolio';
  var PASTA = 'src/content/projetos';
  function tokenGithub() {
    try {
      var u = JSON.parse(localStorage.getItem('sveltia-cms.user') || 'null');
      return (u && u.token) || '';
    } catch (e) {
      return '';
    }
  }
  function github(caminho, opcoes) {
    var t = tokenGithub();
    if (!t) return Promise.reject(new Error('sem login no GitHub'));
    opcoes = opcoes || {};
    var cab = Object.assign({ Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, opcoes.headers || {});
    return fetch('https://api.github.com/repos/' + REPO + caminho, Object.assign({}, opcoes, { headers: cab, cache: 'no-store' }));
  }
  function deBase64(b64) {
    var bin = atob(b64.replace(/\n/g, ''));
    return new TextDecoder().decode(Uint8Array.from(bin, function (c) { return c.charCodeAt(0); }));
  }
  function paraBase64(texto) {
    var bytes = new TextEncoder().encode(texto);
    var bin = '';
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin);
  }
  function listarNoGithub() {
    return github('/contents/' + PASTA + '?ref=main')
      .then(function (r) { if (!r.ok) throw new Error('GitHub ' + r.status); return r.json(); })
      .then(function (arquivos) {
        return Promise.all(arquivos.filter(function (a) { return a.type === 'file' && /\.json$/.test(a.name); }).map(function (a) {
          return github('/contents/' + PASTA + '/' + encodeURIComponent(a.name) + '?ref=main', { headers: { Accept: 'application/vnd.github.raw+json' } })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
              if (!d) return null;
              return {
                arquivo: a.name.replace(/\.json$/, ''),
                url: d.url || a.name.replace(/\.json$/, ''),
                titulo: (d.titulo && d.titulo.pt) || '',
                categoria: (d.categoria && d.categoria.pt) || '',
                ano: typeof d.ano === 'number' ? d.ano : null,
                publicado: d.publicado === true,
                capa: typeof d.capa === 'string' ? d.capa : '',
              };
            })
            .catch(function () { return null; });
        }));
      })
      .then(function (lista) { return lista.filter(Boolean); });
  }
  // Muda só o campo "publicado" do projeto, com o sha atual: se alguém salvou no meio, não sobrescreve (EDGE-003)
  function mudarNoGithub(url, publicar) {
    if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(url)) return Promise.reject(new Error('projeto inválido'));
    var caminho = '/contents/' + PASTA + '/' + url + '.json';
    return github(caminho + '?ref=main')
      .then(function (r) { if (!r.ok) throw new Error('projeto não encontrado'); return r.json(); })
      .then(function (arquivo) {
        var dados = JSON.parse(deBase64(arquivo.content));
        if ((dados.publicado === true) === publicar) return;
        dados.publicado = publicar;
        return github(caminho, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Painel: ' + (publicar ? 'publica' : 'torna rascunho') + ' o projeto "' + url + '"',
            content: paraBase64(JSON.stringify(dados, null, 2) + '\n'),
            sha: arquivo.sha,
            branch: 'main',
          }),
        }).then(function (r) {
          if (r.status === 409) throw new Error('o projeto mudou agora há pouco. Recarregue e tente de novo.');
          if (!r.ok) throw new Error('o GitHub recusou (' + r.status + ')');
        });
      });
  }

  // Gráfico de barras do Início (por área e por ano)
  function barras(chave, mapa, ordem, maior) {
    return h('div', { key: chave, className: 'ep-barras' }, ordem.map(function (nome) {
      return h('div', { key: nome, className: 'ep-barra' }, [
        h('span', { key: 1 }, nome),
        h('span', { key: 2, className: 'ep-trilho' }, h('span', { style: { width: (mapa[nome] / maior) * 100 + '%' } })),
        h('b', { key: 3 }, String(mapa[nome])),
      ]);
    }));
  }

  function Inicio() {
    var hora = new Date().getHours();
    var saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
    var estado = React.useState(null);
    var dados = estado[0];
    var setDados = estado[1];
    var busca = React.useState('');
    var abaEstado = React.useState('publicados');
    var aba = abaEstado[0];
    var aviso = React.useState('');
    var ocupado = React.useState('');
    // Lista completa (publicados e rascunhos) direto do GitHub, com o login do painel; se não der,
    // usa a lista de publicados gerada na montagem do site
    var publicacao = React.useState(null);

    function carregar() {
      // Publicados com os detalhes (áreas, imagens, o que falta, SEO), gerados na montagem do site
      fetch('/admin/projetos.json', { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .catch(function () { return { projetos: [], seo: [] }; })
        .then(function (site) {
          var extras = {};
          site.projetos.forEach(function (p) { extras[p.url] = p; });
          var base = { geradoEm: site.geradoEm, seo: site.seo || [] };
          // Lista completa (com rascunhos) direto do repositório privado, com o login do painel no GitHub.
          // Rascunhos nunca vão para a parte pública do site (SEC-002), por isso não estão no projetos.json
          return listarNoGithub()
            .then(function (lista) {
              setDados(Object.assign(base, { completa: true, projetos: lista.map(function (p) { return Object.assign({}, extras[p.url] || {}, p); }) }));
            })
            .catch(function () {
              setDados(Object.assign(base, { completa: false, projetos: site.projetos.map(function (p) { return Object.assign({}, p, { publicado: true }); }) }));
            });
        });
      // Situação da última publicação (EDGE-012): avisa quando falhou
      github('/actions/workflows/build.yml/runs?branch=main&per_page=1')
        .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
        .then(function (d) { publicacao[1]((d.workflow_runs || [])[0] || null); })
        .catch(function () {});
    }
    React.useEffect(carregar, []);

    function mudar(p, publicar) {
      window.epConfirmar({
        titulo: publicar ? 'Publicar o projeto?' : 'Tornar rascunho?',
        texto: publicar
          ? '"' + p.titulo + '" entra no site em cerca de 2 minutos.'
          : '"' + p.titulo + '" sai do site em cerca de 2 minutos e fica guardado na aba Rascunhos. Dá para publicar de novo quando quiser.',
        confirmar: publicar ? 'Publicar' : 'Tornar rascunho',
      }).then(function (sim) {
        if (sim) aplicar(p, publicar);
      });
    }

    function aplicar(p, publicar) {
      ocupado[1](p.url);
      mudarNoGithub(p.arquivo || p.url, publicar)
        .then(function () {
          ocupado[1]('');
          aviso[1]((publicar ? 'Publicado' : 'Agora é rascunho') + ': "' + p.titulo + '". O site atualiza em cerca de 2 minutos. Antes de editar esse projeto no painel, recarregue a página.');
          setDados(function (atual) {
            return Object.assign({}, atual, { projetos: atual.projetos.map(function (x) { return x.url === p.url ? Object.assign({}, x, { publicado: publicar }) : x; }) });
          });
        })
        .catch(function (e) { ocupado[1](''); aviso[1]('Não deu certo: ' + e.message); });
    }

    var todos = (dados && dados.projetos) || [];
    var lista = todos.filter(function (p) { return aba === 'rascunhos' ? !p.publicado : p.publicado; });
    var termo = busca[0].toLowerCase();
    var filtrados = lista.filter(function (p) { return !termo || (p.titulo + ' ' + p.categoria).toLowerCase().indexOf(termo) !== -1; });
    var publicados = todos.filter(function (p) { return p.publicado; });
    var anos = publicados.map(function (p) { return p.ano; }).filter(Boolean);
    var porArea = {};
    publicados.forEach(function (p) { (p.areas || []).forEach(function (a) { porArea[a] = (porArea[a] || 0) + 1; }); });
    var maiorArea = Math.max.apply(null, [1].concat(Object.keys(porArea).map(function (k) { return porArea[k]; })));

    var tabela = h('section', { key: 'tab', className: 'ep-painel ep-tabela' }, [
      h('div', { key: 'topo', className: 'ep-tabela-topo' }, [
        h('div', { key: 't' }, [h('p', { key: 1, className: 'ep-rotulo' }, 'Projetos'), h('div', { key: 2, className: 'ep-abas', role: 'tablist' }, [
          ['publicados', 'Publicados'], ['rascunhos', 'Rascunhos'],
        ].map(function (a) {
          var n = todos.filter(function (p) { return a[0] === 'rascunhos' ? !p.publicado : p.publicado; }).length;
          return h('button', { key: a[0], type: 'button', role: 'tab', 'aria-selected': aba === a[0], className: 'ep-aba' + (aba === a[0] ? ' ativa' : ''), onClick: function () { abaEstado[1](a[0]); } }, a[1] + ' ' + n);
        }))]),
        h('label', { key: 'b', className: 'ep-busca' }, [
          h('span', { key: 'i', className: 'material-symbols-outlined', 'aria-hidden': 'true' }, 'search'),
          h('input', { key: 'c', type: 'search', placeholder: 'Buscar projeto...', value: busca[0], onChange: function (e) { busca[1](e.target.value); } }),
        ]),
        h('a', { key: 'n', className: 'ep-botao-escuro', href: '#/collections/rascunhos/new' }, [
          h('span', { key: 'i', className: 'material-symbols-outlined', 'aria-hidden': 'true' }, 'add'), 'Novo projeto',
        ]),
      ]),
      h('div', { key: 'cab', className: 'ep-linha ep-cabecalho' }, ['Projeto', 'Área', 'Situação', 'Ano', ''].map(function (t, i) { return h('span', { key: i }, t); })),
      dados === null
        ? h('p', { key: 'c', className: 'ep-vazio' }, 'Carregando...')
        : filtrados.map(function (p) {
            return h('div', { key: p.url, className: 'ep-linha' }, [
              h('a', { key: 1, className: 'ep-projeto', href: editar(p) }, [
                p.publicado && p.capa ? h('img', { key: 'i', src: p.capa, alt: '' }) : h('span', { key: 'i', className: 'ep-sem-capa material-symbols-outlined', 'aria-hidden': 'true' }, 'edit_note'),
                h('span', { key: 't' }, [h('b', { key: 1 }, p.titulo), h('small', { key: 2 }, p.categoria)]),
              ]),
              h('span', { key: 2, className: 'ep-area' }, (p.areas || []).join(', ')),
              h('span', { key: 3 }, h('span', { className: 'ep-status' + (p.publicado ? '' : ' rascunho') }, [h('i', { key: 1 }), p.publicado ? 'Publicado' : 'Rascunho'])),
              h('span', { key: 4, className: 'ep-ano' }, p.ano || '-'),
              h('span', { key: 5, className: 'ep-acoes' }, [
                dados.completa
                  ? h('button', { key: 's', type: 'button', className: 'ep-trocar' + (p.publicado ? '' : ' publicar'), disabled: ocupado[0] === p.url, onClick: function () { mudar(p, !p.publicado); } },
                      ocupado[0] === p.url ? 'Salvando...' : p.publicado ? 'Tornar rascunho' : 'Publicar')
                  : null,
                h('a', { key: 'e', href: editar(p), title: 'Editar', className: 'material-symbols-outlined' }, 'edit'),
                p.publicado ? h('a', { key: 'v', href: 'https://elliotparker.com.br/work/' + p.url, target: '_blank', rel: 'noopener noreferrer', title: 'Ver no site', className: 'material-symbols-outlined' }, 'north_east') : null,
              ]),
            ]);
          }),
      aviso[0] ? h('p', { key: 'a', className: 'ep-aviso' }, aviso[0]) : null,
      h('p', { key: 'r', className: 'ep-rodape-tabela' }, dados && !dados.completa
        ? 'Mostrando só os publicados: para ver rascunhos e usar o botão Tornar rascunho, saia e entre de novo no painel.'
        : String(filtrados.length) + ' de ' + lista.length + (aba === 'rascunhos' ? ' rascunhos.' : ' publicados.')),
    ]);

    var soma = function (campo) { return publicados.reduce(function (n, p) { return n + (p[campo] || 0); }, 0); };
    var porAno = {};
    publicados.forEach(function (p) { if (p.ano) porAno[p.ano] = (porAno[p.ano] || 0) + 1; });
    var maiorAno = Math.max.apply(null, [1].concat(Object.keys(porAno).map(function (k) { return porAno[k]; })));
    var incompletos = publicados.filter(function (p) { return p.falta && p.falta.length; });
    var montagem = dados && dados.geradoEm ? new Date(dados.geradoEm) : null;
    var cartoes = h('div', { key: 'c', className: 'ep-cartoes' }, [
      ['public', String(publicados.length), 'Publicados'],
      ['edit_note', dados && dados.completa ? String(todos.length - publicados.length) : '-', 'Rascunhos'],
      ['photo_library', String(soma('imagens')), 'Imagens nos projetos'],
      ['dashboard_customize', String(soma('blocos')), 'Blocos do construtor'],
      ['schedule', montagem ? montagem.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-', montagem ? 'Site atualizado em ' + montagem.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'Última atualização do site'],
    ].map(function (c) {
      return h('div', { key: c[2], className: 'ep-painel ep-cartao' }, [
        h('span', { key: 'i', className: 'ep-icone material-symbols-outlined', 'aria-hidden': 'true' }, c[0]),
        h('span', { key: 't', className: 'ep-cartao-textos' }, [h('b', { key: 1 }, c[1]), h('span', { key: 2 }, c[2])]),
      ]);
    }));
    var completar = h('section', { key: 'falta', className: 'ep-painel' }, [
      h('p', { key: 'r', className: 'ep-rotulo' }, 'Para completar'),
      incompletos.length === 0
        ? h('p', { key: 'ok', className: 'ep-legenda' }, 'Tudo completo nos projetos publicados.')
        : h('div', { key: 'l', className: 'ep-faltas' }, incompletos.map(function (p) {
            return h('a', { key: p.url, className: 'ep-falta', href: editar(p) }, [
              h('b', { key: 1 }, p.titulo),
              h('span', { key: 2 }, 'Falta: ' + p.falta.join(', ')),
            ]);
          })),
    ]);

    // Saúde do SEO: pendências do site e de cada projeto publicado (calculadas na montagem do site)
    var seoSite = (dados && dados.seo) || [];
    var seoProjetos = publicados.filter(function (p) { return p.seo && p.seo.length; });
    var emOrdem = publicados.length - seoProjetos.length;
    var saude = h('section', { key: 'seo', className: 'ep-painel' }, [
      h('p', { key: 'r', className: 'ep-rotulo' }, 'Saúde do SEO'),
      h('p', { key: 'n', className: 'ep-numero' }, emOrdem + ' de ' + publicados.length),
      h('p', { key: 'l', className: 'ep-legenda' }, 'projetos com título e descrição no tamanho ideal'),
      h('div', { key: 'f', className: 'ep-faltas' }, seoSite.map(function (t, i) {
        return h('a', { key: 's' + i, className: 'ep-falta', href: '#/collections/site/entries/site' }, [h('b', { key: 1 }, 'Site'), h('span', { key: 2 }, t)]);
      }).concat(seoProjetos.map(function (p) {
        return h('a', { key: p.url, className: 'ep-falta', href: editar(p) }, [
          h('b', { key: 1 }, p.titulo),
          h('span', { key: 2 }, p.seo.join('; ')),
        ]);
      }))),
      h('p', { key: 'd', className: 'ep-legenda ep-dica-seo' }, [
        'Visitas e posição no Google ficam no ',
        h('a', { key: 'a', href: 'https://search.google.com/search-console', target: '_blank', rel: 'noopener noreferrer' }, 'Google Search Console'),
        '.',
      ]),
    ]);

    var lateral = h('aside', { key: 'lat', className: 'ep-lateral' }, [
      h('section', { key: 'num', className: 'ep-painel' }, [
        h('p', { key: 'r', className: 'ep-rotulo' }, 'Atividade'),
        h('p', { key: 'n', className: 'ep-numero' }, String(publicados.length)),
        h('p', { key: 'l', className: 'ep-legenda' }, 'projetos publicados' + (anos.length ? ' · ' + Math.min.apply(null, anos) + ' a ' + Math.max.apply(null, anos) : '')),
        barras('b', porArea, Object.keys(porArea), maiorArea),
        Object.keys(porAno).length ? h('p', { key: 'ra', className: 'ep-rotulo ep-rotulo-ano' }, 'Por ano') : null,
        barras('ba', porAno, Object.keys(porAno).sort().reverse(), maiorAno),
      ]),
      h('section', { key: 'at', className: 'ep-painel' }, [
        h('p', { key: 'r', className: 'ep-rotulo' }, 'Atalhos'),
        h('div', { key: 'l', className: 'ep-atalhos' }, atalhos.map(function (a) {
          return h('a', { key: a.titulo, className: 'ep-atalho', href: a.link, target: a.fora ? '_blank' : undefined, rel: a.fora ? 'noopener noreferrer' : undefined }, [
            h('span', { key: 'i', className: 'ep-icone material-symbols-outlined', 'aria-hidden': 'true' }, a.icone),
            h('span', { key: 'x', className: 'ep-textos' }, [h('b', { key: 1 }, a.titulo), h('span', { key: 2 }, a.texto)]),
            h('span', { key: 'f', className: 'ep-seta material-symbols-outlined', 'aria-hidden': 'true' }, 'north_east'),
          ]);
        })),
      ]),
      completar,
      saude,
    ]);

    return h('div', { className: 'ep-inicio' }, [
      h('header', { key: 'h', className: 'ep-cabeca' }, [
        h('h1', { key: 't' }, saudacao + ', Elliot'),
        h('p', { key: 's', className: 'ep-sub' }, 'Cada alteração salva vai ao ar em cerca de 2 minutos.'),
      ]),
      publicacao[0] && ['failure', 'cancelled', 'timed_out', 'startup_failure'].indexOf(publicacao[0].conclusion) !== -1
        ? h('p', { key: 'falhou', className: 'ep-falhou' }, [
            h('span', { key: 'i', className: 'material-symbols-outlined', 'aria-hidden': 'true' }, 'error'),
            'A última publicação falhou: o site continua na versão anterior. ',
            h('a', { key: 'l', href: publicacao[0].html_url, target: '_blank', rel: 'noopener noreferrer' }, 'Ver o motivo no GitHub'),
          ])
        : publicacao[0] && publicacao[0].status !== 'completed'
          ? h('p', { key: 'publicando', className: 'ep-publicando' }, 'Publicando a última alteração...')
          : null,
      cartoes,
      h('div', { key: 'g', className: 'ep-colunas' }, [tabela, lateral]),
    ]);
  }

  // O painel abre no Início (o Sveltia abre em Projetos; logo depois de entrar, troca para o Início)
  var inicioAberto = false;
  function abrirInicio() {
    if (inicioAberto) return;
    if (/^#\/collections\/projetos\/?$/.test(location.hash) || location.hash === '' || location.hash === '#/') {
      inicioAberto = true;
      location.hash = '#/pages/inicio';
    }
  }
  window.addEventListener('hashchange', function primeiro() {
    abrirInicio();
    window.removeEventListener('hashchange', primeiro);
  });
  setTimeout(function () {
    if (!inicioAberto && /^#\/collections\/projetos\/?$/.test(location.hash)) abrirInicio();
  }, 1500);

  if (CMS.registerCustomPage) CMS.registerCustomPage({ id: 'inicio', label: 'Início', icon: 'space_dashboard', component: Inicio });
})();
