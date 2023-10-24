import * as THREE from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader' 
import GUI from 'lil-gui'
import gsap from 'gsap'
import fragmentShader from './shaders/fragment.glsl'
import vertexShader from './shaders/vertex.glsl'
 
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer'
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass'
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass'
import {GlitchPass} from 'three/examples/jsm/postprocessing/GlitchPass'


import red from './matcap.png'
import green from './download (2).png'
import gray from './matcap.png'

import bgblue from './bgblue.png'
import bgpurple from './bgp.png'

import {Lethargy} from 'lethargy'
import {WheelGesture} from '@use-gesture/vanilla'

import VirtualScroll from 'virtual-scroll'
 


export default class Sketch {
	constructor(options) {
		this.current = 0

		
		this.scenes = [
			{
				matcap: red,
				bg: bgblue,
				geometry: new THREE.BoxGeometry(.1, .1, .1),
			},
			{
				matcap: green,
				bg: bgpurple,
				geometry: new THREE.BoxGeometry(.01, .01, .01)
				
			},
			{
				matcap: gray,
				bg: bgblue,
				geometry: new THREE.BoxGeometry(.05, .05, .05)

			},
		]

 
		
		this.container = options.dom
		
		this.width = this.container.offsetWidth
		this.height = this.container.offsetHeight
		
		
		// // for renderer { antialias: true }
		this.renderer = new THREE.WebGLRenderer({ antialias: true })
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
		this.renderTarget = new THREE.WebGLRenderTarget(this.width, this.height)
		this.renderer.setSize(this.width ,this.height )
		this.renderer.setClearColor(0xeeeeee, 1)
		this.renderer.useLegacyLights = true
		this.renderer.outputEncoding = THREE.sRGBEncoding
 

		 
		this.renderer.setSize( window.innerWidth, window.innerHeight )

		this.container.appendChild(this.renderer.domElement)
 


		this.camera = new THREE.PerspectiveCamera( 70,
			 this.width / this.height,
			 0.01,
			 10
		)
 
		this.camera.position.set(0, 0, 2) 
		// this.controls = new OrbitControls(this.camera, this.renderer.domElement)
		this.time = 0


		this.scenes.forEach((o, index) => {
			o.scene = this.createScene(o.bg, o.matcap, o.geometry)
			this.renderer.compile(o.scene, this.camera)
			o.target = new THREE.WebGLRenderTarget(this.width, this.height)

		
		})
		this.dracoLoader = new DRACOLoader()
		this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
		this.gltf = new GLTFLoader()
		this.gltf.setDRACOLoader(this.dracoLoader)

		this.isPlaying = true

		this.currentState = 0
		this.scroller = new VirtualScroll()
		this.scroller.on(e => {
			console.log(e);
			this.currentState -= e.deltaY / 4000


			this.currentState = (this.currentState + 3000) % 3
		})
	 
		// this.addObjects()		 
		this.initPost()

		this.resize()
		this.render()
		this.setupResize()
		this.settings()

		// this.lethargy = new Lethargy()

		// this.gesture = new WheelGesture(document.body, (state) => {
		// 	console.log(state)
		// })
 


	 

	}

	initPost() {
		this.postScene = new THREE.Scene()
		let frustumSize = 1
		let aspect = 1
		this.postCamera = new THREE.OrthographicCamera(frustumSize * aspect / -2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / -2, -1000, 1000)
		this.material = new THREE.ShaderMaterial({
			extensions: {
				derivatives: '#extension GL_OES_standard_derivatives : enable'
			},
			side: THREE.DoubleSide,
			uniforms: {
				uTexture1: {value: new THREE.TextureLoader().load(red)},
				uTexture2: {value: new THREE.TextureLoader().load(gray)},
				progress: {value: 0},
				resolution: {value: new THREE.Vector4()}
			},
			vertexShader,
			fragmentShader
		})
		this.quad = new THREE.Mesh(
			new THREE.PlaneGeometry(1,1),
			this.material
		)
		this.postScene.add(this.quad)
	
	}

