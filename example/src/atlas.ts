import * as Hammer from "hammerjs";
import {addWheelListener} from "wheel";
import Vec from "./vec";
import Rect from "./rect";
import Node from "./node";
import RectTree from "./recttree";

const config = {
	debug: {
		showFps: true,
		disableTree: false,//true,
	},
	scroll: {
		panInputCoef: 100.0,
		wheelInputCoef: 2.0,
		inertiaDamping: 2.0,
		eps: .03,
		inertiaCancelTimeoutMSec: 100,
	},
	zoom: {
		inputCoef: .05,
		inertiaDamping: 20.0,
		eps: 10.0,
	},
	pullBack: {
		staticExponentialBase: 2.0,
		dynamicRate: 4.0
	},
	marginCoef: {
		x: .2,
		y: .2,
	},
	limitMargin: {
		x: 100.0,
		y: 100.0,
	},
};

export default class Atlas {

	private container: HTMLElement;
	private element: HTMLElement;
	private hammer: HammerManager;
	private nodes: Node[];
	private scroll: Vec;
	private scrollBefore: Vec;
	private scrollInertia: Vec;
	private scrollAtPanStart: Vec;
	private lastPanDelta: Vec;
	private inertiaCancelTimer: any;
	private zoom: Vec;
	private zoomBefore: Vec;
	private zoomInertia: Vec;
	private zoomCenter: Vec;
	private nodeContentRule: CSSStyleRule;
	private rectTree: RectTree<Node>;
	private bound: Rect;

	constructor(id: string) {
		this.element = document.createElement("div");
		this.element.classList.add("atlas");
		this.container = document.getElementById(id);
		this.container.appendChild(this.element);
		this.nodes = [];
		if (!config.debug.disableTree) {
			this.rectTree = new RectTree<Node>();
		}
		this.scroll = new Vec();
		this.scrollBefore = Vec.nan;
		this.scrollInertia = new Vec();
		this.lastPanDelta = new Vec();
		this.zoom = new Vec();
		this.zoomBefore = Vec.nan;
		this.zoomInertia = new Vec();
		this.zoomCenter = new Vec();
		this.bound = new Rect();

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

		let lastTimestampMSec = .0;
		let tick = (timestampMSec: number)=>{
			this.onTick((timestampMSec - lastTimestampMSec) / 1000.0);
			lastTimestampMSec = timestampMSec;
			window.requestAnimationFrame(tick);
		};
		window.requestAnimationFrame(tick);
	}

	addNode(node: Node) {
		this.nodes.push(node);
		if (!this.rectTree || node.rect.intersects(this.viewRect)) {
			this.element.appendChild(node.element);
		}
		if (this.rectTree) {
			this.rectTree.insert(node.rect, node);
		}
		this.bound = this.bound.extend(node.rect);
	}

	get scale(): Vec {
		return new Vec(
			Math.pow(2.0, this.zoom.x),
			Math.pow(2.0, this.zoom.y)
		);
	}

	get viewRect(): Rect {
		let scale = this.scale;
		let pos = this.scroll.div(scale);
		let view = this.container.getBoundingClientRect();
		// let debug = 100;
		// return new Rect(pos.x + debug / scale.x, pos.y + debug / scale.y, (view.width - 2 * debug) / scale.x, (view.height - 2 * debug) / scale.y);
		return new Rect(pos.x, pos.y, view.width / scale.x, view.height / scale.y);
	}

