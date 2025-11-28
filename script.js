/**
 * ==========================================
 * IMAGENS POR TIPO DE LOCAL
 * ==========================================
 */
const buildingImages = {
    "Alice's House": "assets/house.png",
    "Bob's House": "assets/house.png",
    "Daria's House": "assets/house.png",
    "Ernie's House": "assets/house.png",
    "Grete's House": "assets/house.png",

    "Cabin": "assets/cabin.png",
    "Town Hall": "assets/townhall.png",
    "Post Office": "assets/postoffice.png",
    "Marketplace": "assets/marketplace.png",
    "Shop": "assets/shop.png",
    "Farm": "assets/house.png"  // pode escolher outra imagem se quiser
};

/**
 * ==========================================
 * PARTE 1: MODEL
 * ==========================================
 */
const roads = [
    "Alice's House-Bob's House", "Alice's House-Cabin",
    "Alice's House-Post Office", "Bob's House-Town Hall",
    "Daria's House-Ernie's House", "Daria's House-Town Hall",
    "Ernie's House-Grete's House", "Grete's House-Farm",
    "Grete's House-Shop", "Marketplace-Farm",
    "Marketplace-Post Office", "Marketplace-Shop",
    "Marketplace-Town Hall", "Shop-Town Hall"
];

const locations = {
    "Alice's House": {x: 50, y: 100},
    "Bob's House":   {x: 200, y: 50},
    "Cabin":         {x: 50, y: 300},
    "Post Office":   {x: 200, y: 200},
    "Town Hall":     {x: 350, y: 100},
    "Daria's House": {x: 500, y: 100},
    "Ernie's House": {x: 650, y: 250},
    "Grete's House": {x: 550, y: 400},
    "Farm":          {x: 350, y: 450},
    "Shop":          {x: 350, y: 300},
    "Marketplace":   {x: 200, y: 350}
};

function buildGraph(edges) {
    let graph = Object.create(null);
    function addEdge(from, to) {
        if (!graph[from]) graph[from] = [to];
        else graph[from].push(to);
    }
    for (let [from, to] of edges.map(r => r.split("-"))) {
        addEdge(from, to);
        addEdge(to, from);
    }
    return graph;
}

const roadGraph = buildGraph(roads);

/**
 * ==========================================
 * ESTADO IMUTÁVEL
 * ==========================================
 */
class VillageState {
    constructor(place, parcels) {
        this.place = place;
        this.parcels = parcels;
    }

    move(destination) {
        if (!roadGraph[this.place].includes(destination)) return this;

        let parcels = this.parcels
            .map(p => p.place !== this.place ? p : { place: destination, address: p.address })
            .filter(p => p.place !== p.address);

        return new VillageState(destination, parcels);
    }
}

VillageState.random = function(parcelCount = 5) {
    let parcels = [];
    for (let i = 0; i < parcelCount; i++) {
        let address = randomPick(Object.keys(roadGraph));
        let place;
        do place = randomPick(Object.keys(roadGraph));
        while (place == address);
        parcels.push({place, address});
    }
    return new VillageState("Post Office", parcels);
};

/**
 * ==========================================
 * ROBÔS
 * ==========================================
 */
