import * as THREE from "three";
import { OrbitControls } from "https://unpkg.com/three/examples/jsm/controls/OrbitControls.js";
import { MTLLoader } from "https://unpkg.com/three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "https://unpkg.com/three/examples/jsm/loaders/OBJLoader.js";

let scene, camera, renderer, controls, model;

let canva = document.getElementById("scene");

const loader = new THREE.TextureLoader();

init();

function init() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(60, canva.clientWidth / canva.clientHeight, 0.1, 1000);

    scene.background = new THREE.Color(0x3f3f3f);

    renderer = new THREE.WebGLRenderer({
        canvas: canva,
        antialias: true,
        alpha: true
    });
    renderer.setSize(canva.clientWidth, canva.clientHeight, false);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.physicallyCorrectLights = true;

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = true;
    controls.enableDamping = true;
    controls.minDistance = 2;
    controls.maxDistance = 100;
    controls.maxPolarAngle = Math.PI / 1.8;

    animate();
    window.addEventListener("resize", onResize);
}

let warningP = document.getElementById("warning")

let baseTextureCache = {}

let mode;

window.createTexturesForBus = async function (data) {
    await Promise.all(data.textures.map(async tex => {
        if (baseTextureCache[data.id + "_" + tex.name]) return;
        const baseImage = await new Promise(resolve => {
            if(tex.name === "seat.png") {
                loader.load(`data/textures/seat/bustrix0.png`, tex => {
                    resolve(tex.image);
                });
                return
            }
            if(tex.name === "floor.png") {
                loader.load(`data/textures/floor/wood0.png`, tex => {
                    resolve(tex.image);
                });
                return
            }
            loader.load(`data/${data.dir}${tex.name}`, tex => {
                resolve(tex.image);
            });
        });
        baseTextureCache[data.id + "_" + tex.name] = baseImage
    }))
}

window.getEditableTextureForBus = function (data, name) {
    let image = baseTextureCache[data.id + "_" + name]
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = true;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;

    return { texture, canvas, ctx };
}

window.__OLDsetSeatMouquette = async function (seat) {
    if (!baseTextureCache["seat_" + seat]) {
        let tex = loader.load(`data/textures/seat/${seat}.png`);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.flipY = true;
        baseTextureCache["seat_" + seat] = tex
    };
    model.traverse(child => {
        if (!child.isMesh || !child.material.map) return;

        const texName = child.material.name;
        if (texName === "seat.png") {
            if (!child.material.userData.cloned) {
                child.material = child.material.clone();
                child.material.userData.cloned = true;
            }
            child.material.map = baseTextureCache["seat_" + seat];
            child.material.needsUpdate = true;
        }
    });
}

window.__OLDsetFloor = async function (floor) {
    if (!baseTextureCache["floor_" + floor]) {
        let tex = loader.load(`data/textures/floor/${floor}.png`);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.flipY = true;
        baseTextureCache["floor_" + floor] = tex
    };
    model.traverse(child => {
        if (!child.isMesh || !child.material.map) return;

        const texName = child.material.name;
        if (texName === "floor.png") {
            if (!child.material.userData.cloned) {
                child.material = child.material.clone();
                child.material.userData.cloned = true;
            }
            child.material.map = baseTextureCache["floor_" + floor];
            child.material.needsUpdate = true;
        }
    });
}

window.overrideBusTextures = function (textureMap) {
    if (!model) return console.warn("No active model")

    model.traverse(child => {
        if (!child.isMesh || !child.material.map) return;

        const texName = child.material.name;
        if (!textureMap[texName]) return;

        if (!child.material.userData.cloned) {
            child.material = child.material.clone();
            child.material.userData.cloned = true;
        }
        child.material.map = textureMap[texName].texture;
        child.material.needsUpdate = true;
    });
}

window.renderBus = async function (data, override = false) {
    scene.clear()
    if (!data) return warningP.style.display = ""
    return new Promise(async (resolve, reject) => {
        await createTexturesForBus(data)
        warningP.style.display = "none"
        mode = data.mode || "lhd"
        const ambient = new THREE.AmbientLight(0xffffff, 0.9);
        scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.1);
        dirLight.position.set(10, 2, 19);
        scene.add(dirLight);

        const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.1);
        dirLight2.position.set(-10, 2, -19);
        scene.add(dirLight2);
        const mtlLoader = new MTLLoader();
        mtlLoader.setPath("data/" + data.dir);
        mtlLoader.load(data.lhd + ".mtl", async materials => {
            materials.preload();

            const objLoader = new OBJLoader();
            objLoader.setMaterials(materials);
            objLoader.setPath("data/" + data.dir);
            objLoader.load((data.mode && data.mode === "rhd" ? data.rhd : data.lhd) + ".obj", obj => {
                model = obj;
                model.traverse(child => {
                    if (child.isMesh) {
                        
                        child.geometry.computeVertexNormals();
                        if (child.name.includes("Glass") || child.name.includes("Overlay")) {
                            child.material.transparent = true;
                            child.material.alphaTest = 0.01;
                            child.material.blending = THREE.NormalBlending;
                        }
                    }
                });



                window.centerModel()

                scene.add(model)

                if(override) {
                    window.overrideBusTextures(override)
                }

                resolve(model)
            },
                undefined,
                err => reject(err));
        },
            undefined,
            err => reject(err));
    })
}

window.centerModel = function () {
    controls.reset()
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = sphere.radius;
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const padding = 1;

    const distance = (radius / Math.sin(fov / 2)) * padding;
    model.position.sub(center);
    camera.position.set(
        distance * (mode === "rhd" ? -1 : 1) * 0.8,
        distance * 0.1,
        distance * -0.8
    );
    camera.lookAt(0, 0, 0);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function onResize() {
    const width = canva.clientWidth;
    const height = canva.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height, false);
}
