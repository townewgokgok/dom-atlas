import {AVLTree} from "binary-search-tree";
import Rect from "./rect";
import * as _ from "lodash";

export default class RectTree<T> {

	private treeL: AVLTree<number, T>;
	private treeR: AVLTree<number, T>;
	private treeT: AVLTree<number, T>;
	private treeB: AVLTree<number, T>;
	private beforeViewRect: Rect;

	constructor() {
		this.treeL = new AVLTree<number, T>({});
		this.treeR = new AVLTree<number, T>({});
		this.treeT = new AVLTree<number, T>({});
		this.treeB = new AVLTree<number, T>({});
		this.beforeViewRect = null;
	}

	insert(rect: Rect, node: T) {
		this.treeL.insert(rect.left, node);
		this.treeR.insert(rect.right, node);
		this.treeT.insert(rect.top, node);
		this.treeB.insert(rect.bottom, node);
	}

	update(r1: Rect): {hide:T[]; show:T[];} {
		let r0 = this.beforeViewRect;

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

		let hide: T[] = [];
		let show: T[] = [];

		if (!r0) {
			show = _.intersection(
				this.treeL.betweenBounds({ $lt: r1.right }),
				this.treeR.betweenBounds({ $gt: r1.left }),
				this.treeT.betweenBounds({ $lt: r1.bottom }),
				this.treeB.betweenBounds({ $gt: r1.top })
			);
		}
		else if (!r0.equals(r1)) {

			if (r0.left < r1.left) { // hide A
				hide = this.treeR.betweenBounds({ $gt: r0.left, $lte: r1.left });
			}
			if (r1.right < r0.right) { // hide D
				hide = _.union(hide, this.treeL.betweenBounds({ $gte: r1.right, $lt: r0.right }));
			}
			if (r0.right < r1.right) { // show B
				show = this.treeL.betweenBounds({ $gte: r0.right, $lt: r1.right });
			}
			if (r1.left < r0.left) { // show C
				show = _.union(show, this.treeR.betweenBounds({ $gt: r1.left, $lte: r0.left }));
			}

			if (r0.top < r1.top) { // hide A
				hide = _.union(hide, this.treeB.betweenBounds({ $gt: r0.top, $lte: r1.top }));
			}
			if (r1.bottom < r0.bottom) { // hide D
				hide = _.union(hide, this.treeT.betweenBounds({ $gte: r1.bottom, $lt: r0.bottom }));
			}
			if (r0.bottom < r1.bottom) { // show B
				show = _.union(show, this.treeT.betweenBounds({ $gte: r0.bottom, $lt: r1.bottom }));
			}
			if (r1.top < r0.top) { // show C
				show = _.union(show, this.treeB.betweenBounds({ $gt: r1.top, $lte: r0.top }));
			}

			show = _.difference(show, hide);
		}

		this.beforeViewRect = r1.clone();
		return {hide, show};
	}

}
