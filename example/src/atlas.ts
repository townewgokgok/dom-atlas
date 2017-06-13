import * as Hammer from "hammerjs";
import {addWheelListener} from "wheel";
import Vec from "./vec";
import Rect from "./rect";
import Node from "./node";
import RectTree from "./recttree";

export default class Atlas {
	
	container: HTMLElement;
	element: HTMLElement;
	hammer: HammerManager;
	nodes: Node[];
	scroll: Vec;
	scrollAtStart: Vec;
	zoomExp: Vec;
	nodeContentRule: CSSStyleRule;
	rectTree: RectTree<Node>;

	constructor(id: string) {
		this.element = document.createElement("div");
		this.element.classList.add("atlas");
		this.container = document.getElementById(id);
		this.container.appendChild(this.element);
		this.nodes = [];
		this.rectTree = new RectTree<Node>();
		this.scroll = new Vec(.0, .0);
		this.zoomExp = new Vec(.0, .0);

		for (let sheet of document.styleSheets as any) {
			for (let rule of sheet.cssRules) {
				if (rule.selectorText == ".atlas .node .node__content") {
					this.nodeContentRule = rule;
					break;
				}
			}
		}

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
			this.onTick(timestamp - lastTimestamp);
			lastTimestamp = timestamp;
			window.requestAnimationFrame(tick);
		};
		window.requestAnimationFrame(tick);
	}

	onTick(delta: number) {
		// this.scroll.x += delta * 50;
		this.updateScroll();
	}

	get zoom(): Vec {
		return new Vec(
			Math.pow(2.0, this.zoomExp.x / 200.0),
			Math.pow(2.0, this.zoomExp.y / 200.0)
		);
	}

	get viewRect(): Rect {
		let z = this.zoom;
		let pos = this.scroll.div(z);
		let bound = this.container.getBoundingClientRect();
		// let debug = 100;
		// return new Rect(pos.x + debug / z.x, pos.y + debug / z.y, (bound.width - 2 * debug) / z.x, (bound.height - 2 * debug) / z.y);
		return new Rect(pos.x, pos.y, bound.width / z.x, bound.height / z.y);
	}

	mousePos(e:MouseEvent): Vec {
		let bound = this.container.getBoundingClientRect();
		return new Vec(e.clientX, e.clientY).subXY(bound.left, bound.top);
	}

	updateScroll() {
		this.element.style.left = (-this.scroll.x) + "px";
		this.element.style.top = (-this.scroll.y) + "px";
		let z = this.zoom;
		this.element.style.transform = `scale(${z.x}, ${z.y})`;
		this.nodeContentRule.style.display = z.size() < .5 ? "none" : "block";
		this.nodeContentRule.style.transform = `scale(${1.0 / z.x}, ${1.0 / z.y})`;
		let view = this.viewRect;
		let {hide, show} = this.rectTree.update(view);
		for (var n of hide) {
			if (n.element && n.element.parentNode) {
				n.element.parentNode.removeChild(n.element);
			}
		}
		for (var n of show) {
			if (!n.element.parentNode && n.rect.intersects(view)) {
				this.element.appendChild(n.element);
			}
		}
	}
	
	addNode(node: Node) {
		this.nodes.push(node);
		if (node.rect.intersects(this.viewRect)) {
			this.element.appendChild(node.element);
		}
		this.rectTree.insert(node.rect, node);
	}

}