	settings() {
		let that = this
		this.settings = {
			progress: 0
		}
		this.gui = new GUI()
		this.gui.add(this.settings, 'progress', 0, 1, 0.01)
	}
	createScene(bg, matcap, geometry) {
		let scene = new THREE.Scene()
		
		let bgTexture = new THREE.TextureLoader().load(bg)
		scene.background = bgTexture


		let material = new THREE.MeshMatcapMaterial({
			matcap: new THREE.TextureLoader().load(matcap)
		})
		 
		let mesh = new THREE.Mesh(geometry, material)

		for (let index = 0; index < 100; index++) {
			let random = new THREE.Vector3().randomDirection()
			let clone = mesh.clone()
			clone.position.copy(random)
			scene.add(clone)
		}


		return scene
	}


	setupResize() {
		window.addEventListener('resize', this.resize.bind(this))
	}

	resize() {
		this.width = this.container.offsetWidth
		this.height = this.container.offsetHeight
		this.renderer.setSize(this.width, this.height)
		this.camera.aspect = this.width / this.height


		this.imageAspect = 853/1280
		let a1, a2
		if(this.height / this.width > this.imageAspect) {
			a1 = (this.width / this.height) * this.imageAspect
			a2 = 1
		} else {
			a1 = 1
			a2 = (this.height / this.width) / this.imageAspect
		} 


		// this.material.uniforms.resolution.value.x = this.width
		// this.material.uniforms.resolution.value.y = this.height
		// this.material.uniforms.resolution.value.z = a1
		// this.material.uniforms.resolution.value.w = a2

		this.camera.updateProjectionMatrix()



	}


	addObjects() {
		let that = this
		this.material = new THREE.ShaderMaterial({
			extensions: {
				derivatives: '#extension GL_OES_standard_derivatives : enable'
			},
			side: THREE.DoubleSide,
			uniforms: {
				time: {value: 0},
				resolution: {value: new THREE.Vector4()}
			},
			vertexShader,
			fragmentShader
		})
		
		this.geometry = new THREE.PlaneGeometry(1,1,1,1)
		this.plane = new THREE.Mesh(this.geometry, this.material)
 
		// this.scene.add(this.plane)
 
	}



	addLights() {
		const light1 = new THREE.AmbientLight(0xeeeeee, 0.5)
		this.scene.add(light1)
	
	
		const light2 = new THREE.DirectionalLight(0xeeeeee, 0.5)
		light2.position.set(0.5,0,0.866)
		this.scene.add(light2)
	}

	stop() {
		this.isPlaying = false
	}

	play() {
		if(!this.isPlaying) {
			this.isPlaying = true
			this.render()
		}
	}

	render() {
		if(!this.isPlaying) return
		this.time += 0.05

		this.current = Math.floor(this.currentState)
		this.next = Math.floor((this.current + 1) % this.scenes.length)
		this.progress = this.currentState % 1



		this.renderer.setRenderTarget(this.scenes[this.current].target)
		this.renderer.render(this.scenes[this.current].scene, this.camera)

		this.next = (this.current + 1) % this.scenes.length

		this.renderer.setRenderTarget(this.scenes[this.next].target)
		this.renderer.render(this.scenes[this.next].scene, this.camera)
	
	
		this.renderer.setRenderTarget(null)


		this.material.uniforms.uTexture1.value = this.scenes[this.current].target.texture
		this.material.uniforms.uTexture2.value = this.scenes[this.next].target.texture



		this.material.uniforms.progress.value = this.progress

		
		
		this.scenes.forEach(o => {
			o.scene.rotation.y = this.time * 0.1
		})
		
		
		// this.material.uniforms.time.value = this.time
		 
		//this.renderer.setRenderTarget(this.renderTarget)
 
		//this.renderer.setRenderTarget(null)
 
		requestAnimationFrame(this.render.bind(this))

		this.renderer.render(this.postScene, this.postCamera)
	}
 
}
new Sketch({
	dom: document.getElementById('container')
})
 