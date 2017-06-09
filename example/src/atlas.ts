import {AVLTree} from "binary-search-tree";
import Vec from "./vec";
import Node from "./node";

export default class Atlas {
	
	container: HTMLElement;
	element: HTMLElement;
	nodes: Node[];
	posMapL: AVLTree<number, Node>;
	posMapR: AVLTree<number, Node>;
	scroll: Vec;

	constructor(id: string) {
		this.element = document.createElement("div");
		this.element.classList.add("atlas");
		this.container = document.getElementById(id);
		this.container.appendChild(this.element);
		this.nodes = [];
		this.posMapL = new AVLTree<number, Node>({});
		this.posMapR = new AVLTree<number, Node>({});
		this.scroll = new Vec(0, 0);

		let lastTimestamp = 0;
		let tick = (timestamp: number)=>{
			let delta = (timestamp - lastTimestamp) / 1000.0;
			this.scroll.x += delta * 50;
			this.updateScroll();
			lastTimestamp = timestamp;
			window.requestAnimationFrame(tick);
		};
		window.requestAnimationFrame(tick);
	}

	updateScroll() {
		this.element.style.left = (-this.scroll.x) + "px";
		this.element.style.top = (-this.scroll.y) + "px";
	}
	
	addNode(node: Node) {
		this.nodes.push(node);
		this.element.appendChild(node.element);
		this.posMapL.insert(node.rect.left, node);
		this.posMapR.insert(node.rect.right, node);
	}

}