function randomPick(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function randomRobot(state) {
    return {direction: randomPick(roadGraph[state.place])};
}

const mailRoute = [
    "Alice's House","Cabin","Alice's House","Bob's House",
    "Town Hall","Daria's House","Ernie's House",
    "Grete's House","Shop","Grete's House","Farm",
    "Marketplace","Post Office"
];

function routeRobot(state, memory) {
    if (memory.length === 0) memory = mailRoute;
    return {direction: memory[0], memory: memory.slice(1)};
}

function findRoute(graph, from, to) {
    let work = [{at: from, route: []}];
    for (let i = 0; i < work.length; i++) {
        let {at, route} = work[i];
        for (let place of graph[at]) {
            if (place === to) return route.concat(place);
            if (!work.some(w => w.at === place)) {
                work.push({at: place, route: route.concat(place)});
            }
        }
    }
}

function goalOrientedRobot({place, parcels}, route) {
    if (route.length === 0) {
        let parcel = parcels[0];
        route = parcel.place !== place
            ? findRoute(roadGraph, place, parcel.place)
            : findRoute(roadGraph, place, parcel.address);
    }
    return {direction: route[0], memory: route.slice(1)};
}

/**
 * ==========================================
 * CONTROLE E SIMULAÇÃO
 * ==========================================
 */
let currentState = null;
let currentRobot = null;
let robotMemory = [];
let turnCount = 0;
let simulationTimeout = null;
let animationSpeed = 800;

const canvas = document.getElementById('villageCanvas');
const ctx = canvas.getContext('2d');
const logList = document.getElementById('logList');

const robotImg = new Image();
robotImg.src = "assets/robot.png";

const parcelImg = new Image();
parcelImg.src = "assets/parcel.png";

function init() {
    currentState = VillageState.random();
    drawVillage(currentState);
    updateStatusUI();
    logAction("Simulação pronta. Escolha um robô e clique em Iniciar.", "move");
}

function startSimulation() {
    if (simulationTimeout) return;

    const type = document.getElementById("robotSelect").value;
    currentRobot = type === "random" ? randomRobot :
                   type === "route" ? routeRobot :
                   goalOrientedRobot;

    robotMemory = [];
    runTurn();
}

function runTurn() {
    if (currentState.parcels.length === 0) {
        logAction(`Todas as entregas concluídas em ${turnCount} passos.`, "delivery");
        simulationTimeout = null;
        return;
    }

    let action = currentRobot(currentState, robotMemory);
    let next = currentState.move(action.direction);

    if (next.parcels.length < currentState.parcels.length) {
        logAction(`Entrega realizada em: ${action.direction}`, "delivery");
    } else {
        logAction(`Movendo para: ${action.direction}`, "move");
    }

    currentState = next;
    robotMemory = action.memory;
    turnCount++;

    drawVillage(currentState);
    updateStatusUI();
    simulationTimeout = setTimeout(runTurn, animationSpeed);
}

function stopSimulation() {
    clearTimeout(simulationTimeout);
    simulationTimeout = null;
}

function resetSimulation() {
    stopSimulation();
    turnCount = 0;
    logList.innerHTML = "";
    init();
}

function updateStatusUI() {
    document.getElementById("stepCount").innerText = turnCount;
    document.getElementById("parcelCount").innerText = currentState.parcels.length;
}

/**
 * ==========================================
 * LOG LISTA UL/LI
 * ==========================================
 */
function logAction(message, type) {
    const li = document.createElement("li");

    let icon = type === "delivery" ? "📦" : "🚚";

    li.classList.add(type === "delivery" ? "log-delivery" : "log-move");

    li.textContent = `Passo ${turnCount}: ${icon} ${message}`;

    logList.prepend(li);
}

/**
 * ==========================================
 * DESENHO DO CANVAS COM IMAGENS POR TIPO
 * ==========================================
 */
function drawVillage(state) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Estradas
    ctx.strokeStyle = "#aaa";
    ctx.lineWidth = 4;
    for (let from in roadGraph) {
        for (let to of roadGraph[from]) {
            ctx.beginPath();
            ctx.moveTo(locations[from].x, locations[from].y);
            ctx.lineTo(locations[to].x, locations[to].y);
            ctx.stroke();
        }
    }

    // Locais (AGORA COM IMAGENS)
    for (let loc in locations) {
        const {x, y} = locations[loc];

        const img = new Image();
        img.src = buildingImages[loc] || "assets/house.png";

        ctx.drawImage(img, x - 20, y - 20, 40, 40);

        ctx.fillStyle = "#000";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(loc, x, y - 30);
    }

    // Encomendas
    state.parcels.forEach((p, index) => {
        const {x, y} = locations[p.place];
        ctx.drawImage(parcelImg, x + 10 + index * 20, y + 5, 20, 20);
    });

    // Robô
    const robotLoc = locations[state.place];
    ctx.drawImage(robotImg, robotLoc.x - 25, robotLoc.y - 25, 50, 50);
}

init();
