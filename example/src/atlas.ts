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
	private inertiaCancelTimer: any;
	private zoom: Vec;
	private zoomInertia: Vec;
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
		this.zoom = new Vec();
		this.zoomInertia = new Vec();
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
		this.hammer.on("panstart", this.onPanStart.bind(this));
		this.hammer.on("panmove", this.onPanMove.bind(this));
		this.hammer.on("panend", this.onPanEnd.bind(this));
		this.hammer.on("pancancel", this.onPanCancel.bind(this));
		addWheelListener(this.container, this.onWheel.bind(this));

		let lastTimestamp = 0;
		let tick = (timestamp: number)=>{
			this.onTick(timestamp - lastTimestamp);
			lastTimestamp = timestamp;
			window.requestAnimationFrame(tick);
		};
		window.requestAnimationFrame(tick);
	}

	addNode(node: Node) {
		this.nodes.push(node);
		if (node.rect.intersects(this.viewRect)) {
			this.element.appendChild(node.element);
		}
		this.rectTree.insert(node.rect, node);
	}

	get magnification(): Vec {
		return new Vec(
			Math.pow(2.0, this.zoom.x * config.zoomInertiaCoef),
			Math.pow(2.0, this.zoom.y * config.zoomInertiaCoef)
		);
	}

	get viewRect(): Rect {
		let mag = this.magnification;
		let pos = this.scroll.div(mag);
		let bound = this.container.getBoundingClientRect();
		// let debug = 100;
		// return new Rect(pos.x + debug / z.x, pos.y + debug / z.y, (bound.width - 2 * debug) / z.x, (bound.height - 2 * debug) / z.y);
		return new Rect(pos.x, pos.y, bound.width / mag.x, bound.height / mag.y);
	}

	mousePos(e:MouseEvent): Vec {
		let bound = this.container.getBoundingClientRect();
		return new Vec(e.clientX, e.clientY).subXY(bound.left, bound.top);
	}

	onPanStart(e: HammerInput) {
		this.scrollAtPanStart = this.scroll.clone();
		this.lastPanDelta.setZero();
		this.scrollInertia.setZero();
		this.zoomInertia.setZero();
	}

	onPanMove(e: HammerInput) {
		let delta = new Vec(e.deltaX, e.deltaY);
		if (this.scrollAtPanStart) {
			this.scroll = this.scrollAtPanStart.sub(delta);
			this.scrollInertia = this.lastPanDelta.sub(delta).mulXY(config.scrollInertiaCoef);
		}
		this.lastPanDelta = delta;
		if (this.inertiaCancelTimer) {
			clearTimeout(this.inertiaCancelTimer);
		}
		this.inertiaCancelTimer = setTimeout(()=>{
			this.scrollInertia.setZero();
			this.inertiaCancelTimer = null;
		}, config.cancelInertiaTimeoutMSec);
	}

	onPanEnd(e: HammerInput) {
		if (this.scrollAtPanStart) {
			this.scroll = this.scrollAtPanStart.subXY(e.deltaX, e.deltaY);
			this.scrollAtPanStart = null;
		}
		if (this.inertiaCancelTimer) {
			clearTimeout(this.inertiaCancelTimer);
			this.inertiaCancelTimer = null;
		}
	}

	onPanCancel(e: HammerInput) {
		if (this.scrollAtPanStart) {
			this.scroll = this.scrollAtPanStart;
			this.scrollAtPanStart = null;
		}
		if (this.inertiaCancelTimer) {
			clearTimeout(this.inertiaCancelTimer);
			this.inertiaCancelTimer = null;
		}
	}

	onWheel(e: WheelEvent) {
		this.zoomCenter = this.mousePos(e);
		this.zoomInertia = this.zoomInertia.subXY(e.deltaY, e.deltaY);
		e.preventDefault();
	}

	onTick(delta: number) {
		if (!this.scrollAtPanStart) {
			this.scroll = this.scroll.add(this.scrollInertia.mulXY(delta));
			let r = Math.pow(1.0 - config.scrollInertiaDamping, delta);
			this.scrollInertia = this.scrollInertia.mulXY(r).setZeroIf(config.scrollEPS);
		}
		//
		if (!this.zoomInertia.isZero()) {
			let mag0 = this.magnification;
			this.zoom = this.zoom.add(this.zoomInertia.mulXY(delta));
			let mag1 = this.magnification;
			this.scroll = this.scroll.add(this.zoomCenter).div(mag0).mul(mag1).sub(this.zoomCenter);
			let r = Math.pow(1.0 - config.zoomInertiaDamping, delta);
			this.zoomInertia = this.zoomInertia.mulXY(r).setZeroIf(config.zoomEPS);
		}
		//
		this.element.style.left = (-this.scroll.x) + "px";
		this.element.style.top = (-this.scroll.y) + "px";
		let mag = this.magnification;
		this.element.style.transform = `scale(${mag.x}, ${mag.y})`;
		this.nodeContentRule.style.display = mag.size() < .5 ? "none" : "block";
		this.nodeContentRule.style.transform = `scale(${1.0 / mag.x}, ${1.0 / mag.y})`;
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

}
