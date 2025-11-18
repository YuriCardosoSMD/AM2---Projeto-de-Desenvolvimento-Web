/**
 * ==========================================
 * PARTE 1: DADOS E ESTRUTURA (MODEL)
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
        if (graph[from] == null) graph[from] = [to];
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
 * PARTE 2: ESTADO DO MUNDO (STATE)
 * ==========================================
 */

class VillageState {
    constructor(place, parcels) {
        this.place = place;
        this.parcels = parcels;
    }

    move(destination) {
        if (!roadGraph[this.place].includes(destination)) {
            return this;
        } else {
            let parcels = this.parcels.map(p => {
                if (p.place != this.place) return p;
                return {place: destination, address: p.address};
            }).filter(p => p.place != p.address);
            return new VillageState(destination, parcels);
        }
    }
}

VillageState.random = function(parcelCount = 5) {
    let parcels = [];
    for (let i = 0; i < parcelCount; i++) {
        let address = randomPick(Object.keys(roadGraph));
        let place;
        do { place = randomPick(Object.keys(roadGraph)); }
        while (place == address);
        parcels.push({place, address});
    }
    return new VillageState("Post Office", parcels);
};

/**
 * ==========================================
 * PARTE 3: ALGORITMOS DOS ROBÔS (AI)
 * ==========================================
 */

function randomPick(array) {
    let choice = Math.floor(Math.random() * array.length);
    return array[choice];
}

function randomRobot(state) {
    return {direction: randomPick(roadGraph[state.place])};
}

const mailRoute = [
    "Alice's House", "Cabin", "Alice's House", "Bob's House",
    "Town Hall", "Daria's House", "Ernie's House",
    "Grete's House", "Shop", "Grete's House", "Farm",
    "Marketplace", "Post Office"
];

function routeRobot(state, memory) {
    if (memory.length == 0) memory = mailRoute;
    return {direction: memory[0], memory: memory.slice(1)};
}

function findRoute(graph, from, to) {
    let work = [{at: from, route: []}];
    for (let i = 0; i < work.length; i++) {
        let {at, route} = work[i];
        for (let place of graph[at]) {
            if (place == to) return route.concat(place);
            if (!work.some(w => w.at == place)) {
                work.push({at: place, route: route.concat(place)});
            }
        }
    }
}

function goalOrientedRobot({place, parcels}, route) {
    if (route.length == 0) {
        let parcel = parcels[0];
        if (parcel.place != place) {
            route = findRoute(roadGraph, place, parcel.place);
        } else {
            route = findRoute(roadGraph, place, parcel.address);
        }
    }
    return {direction: route[0], memory: route.slice(1)};
}

/**
 * ==========================================
 * PARTE 4: CONTROLE
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
const logContainer = document.getElementById('logContainer');

/* === TEMA 3: Carregamento de imagens PNG === */
const robotImg = new Image();
robotImg.src = "robot.png";

const parcelImg = new Image();
parcelImg.src = "parcel.png";

function init() {
    currentState = VillageState.random();
    drawVillage(currentState);
    updateStatusUI();
    logAction("Simulação pronta. Escolha um robô e clique em Iniciar.");
}

function startSimulation() {
    if (simulationTimeout) return;

    const robotType = document.getElementById('robotSelect').value;

    if (robotType === 'random') currentRobot = randomRobot;
    else if (robotType === 'route') currentRobot = routeRobot;
    else currentRobot = goalOrientedRobot;

    robotMemory = [];
    runTurn();
}

function runTurn() {
    if (currentState.parcels.length == 0) {
        logAction(`<strong>FIM!</strong> Todas as entregas concluídas em ${turnCount} passos.`);
        simulationTimeout = null;
        return;
    }

    let action = currentRobot(currentState, robotMemory);

    let nextState = currentState.move(action.direction);

    if(nextState.parcels.length < currentState.parcels.length) {
        logAction(`📦 Entrega realizada em: ${action.direction}`);
    } else {
        logAction(`Movendo para: ${action.direction}`);
    }

    currentState = nextState;
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
    logContainer.innerHTML = '';
    init();
}

function updateStatusUI() {
    document.getElementById('stepCount').innerText = turnCount;
    document.getElementById('parcelCount').innerText = currentState.parcels.length;
}

function logAction(message) {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = `Passo ${turnCount}: ${message}`;
    logContainer.prepend(div);
}

/**
 * ==========================================
 * PARTE 5: CANVAS (TEMA 3 ALTERADO)
 * ==========================================
 */

function drawVillage(state) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Estradas
    ctx.strokeStyle = "#aaa";
    ctx.lineWidth = 4;
    for (let from in roadGraph) {
        for (let to of roadGraph[from]) {
            if(locations[from] && locations[to]) {
                ctx.beginPath();
                ctx.moveTo(locations[from].x, locations[from].y);
                ctx.lineTo(locations[to].x, locations[to].y);
                ctx.stroke();
            }
        }
    }

    // Locais
    for (let loc in locations) {
        const {x, y} = locations[loc];
        
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#000";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(loc, x, y - 25);
    }

    // ENCOMENDAS (Imagem PNG)
    state.parcels.forEach((p, index) => {
        if(locations[p.place]) {
            const {x, y} = locations[p.place];
            const offset = index * 20;
            ctx.drawImage(parcelImg, x + 10 + offset, y + 5, 20, 20);
        }
    });

    // ROBÔ (Imagem PNG)
    const robotLoc = locations[state.place];
    if(robotLoc) {
        ctx.drawImage(robotImg, robotLoc.x - 25, robotLoc.y - 25, 50, 50);
    }
}

// Iniciar ao carregar
init();