	mousePos(e:MouseEvent): Vec {
		let view = this.container.getBoundingClientRect();
		return new Vec(e.clientX, e.clientY).subXY(view.left, view.top);
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
			this.scroll = this.viewBound.pullBackStatic(
				this.scrollAtPanStart.sub(delta),
				this.limitMargin,
				config.pullBack.staticExponentialBase
			);
			this.scrollInertia = this.lastPanDelta.sub(delta).mulXY(config.scroll.panInputCoef);
		}
		this.lastPanDelta = delta;
		if (this.inertiaCancelTimer) {
			clearTimeout(this.inertiaCancelTimer);
		}
		this.inertiaCancelTimer = setTimeout(()=>{
			this.scrollInertia.setZero();
			this.inertiaCancelTimer = null;
		}, config.scroll.inertiaCancelTimeoutMSec);
	}

	onPanEnd(e: HammerInput) {
		let delta = new Vec(e.deltaX, e.deltaY);
		if (this.scrollAtPanStart) {
			this.scroll = this.viewBound.pullBackStatic(
				this.scrollAtPanStart.sub(delta),
				this.limitMargin,
				config.pullBack.staticExponentialBase
			);
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
		if (e.shiftKey) {
			let delta = new Vec(e.deltaX, e.deltaY);
			let v = delta.size();
			v *= Math.sign((delta.x||1.0) * (delta.y||1.0));
			delta = new Vec(v, v);
			this.zoomCenter = this.mousePos(e);
			this.zoomInertia = this.zoomInertia.add(delta.mulXY(config.zoom.inputCoef));
		}
		else {
			let delta = new Vec(e.deltaX, e.deltaY);
			this.scrollInertia = this.scrollInertia.add(delta.mulXY(config.scroll.wheelInputCoef));
		}
		e.preventDefault();
	}

	get limitMargin(): Vec {
		return new Vec(config.limitMargin.x, config.limitMargin.y).mul(this.scale);
	}

	get viewBound(): Rect {
		let view = Rect.fromClientRect(this.container.getBoundingClientRect());
		let bound = this.bound.mul(this.scale);
		bound.x -= view.w * config.marginCoef.x;
		bound.y -= view.h * config.marginCoef.y;
		bound.w += view.w * config.marginCoef.x * 2 - view.w;
		bound.h += view.h * config.marginCoef.y * 2 - view.h;
		return bound;
	}

	onTick(deltaSec: number) {
		if (config.debug.showFps) {
			let fps = Math.round(1.0/deltaSec).toString();
			document.getElementById("fps").textContent = ("  " + fps).substr(-3) + " FPS";
		}
		if (!this.scrollAtPanStart) {
			let scroll = this.scroll.add(this.scrollInertia.mulXY(deltaSec));
			this.scroll = this.viewBound.pullBack(scroll, deltaSec, 1.0 - Math.pow(10.0, -config.pullBack.dynamicRate));
			if (this.scroll.equals(scroll)) {
				let r = Math.pow(Math.pow(10.0, -config.scroll.inertiaDamping), deltaSec);
				this.scrollInertia = this.scrollInertia.mulXY(r).setZeroIf(config.scroll.eps);
			}
			else {
				this.scrollInertia.setZero();
			}
		}
		//
		if (!this.zoomInertia.isZero()) {
			let scale0 = this.scale;
			this.zoom = this.zoom.add(this.zoomInertia.mulXY(deltaSec));
			let scale1 = this.scale;
			this.scroll = this.scroll.add(this.zoomCenter).div(scale0).mul(scale1).sub(this.zoomCenter);
			let r = Math.pow(Math.pow(10.0, -config.zoom.inertiaDamping), deltaSec);
			this.zoomInertia = this.zoomInertia.mulXY(r).setZeroIf(config.zoom.eps);
		}
		//
		if (!this.scroll.equals(this.scrollBefore) || !this.zoom.equals(this.zoomBefore)) {
			this.element.style.left = (-this.scroll.x) + "px";
			this.element.style.top = (-this.scroll.y) + "px";
			let sclae = this.scale;
			this.element.style.transform = `scale(${sclae.x}, ${sclae.y})`;
			this.nodeContentRule.style.display = sclae.size() < .5 ? "none" : "block";
			this.nodeContentRule.style.transform = `scale(${1.0 / sclae.x}, ${1.0 / sclae.y})`;
			if (this.rectTree) {
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
		//
		this.scrollBefore = this.scroll.clone();
		this.zoomBefore = this.zoom.clone();
	}

}
