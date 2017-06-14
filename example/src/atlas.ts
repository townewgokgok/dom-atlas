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
	zoom: {
		inputCoef: .05,
		inertiaDamping: 20.0,
		eps: 10.0,
	},
};

export default class Atlas {

	private container: HTMLElement;
	private background: HTMLElement;
	private element: HTMLElement;
	private nodes: Node[];
	private scrollBefore: Vec;
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
		this.background = document.createElement("div");
		this.background.classList.add("atlas__background");
		this.container = document.getElementById(id);
		this.container.appendChild(this.element);
		this.container.appendChild(this.background);
		this.nodes = [];
		if (!config.debug.disableTree) {
			this.rectTree = new RectTree<Node>();
		}
		this.scroll = new Vec();
		this.scrollBefore = Vec.nan;
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
		return new Rect(pos.x, pos.y, view.width / scale.x, view.height / scale.y);
	}

	mousePos(e:MouseEvent): Vec {
		let view = this.container.getBoundingClientRect();
		return new Vec(e.clientX, e.clientY).subXY(view.left, view.top);
	}

	onWheel(e: WheelEvent) {
		if (e.shiftKey) {
			let delta = new Vec(e.deltaX, e.deltaY);
			let v = delta.size();
			v *= Math.sign((delta.x||1.0) * (delta.y||1.0));
			delta = new Vec(v, v);
			this.zoomCenter = this.mousePos(e);
			this.zoomInertia = this.zoomInertia.add(delta.mulXY(config.zoom.inputCoef));
			e.preventDefault();
		}
	}

	get scroll(): Vec {
		return new Vec(this.container.scrollLeft, this.container.scrollTop);
	}

	set scroll(v: Vec) {
		this.container.scrollLeft = v.x;
		this.container.scrollTop = v.y;
	}

	onTick(deltaSec: number) {
		if (config.debug.showFps) {
			let fps = Math.round(1.0/deltaSec).toString();
			document.getElementById("fps").textContent = ("  " + fps).substr(-3) + " FPS";
		}
		if (!this.zoomInertia.isZero()) {
			let scale0 = this.scale;
			this.zoom = this.zoom.add(this.zoomInertia.mulXY(deltaSec));
			let scale1 = this.scale;
			this.scroll = this.scroll.add(this.zoomCenter).div(scale0).mul(scale1).sub(this.zoomCenter);
			let r = Math.pow(Math.pow(10.0, -config.zoom.inertiaDamping), deltaSec);
			this.zoomInertia = this.zoomInertia.mulXY(r).setZeroIf(config.zoom.eps);
		}
		//
		let bgrect = this.bound.mul(this.scale);
		this.background.style.left   = `${bgrect.x}px`;
		this.background.style.top    = `${bgrect.y}px`;
		this.background.style.width  = `${bgrect.w}px`;
		this.background.style.height = `${bgrect.h}px`;
		//
		if (!this.scroll.equals(this.scrollBefore) || !this.zoom.equals(this.zoomBefore)) {
			let scale = this.scale;
			this.element.style.transform = `scale(${scale.x}, ${scale.y})`;
			this.nodeContentRule.style.display = scale.size() < 1.0 ? "none" : "block";
			this.nodeContentRule.style.transform = `scale(${1.0 / scale.x}, ${1.0 / scale.y})`;
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
