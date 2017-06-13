import {AVLTree} from "binary-search-tree";
import * as Hammer from "hammerjs";
import {addWheelListener} from "wheel";
import * as _ from "lodash";
import Vec from "./vec";
import Rect from "./rect";
import Node from "./node";

export default class Atlas {
	
	container: HTMLElement;
	element: HTMLElement;
	hammer: HammerManager;
	nodes: Node[];
	posMapL: AVLTree<number, Node>;
	posMapR: AVLTree<number, Node>;
	posMapT: AVLTree<number, Node>;
	posMapB: AVLTree<number, Node>;
	scroll: Vec;
	scrollAtStart: Vec;
	zoomExp: Vec;
	nodeContentRule: CSSStyleRule;
	beforeViewRect: Rect;

	constructor(id: string) {
		this.element = document.createElement("div");
		this.element.classList.add("atlas");
		this.container = document.getElementById(id);
		this.container.appendChild(this.element);
		this.nodes = [];
		this.posMapL = new AVLTree<number, Node>({});
		this.posMapR = new AVLTree<number, Node>({});
		this.posMapT = new AVLTree<number, Node>({});
		this.posMapB = new AVLTree<number, Node>({});
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
			// this.scroll.x += delta * 50;
			// this.updateScroll();
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
		let r0 = this.beforeViewRect;
		this.element.style.left = (-this.scroll.x) + "px";
		this.element.style.top = (-this.scroll.y) + "px";
		let z = this.zoom;
		this.element.style.transform = `scale(${z.x}, ${z.y})`;
		this.nodeContentRule.style.display = z.size() < .5 ? "none" : "block";
		this.nodeContentRule.style.transform = `scale(${1.0 / z.x}, ${1.0 / z.y})`;
		let r1 = this.viewRect;

		// before: r0-----------------r0
		// after :  |       r1--------+--------r1
		//          |  hide<-|        |->show  |
		//             [NODE]                 [NODE]
		//                  ^A               B^
		//
		// before:          r0-----------------r0
		// after : r1--------+--------r1       |
		//          |  show<-|        |->hide  |
		//      [NODE]                 [NODE]
		//           ^C               D^

		let hide: Node[] = [];
		let show: Node[] = [];

		if (!r0) {
			show = _.intersection(
				this.posMapL.betweenBounds({ $lt: r1.right }),
				this.posMapR.betweenBounds({ $gt: r1.left }),
				this.posMapT.betweenBounds({ $lt: r1.bottom }),
				this.posMapB.betweenBounds({ $gt: r1.top })
			);
		}
		else {

			if (r0.left < r1.left) { // hide A
				hide = this.posMapR.betweenBounds({ $gt: r0.left, $lte: r1.left });
			}
			if (r1.right < r0.right) { // hide D
				hide = _.union(hide, this.posMapL.betweenBounds({ $gte: r1.right, $lt: r0.right }));
			}
			if (r0.right < r1.right) { // show B
				show = this.posMapL.betweenBounds({ $gte: r0.right, $lt: r1.right });
			}
			if (r1.left < r0.left) { // show C
				show = _.union(show, this.posMapR.betweenBounds({ $gt: r1.left, $lte: r0.left }));
			}

			if (r0.top < r1.top) { // hide A
				hide = _.union(hide, this.posMapB.betweenBounds({ $gt: r0.top, $lte: r1.top }));
			}
			if (r1.bottom < r0.bottom) { // hide D
				hide = _.union(hide, this.posMapT.betweenBounds({ $gte: r1.bottom, $lt: r0.bottom }));
			}
			if (r0.bottom < r1.bottom) { // show B
				show = _.union(show, this.posMapT.betweenBounds({ $gte: r0.bottom, $lt: r1.bottom }));
			}
			if (r1.top < r0.top) { // show C
				show = _.union(show, this.posMapB.betweenBounds({ $gt: r1.top, $lte: r0.top }));
			}

			show = _.difference(show, hide);

			for (var n of hide) {
				if (n.element && n.element.parentNode) n.element.parentNode.removeChild(n.element);
			}
		}

		for (var n of show) {
			if (!n.element.parentNode && r1.left < n.rect.right && n.rect.left < r1.right && r1.top < n.rect.bottom && n.rect.top < r1.bottom) {
				this.element.appendChild(n.element);
			}
		}

		this.beforeViewRect = r1;
	}
	
	addNode(node: Node) {
		this.nodes.push(node);
		let r = this.viewRect;
		if (r.left < node.rect.right && node.rect.left < r.right && r.top < node.rect.bottom && node.rect.top < r.bottom) {
			this.element.appendChild(node.element);
		}
		this.posMapL.insert(node.rect.left, node);
		this.posMapR.insert(node.rect.right, node);
		this.posMapT.insert(node.rect.top, node);
		this.posMapB.insert(node.rect.bottom, node);
	}

}
