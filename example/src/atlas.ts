import {AVLTree} from "binary-search-tree";
import * as Hammer from "hammerjs";
import {addWheelListener} from "wheel";
import Vec from "./vec";
import Node from "./node";

export default class Atlas {
	
	container: HTMLElement;
	element: HTMLElement;
	hammer: HammerManager;
	nodes: Node[];
	posMapL: AVLTree<number, Node>;
	posMapR: AVLTree<number, Node>;
	scroll: Vec;
	scrollAtStart: Vec;
	zoomExp: Vec;

	constructor(id: string) {
		this.element = document.createElement("div");
		this.element.classList.add("atlas");
		this.container = document.getElementById(id);
		this.container.appendChild(this.element);
		this.nodes = [];
		this.posMapL = new AVLTree<number, Node>({});
		this.posMapR = new AVLTree<number, Node>({});
		this.scroll = new Vec(.0, .0);
		this.zoomExp = new Vec(.0, .0);

		this.hammer = new Hammer.Manager(this.container);

		this.hammer.add(new Hammer.Pan({ direction: Hammer.DIRECTION_ALL, threshold: 0 }));
		this.hammer.on("panstart", (e:HammerInput)=>{
			this.scrollAtStart = this.scroll.clone();
		});
		this.hammer.on("panmove", (e:HammerInput)=>{
			this.scroll = this.scrollAtStart.subXY(e.deltaX, e.deltaY);
			this.updateScroll();
		});
		this.hammer.on("panend", (e:HammerInput)=>{
			this.scroll = this.scrollAtStart.subXY(e.deltaX, e.deltaY);
			this.scrollAtStart = null;
			this.updateScroll();
		});
		this.hammer.on("pancancel", (e:HammerInput)=>{
			this.scroll = this.scrollAtStart;
			this.scrollAtStart = null;
			this.updateScroll();
		});

		addWheelListener(this.container, (e:WheelEvent)=>{
			let mp = this.mousePos(e);
			let z0 = this.zoom;
			this.zoomExp.x -= e.deltaY;
			this.zoomExp.y -= e.deltaY;
			let z1 = this.zoom;
			this.scroll = this.scroll.add(mp).div(z0).mul(z1).sub(mp);
			this.updateScroll();
			e.preventDefault();
		});

		let lastTimestamp = 0;
		let tick = (timestamp: number)=>{
			// this.scroll.x += delta * 50;
			this.updateScroll();
			lastTimestamp = timestamp;
			window.requestAnimationFrame(tick);
		};
		window.requestAnimationFrame(tick);
	}

	get zoom(): Vec {
		return new Vec(
			Math.pow(2.0, this.zoomExp.x / 200.0),
			Math.pow(2.0, this.zoomExp.y / 200.0)
		);
	}

	mousePos(e:MouseEvent): Vec {
		let rect = this.container.getBoundingClientRect();
		return new Vec(e.clientX, e.clientY).subXY(rect.left, rect.top);
	}

	updateScroll() {
		this.element.style.left = (-this.scroll.x) + "px";
		this.element.style.top = (-this.scroll.y) + "px";
		let z = this.zoom;
		this.element.style.transform = `scale(${z.x}, ${z.y})`;
	}
	
	addNode(node: Node) {
		this.nodes.push(node);
		this.element.appendChild(node.element);
		this.posMapL.insert(node.rect.left, node);
		this.posMapR.insert(node.rect.right, node);
	}

}
