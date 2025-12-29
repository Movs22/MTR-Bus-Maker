let busSelectDiv = document.getElementById("busSelect")
busSelectDiv.style.display = "none"

let vehicles

let vehiclesList = document.getElementById("vehiclesList")
let vehiclesDivList = document.getElementById("vehicles")

fetch("data/vehicles.json").then(r => r.json()).then(r => vehicles = r).then(load)

let divCache = {}

let filters = {
    d: [],
    l: [],
    m: []
}

let searchBar = document.getElementById("search-bus-mtr")
let lengthFilter = document.getElementById("length")
let makeFilter = document.getElementById("make")
let doorsFilter = document.getElementById("doors")

function load() {
    Object.values(vehicles).forEach(vec => {
        let opt = document.createElement("option")
        opt.value = vec.name
        vehiclesList.appendChild(opt)
        if (!filters.l.includes(vec.meta.length)) filters.l.push(vec.meta.length);
        if (!filters.d.includes(vec.meta.doors)) filters.d.push(vec.meta.doors);
        if (!filters.m.includes(vec.make)) filters.m.push(vec.make);
        let div = document.createElement("div")
        div.id = vec.id;
        div.innerHTML = `<img src="data/${vec.dir}/icon.png">
                    <span class="make">${vec.make}</span>
                    <span class="model">${vec.name} (${vec.meta.length}m)</span>
                    <button id="add" onclick="selectVehicle('${vec.id}')">+</button>`;
        divCache[vec.id] = div;
        vehiclesDivList.appendChild(div)
    })
    lengthFilter.innerHTML = filters.l.sort().map(z => `<option value="${z}" selected>${z}m</option>`).reduce((acc, v) => acc = acc + v, "")
    makeFilter.innerHTML = filters.m.sort().map(z => `<option value="${z}" selected>${z}</option>`).reduce((acc, v) => acc = acc + v, "")
    doorsFilter.innerHTML = filters.d.sort().map(z => `<option value="${z}" selected>${z}</option>`).reduce((acc, v) => acc = acc + v, "")

    searchBar.addEventListener('input', refreshVehicleList)
    lengthFilter.addEventListener('change', refreshVehicleList)
    makeFilter.addEventListener('change', refreshVehicleList)
    doorsFilter.addEventListener('change', refreshVehicleList)

    //setTimeout(() => addVehicleToSession(vehicles["mb_conecto_g"]), 1000)
}

function refreshVehicleList() {
    let search = searchBar.value;
    let validVehicles = Object.values(vehicles).filter(vec => {
        if (search && !vec.name.toLowerCase().includes(search.toLowerCase())) return false;
        return Array.from(lengthFilter.selectedOptions).map(z => z.value).includes(vec.meta.length.toString()) && Array.from(doorsFilter.selectedOptions).map(z => z.value).includes(vec.meta.doors.toString()) && Array.from(makeFilter.selectedOptions).map(z => z.value).includes(vec.make.toString())
    })
    Object.values(divCache).forEach(div => {
        console.log(div)
        console.log(validVehicles)
        if (validVehicles.some(v => v.id === div.id)) {
            div.style.display = '';
            if (!div.parentElement) vehiclesDivList.appendChild(div);
        } else {
            div.style.display = 'none';
        }
    });
}

function addVehicle() {
    busSelectDiv.style.display = "flex"
}

function closeVehicle() {
    busSelectDiv.style.display = "none"
}

function selectVehicle(id) {
    addVehicleToSession(vehicles[id])
}