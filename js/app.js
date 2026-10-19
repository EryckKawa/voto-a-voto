/* Voto a voto — inicialização. */
(function () {
  "use strict";
  const V = window.V;
  V.ligarBusca(document.getElementById("busca"), document.getElementById("busca-lista"));

  /* endereço antigo: as disputas apertadas saíram do site; quem chega por ele vai para o mapa */
  V.rota(/^\/apertadas$/, async function () { location.replace("#/mapa"); });

  V.iniciarRotas();
})();
