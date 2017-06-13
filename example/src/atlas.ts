import * as Hammer from "hammerjs";
import {addWheelListener} from "wheel";
import Vec from "./vec";
import Rect from "./rect";
import Node from "./node";
import RectTree from "./recttree";

const config = {
	cancelInertiaTimeoutMSec: 100,
	scrollInertiaCoef: .1,
	scrollInertiaDamping: .002,
	zoomInertiaCoef: 0.000015,
	zoomInertiaDamping: .01,
	scrollEPS: .03,
	zoomEPS: 10.0
};

export default class Atlas {

	private container: HTMLElement;
	private element: HTMLElement;
	private hammer: HammerManager;
	private nodes: Node[];
	private scroll: Vec;
	private scrollInertia: Vec;
	private scrollAtPanStart: Vec;
	private lastPanDelta: Vec;
	private inertiaCancelTimer: number;
	private zoomExp: Vec;
	private zoomExpInertia: Vec;
	private zoomCenter: Vec;
	private nodeContentRule: CSSStyleRule;
	private rectTree: RectTree<Node>;

	constructor(id: string) {
		this.element = document.createElement("div");
		this.element.classList.add("atlas");
		this.container = document.getElementById(id);
		this.container.appendChild(this.element);
		this.nodes = [];
		this.rectTree = new RectTree<Node>();
		this.scroll = new Vec();
		this.scrollInertia = new Vec();
		this.lastPanDelta = new Vec();
		this.zoomExp = new Vec();
		this.zoomExpInertia = new Vec();
		this.zoomCenter = new Vec();

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
			this.scrollAtPanStart = this.scroll.clone();
			this.lastPanDelta.setZero();
			this.scrollInertia.setZero();
			this.zoomExpInertia.setZero();
		});
		this.hammer.on("panmove", (e:HammerInput)=>{
			let delta = new Vec(e.deltaX, e.deltaY);
			this.scroll = this.scrollAtPanStart.sub(delta);
			this.scrollInertia = this.lastPanDelta.sub(delta).mulXY(config.scrollInertiaCoef);
			this.lastPanDelta = delta;
			if (this.inertiaCancelTimer) {
				clearTimeout(this.inertiaCancelTimer);
			}
			this.inertiaCancelTimer = setTimeout(()=>{
				this.scrollInertia.setZero();
				this.inertiaCancelTimer = null;
			}, config.cancelInertiaTimeoutMSec);
		});
		this.hammer.on("panend", (e:HammerInput)=>{
			this.scroll = this.scrollAtPanStart.subXY(e.deltaX, e.deltaY);
			this.scrollAtPanStart = null;
			if (this.inertiaCancelTimer) {
				clearTimeout(this.inertiaCancelTimer);
			}
			this.inertiaCancelTimer = null;
		});
		this.hammer.on("pancancel", (e:HammerInput)=>{
			this.scroll = this.scrollAtPanStart;
			this.scrollAtPanStart = null;
			if (this.inertiaCancelTimer) {
				clearTimeout(this.inertiaCancelTimer);
			}
			this.inertiaCancelTimer = null;
		});

		addWheelListener(this.container, (e:WheelEvent)=>{
			this.zoomCenter = this.mousePos(e);
			this.zoomExpInertia = this.zoomExpInertia.subXY(e.deltaY, e.deltaY);
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
		if (!this.scrollAtPanStart) {
			this.scroll = this.scroll.add(this.scrollInertia.mulXY(delta));
			let r = Math.pow(1.0 - config.scrollInertiaDamping, delta);
			this.scrollInertia = this.scrollInertia.mulXY(r).setZeroIf(config.scrollEPS);
		}
		//
		if (!this.zoomExpInertia.isZero()) {
			let z0 = this.zoom;
			this.zoomExp = this.zoomExp.add(this.zoomExpInertia.mulXY(delta));
			let z1 = this.zoom;
			this.scroll = this.scroll.add(this.zoomCenter).div(z0).mul(z1).sub(this.zoomCenter);
			let r = Math.pow(1.0 - config.zoomInertiaDamping, delta);
			this.zoomExpInertia = this.zoomExpInertia.mulXY(r).setZeroIf(config.zoomEPS);
		}
		//
		this.updateScroll();
	}

	get zoom(): Vec {
		return new Vec(
			Math.pow(2.0, this.zoomExp.x * config.zoomInertiaCoef),
			Math.pow(2.0, this.zoomExp.y * config.zoomInertiaCoef)
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
