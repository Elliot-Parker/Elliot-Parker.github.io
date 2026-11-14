// Tela de Mensagens do painel (Task 11, D-008): mensagens do formulário guardadas no banco do Worker (D1).
// Lista, ver, apagar com confirmação, destaque para quem não recebeu o email e troca do email de destino.
// Todo texto do visitante aparece como texto (o React escapa), nunca como HTML (SEC-004, CA-012).
(function () {
  'use strict';
  if (!window.CMS || !CMS.registerCustomPage) return;
  var h = window.h;
  var React = window.__SVELTIA_CMS_REACT__;

  function quando(iso) {
    try {
      return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return iso;
    }
  }

  // Dias até a limpeza automática de 6 meses (RN-003)
  function diasRestantes(iso) {
    var limite = new Date(iso);
    limite.setMonth(limite.getMonth() + 6);
    return Math.max(0, Math.ceil((limite - Date.now()) / 86400000));
  }

  function pedir(url, opcoes) {
    opcoes = opcoes || {};
    opcoes.credentials = 'same-origin';
    opcoes.cache = 'no-store';
    return fetch(url, opcoes).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.erro || 'Erro ' + r.status);
        return d;
      });
    });
  }

  function Campo(rotulo, valor) {
    return h('div', { key: rotulo, className: 'ep-msg-campo' }, [
      h('span', { key: 1 }, rotulo),
      h('b', { key: 2 }, valor || '(não informado)'),
    ]);
  }

  function Mensagens() {
    var lista = React.useState(null);
    var escolhida = React.useState(null);
    var aviso = React.useState('');
    var busca = React.useState('');
    var destino = React.useState('');
    var novoDestino = React.useState('');
    var ocupado = React.useState(false);

    function carregar() {
      pedir('/api/admin/mensagens')
        .then(function (d) {
          lista[1](d.mensagens);
          if (d.mensagens.length && !escolhida[0]) escolhida[1](d.mensagens[0].id);
        })
        .catch(function (e) { lista[1]([]); aviso[1]('Não foi possível carregar as mensagens: ' + e.message); });
      pedir('/api/admin/email-destino').then(function (d) { destino[1](d.email); }).catch(function () {});
    }
    React.useEffect(carregar, []);

    function apagar(m) {
      window.epConfirmar({
        titulo: 'Apagar esta mensagem?',
        texto: 'A mensagem de "' + m.nome + '" some do painel e não dá para recuperar. A cópia no seu email continua lá.',
        confirmar: 'Apagar',
        perigo: true,
      }).then(function (sim) { if (sim) apagarDeVez(m); });
    }

    function apagarDeVez(m) {
      ocupado[1](true);
      pedir('/api/admin/mensagens/' + encodeURIComponent(m.id), { method: 'DELETE' })
        .then(function () {
          var resto = lista[0].filter(function (x) { return x.id !== m.id; });
          lista[1](resto);
          escolhida[1](resto.length ? resto[0].id : null);
          aviso[1]('Mensagem apagada. Se foi um pedido de exclusão, apague também a cópia no seu email.');
        })
        .catch(function (e) { aviso[1]('Não deu certo: ' + e.message); })
        .finally(function () { ocupado[1](false); });
    }

    function trocarDestino(e) {
      e.preventDefault();
      var email = novoDestino[0].trim();
      if (!email) return;
      window.epConfirmar({
        titulo: 'Trocar o email de destino?',
        texto: 'As próximas mensagens vão para ' + email + '. O email atual (' + destino[0] + ') recebe um aviso da troca.',
        confirmar: 'Trocar',
      }).then(function (sim) { if (sim) trocarDeVez(email); });
    }

    function trocarDeVez(email) {
      ocupado[1](true);
      pedir('/api/admin/email-destino', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email }) })
        .then(function (d) {
          destino[1](d.email);
          novoDestino[1]('');
          aviso[1](d.mudou ? 'Pronto: as próximas mensagens vão para ' + d.email + '. O email antigo recebeu um aviso.' : 'Esse já é o email atual.');
        })
        .catch(function (e) { aviso[1]('Não deu certo: ' + e.message); })
        .finally(function () { ocupado[1](false); });
    }

    var todas = lista[0] || [];
    var termo = busca[0].toLowerCase();
    var filtradas = todas.filter(function (m) {
      return !termo || [m.nome, m.email, m.descricao, m.tipo_servico].join(' ').toLowerCase().indexOf(termo) !== -1;
    });
    var atual = todas.filter(function (m) { return m.id === escolhida[0]; })[0];
    var semEmail = todas.filter(function (m) { return !m.email_enviado; }).length;

    var coluna = h('section', { key: 'lista', className: 'ep-painel ep-msg-lista' }, [
      h('div', { key: 'topo', className: 'ep-tabela-topo' }, [
        h('div', { key: 't' }, [h('p', { key: 1, className: 'ep-rotulo' }, 'Caixa de entrada'), h('h2', { key: 2 }, todas.length + (todas.length === 1 ? ' mensagem' : ' mensagens'))]),
        h('label', { key: 'b', className: 'ep-busca' }, [
          h('span', { key: 'i', className: 'material-symbols-outlined', 'aria-hidden': 'true' }, 'search'),
          h('input', { key: 'c', type: 'search', placeholder: 'Buscar...', value: busca[0], onChange: function (e) { busca[1](e.target.value); } }),
        ]),
      ]),
      lista[0] === null
        ? h('p', { key: 'c', className: 'ep-vazio' }, 'Carregando...')
        : filtradas.length === 0
          ? h('p', { key: 'v', className: 'ep-vazio' }, todas.length ? 'Nada encontrado.' : 'Nenhuma mensagem ainda.')
          : h('ul', { key: 'l', className: 'ep-msg-itens' }, filtradas.map(function (m) {
              return h('li', { key: m.id }, h('button', {
                type: 'button',
                className: 'ep-msg-item' + (m.id === escolhida[0] ? ' ativa' : '') + (m.email_enviado ? '' : ' sem-email'),
                onClick: function () { escolhida[1](m.id); },
              }, [
                h('span', { key: 'n', className: 'ep-msg-nome' }, [h('b', { key: 1 }, m.nome), h('small', { key: 2 }, quando(m.recebida_em))]),
                h('span', { key: 't', className: 'ep-msg-trecho' }, String(m.descricao || '').slice(0, 90)),
                m.email_enviado ? null : h('span', { key: 'a', className: 'ep-msg-alerta' }, 'Email não chegou'),
              ]));
            })),
    ]);

    var detalhe = h('section', { key: 'det', className: 'ep-painel ep-msg-detalhe' }, atual
      ? [
          h('div', { key: 'topo', className: 'ep-msg-cabeca' }, [
            h('div', { key: 't' }, [h('p', { key: 1, className: 'ep-rotulo' }, quando(atual.recebida_em) + ' · idioma ' + String(atual.idioma || '-').toUpperCase()), h('h2', { key: 2 }, atual.nome)]),
            h('div', { key: 'b', className: 'ep-msg-botoes' }, [
              h('a', { key: 'r', className: 'ep-botao-escuro', href: 'mailto:' + encodeURIComponent(atual.email) + '?subject=' + encodeURIComponent('Re: seu contato pelo site') }, [
                h('span', { key: 'i', className: 'material-symbols-outlined', 'aria-hidden': 'true' }, 'reply'), 'Responder',
              ]),
              h('button', { key: 'x', type: 'button', className: 'ep-trocar', disabled: ocupado[0], onClick: function () { apagar(atual); } }, 'Apagar'),
            ]),
          ]),
          atual.email_enviado ? null : h('p', { key: 'al', className: 'ep-aviso' }, 'O email desta mensagem não chegou na sua caixa (falha no envio). Ela só está guardada aqui.'),
          h('div', { key: 'c', className: 'ep-msg-campos' }, [
            Campo('Email', atual.email),
            Campo('WhatsApp/telefone', atual.telefone),
            Campo('Tipo de serviço', atual.tipo_servico),
            Campo('Faixa de orçamento', atual.faixa_orcamento),
            Campo('Prazo desejado', atual.prazo),
          ]),
          h('p', { key: 'dr', className: 'ep-rotulo' }, 'Descrição do projeto'),
          h('p', { key: 'd', className: 'ep-msg-texto' }, atual.descricao),
          h('p', { key: 'l', className: 'ep-legenda' }, 'Apagada sozinha em ' + diasRestantes(atual.recebida_em) + ' dias (6 meses depois de recebida).'),
        ]
      : h('p', { className: 'ep-vazio' }, lista[0] === null ? '' : 'Escolha uma mensagem.'));

    var config = h('section', { key: 'cfg', className: 'ep-painel ep-msg-config' }, [
      h('p', { key: 'r', className: 'ep-rotulo' }, 'Email que recebe as mensagens'),
      h('p', { key: 'e', className: 'ep-msg-destino' }, destino[0] || '...'),
      h('form', { key: 'f', className: 'ep-msg-form', onSubmit: trocarDestino }, [
        h('input', { key: 'i', type: 'email', required: true, placeholder: 'Novo email', value: novoDestino[0], onChange: function (e) { novoDestino[1](e.target.value); } }),
        h('button', { key: 'b', type: 'submit', className: 'ep-trocar', disabled: ocupado[0] }, 'Trocar'),
      ]),
      h('p', { key: 'l', className: 'ep-legenda' }, 'O email atual recebe um aviso da troca. Se o aviso não sair, nada é trocado.'),
    ]);

    return h('div', { className: 'ep-inicio ep-mensagens' }, [
      h('header', { key: 'h', className: 'ep-cabeca' }, [
        h('h1', { key: 't' }, 'Mensagens'),
        h('p', { key: 's', className: 'ep-sub' }, 'Recebidas pelo formulário do site. Ficam guardadas por 6 meses.' + (semEmail ? ' ' + semEmail + ' sem email entregue.' : '')),
      ]),
      aviso[0] ? h('p', { key: 'a', className: 'ep-aviso ep-msg-topo-aviso' }, aviso[0]) : null,
      h('div', { key: 'g', className: 'ep-msg-grade' }, [coluna, detalhe]),
      config,
    ]);
  }

  CMS.registerCustomPage({ id: 'mensagens', label: 'Mensagens', icon: 'mail', component: Mensagens });
})();
