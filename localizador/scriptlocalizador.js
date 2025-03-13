// Variável global para armazenar o mapa
let mapa;

document.getElementById("print-btn").addEventListener("click", function () {
  window.print();
});

// Função para carregar os dados do arquivo JSON
async function carregarDados() {
  try {
    const response = await fetch("dados.json");
    const data = await response.json();
    return data; // Retorna os dados do JSON
  } catch (error) {
    console.error("Erro ao carregar dados.json:", error);
    return null; // Retorna null caso ocorra um erro
  }
}

// Função para limpar todos os componentes antes de atualizar
function limparComponentes() {
  document.getElementById("erroMensagem").classList.add("hidden");
  document.getElementById("sugestoesPopup").classList.add("hidden");
  document.getElementById("resultado").classList.add("hidden");
  document.getElementById("qrcodeGoogle").innerHTML = "";
  document.getElementById("qrcodeWaze").innerHTML = "";

  // Limpa o conteúdo do mapa (Destruir o mapa existente, se houver)
  if (mapa) {
    mapa.remove();
    mapa = null;
  }
}

function criarMapa(
  latitudeInicial,
  longitudeInicial,
  latitudeDestino,
  longitudeDestino
) {
  mapa = L.map("map").setView([latitudeInicial, longitudeInicial], 16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(mapa);

  var origem = L.latLng(latitudeInicial, longitudeInicial);
  var destino = L.latLng(latitudeDestino, longitudeDestino);

  L.marker(destino).addTo(mapa);

  // Criar a rota
  var rota = L.Routing.control({
    waypoints: [origem, destino],
    routeWhileDragging: true,
    language: "pt-BR",
    units: "metric",
    showAlternatives: false,
    createMarker: function () {
      return null;
    },
  }).addTo(mapa);

  // Ajusta o zoom e centraliza a rota
  rota.on("routesfound", function (e) {
    var bounds = L.latLngBounds([origem, destino]);

    // Ajusta o zoom e centraliza a rota, com paddings
    mapa.fitBounds(bounds, { padding: [50, 50] });

    // Desloca o mapa para a direita (ajuste apenas no eixo X, mantendo Y em 0)
    // Desloca o mapa para a direita, sem mover verticalmente
    mapa.panBy([30, -200]);
  });
}

// Função para gerar os links e QR codes
function gerarLinksEQRcodes(latitudeDestino, longitudeDestino) {
  const googleMapsUrl = `https://www.google.com/maps?q=${latitudeDestino},${longitudeDestino}`;
  const wazeUrl = `https://waze.com/ul?ll=${latitudeDestino},${longitudeDestino}&navigate=yes`;

  document.getElementById("googleMapsBtn").href = googleMapsUrl;
  document.getElementById("wazeBtn").href = wazeUrl;
  document.getElementById("qrcodeGoogle").innerHTML = "";
  document.getElementById("qrcodeWaze").innerHTML = "";

  new QRCode(document.getElementById("qrcodeGoogle"), {
    text: googleMapsUrl,
    width: 200,
    height: 200,
  });

  new QRCode(document.getElementById("qrcodeWaze"), {
    text: wazeUrl,
    width: 200,
    height: 200,
  });
}

// Função para buscar as coordenadas com base no código informado
async function buscarCoordenadas() {
  const dados = await carregarDados();
  if (!dados) return;

  let codigo = document.getElementById("codigo").value.trim().toUpperCase();
  console.log(codigo);
  document.getElementById("codigo").value = codigo;

  limparComponentes();

  const local = dados.lotes[codigo] || dados.quintas[codigo];

  if (!local) {
    document.getElementById("erroMensagem").classList.remove("hidden");
    document.getElementById("resultado").classList.add("hidden");
    return;
  }
  document.getElementById("erroMensagem").classList.add("hidden");

  // Usando as coordenadas fixas como ponto inicial
  const latitudeInicial = -6.737965;
  const longitudeInicial = -35.628685;
  // Pega as coordenadas do destino do código (exemplo: do local em "lotes" ou "quintas")
  const latitudeDestino = local.latitude;
  const longitudeDestino = local.longitude;

  criarMapa(
    latitudeInicial,
    longitudeInicial,
    latitudeDestino,
    longitudeDestino
  );
  gerarLinksEQRcodes(latitudeDestino, longitudeDestino);
  document.getElementById("resultado").classList.remove("hidden");
  document.getElementById("areascomuns-dropdown").selectedIndex = 0;
  document.getElementById("resultadoTitulo").textContent = "Destino: " + codigo;
}

// Função para mostrar sugestões conforme o usuário digita
async function mostrarSugestoes() {
  const dados = await carregarDados();
  if (!dados) return;
  let input = document.getElementById("codigo").value.trim().toUpperCase();

  // Se não houver nada digitado, oculta o popup de sugestões
  if (input.length === 0) {
    document.getElementById("sugestoesPopup").classList.add("hidden");
    return;
  }
  // Filtra os códigos em lotes e quintas que começam com o texto digitado
  const sugestoesLotes = Object.keys(dados.lotes).filter(
    (cod) => cod.startsWith(input) && cod !== input
  );
  const sugestoesQuintas = Object.keys(dados.quintas).filter(
    (cod) => cod.startsWith(input) && cod !== input
  );

  const sugestoes = [...sugestoesLotes, ...sugestoesQuintas];
  exibirSugestoes(sugestoes);
}

// Função para exibir as sugestões em um popup
function exibirSugestoes(sugestoes) {
  const sugestoesPopup = document.getElementById("sugestoesPopup");
  const sugestoesList = document.getElementById("sugestoesList");

  sugestoesList.innerHTML = "";

  if (sugestoes.length === 0) {
    sugestoesPopup.classList.add("hidden");
    return;
  }

  // Cria um <li> para cada sugestão e adiciona um evento de clique
  sugestoes.forEach((sugestao) => {
    const li = document.createElement("li");
    li.textContent = sugestao;
    li.onclick = () => selecionarSugestao(sugestao);
    sugestoesList.appendChild(li);
  });
  // Força o scroll para o topo do popup sempre que ele for exibido
  sugestoesPopup.scrollTop = 0;
  // Exibe o popup de sugestões
  sugestoesPopup.classList.remove("hidden");
}

// Função chamada ao clicar em uma sugestão
function selecionarSugestao(sugestao) {
  document.getElementById("codigo").value = sugestao;
  document.getElementById("resultadoTitulo").textContent =
    "Destino: " + document.getElementById("codigo").value;
  document.getElementById("resultadoTitulo").classList.add("print-block");
  document.getElementById("sugestoesPopup").classList.add("hidden");
  // Chama a busca automaticamente após a seleção
  buscarCoordenadas();
}

// Evento para fechar o popup de sugestões caso o usuário clique fora do container
document.addEventListener("click", function (event) {
  const container = document.querySelector(".input-group");
  if (!container.contains(event.target)) {
    document.getElementById("sugestoesPopup").classList.add("hidden");
  }
});

// Carregar dados e preencher o dropdown de áreas comuns
document.addEventListener("DOMContentLoaded", function () {
  fetch("dados.json")
    .then((response) => response.json())
    .then((data) => {
      const dropdown = document.getElementById("areascomuns-dropdown");

      // Iterando sobre as chaves do objeto 'areascomuns'
      for (let area in data.areascomuns) {
        if (data.areascomuns.hasOwnProperty(area)) {
          const option = document.createElement("option");
          option.value = area;
          option.textContent = area.charAt(0).toUpperCase() + area.slice(1);
          dropdown.appendChild(option);
        }
      }
    })
    .catch((error) => {
      console.error("Erro ao carregar dados.json:", error);
    });

  // Adiciona o evento de seleção do dropdown de áreas comuns
  document
    .getElementById("areascomuns-dropdown")
    .addEventListener("change", async function () {
      const dados = await carregarDados();
      if (!dados) return;

      const areaSelecionada = this.value;
      document.getElementById("resultadoTitulo").textContent =
        "Destino: " + areaSelecionada;
      document.getElementById("resultadoTitulo").classList.add("print-block");
      if (areaSelecionada) {
        limparComponentes();

        // Obtém as coordenadas da área comum selecionada
        const local = dados.areascomuns[areaSelecionada];

        if (local) {
          const latitudeInicial = -6.737965;
          const longitudeInicial = -35.628685;

          const latitudeDestino = local.latitude;
          const longitudeDestino = local.longitude;

          // Criar o mapa com o ponto inicial fixo e destino dinâmico
          criarMapa(
            latitudeInicial,
            longitudeInicial,
            latitudeDestino,
            longitudeDestino
          );

          // Gerar os links e QR Codes para Google Maps e Waze
          gerarLinksEQRcodes(latitudeDestino, longitudeDestino);

          // Exibir o resultado (links e QR codes)
          document.getElementById("resultado").classList.remove("hidden");

          // Limpar o input quando uma área for selecionada
          document.getElementById("codigo").value = "";
        } else {
          document.getElementById("erroMensagem").classList.remove("hidden");
        }
      }
    });
});
