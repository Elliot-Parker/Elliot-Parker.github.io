// Janela de confirmação do painel, no visual do painel (no lugar do aviso cinza do navegador).
// window.epConfirmar({ titulo, texto, confirmar, perigo }) devolve uma promessa: true se a pessoa confirmou.
// Os textos entram como texto, nunca como HTML (podem ter nome de visitante, SEC-004).
(function () {
  'use strict';
  window.epConfirmar = function (opcoes) {
    return new Promise(function (resolver) {
      var janela = document.createElement('dialog');
      janela.className = 'ep-confirmar';
      janela.setAttribute('aria-labelledby', 'ep-confirmar-titulo');

      var titulo = document.createElement('h2');
      titulo.id = 'ep-confirmar-titulo';
      titulo.textContent = opcoes.titulo || 'Confirmar';
      var texto = document.createElement('p');
      texto.textContent = opcoes.texto || '';

      var botoes = document.createElement('div');
      botoes.className = 'ep-confirmar-botoes';
      var cancelar = document.createElement('button');
      cancelar.type = 'button';
      cancelar.className = 'ep-confirmar-cancelar';
      cancelar.textContent = opcoes.cancelar || 'Cancelar';
      var ok = document.createElement('button');
      ok.type = 'button';
      ok.className = 'ep-confirmar-ok' + (opcoes.perigo ? ' perigo' : '');
      ok.textContent = opcoes.confirmar || 'Confirmar';
      botoes.append(cancelar, ok);
      janela.append(titulo, texto, botoes);
      document.body.appendChild(janela);

      var resposta = false;
      function fechar(valor) {
        resposta = valor;
        janela.close();
      }
      janela.addEventListener('close', function () {
        janela.remove();
        resolver(resposta);
      });
      // Clique fora da caixa cancela
      janela.addEventListener('click', function (e) {
        if (e.target === janela) fechar(false);
      });
      cancelar.addEventListener('click', function () { fechar(false); });
      ok.addEventListener('click', function () { fechar(true); });
      janela.showModal();
      // Foco no Cancelar: Enter sem querer não confirma uma ação grande
      cancelar.focus();
    });
  };
})();
