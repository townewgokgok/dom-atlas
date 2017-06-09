export default class Rect {
	x: number;
	y: number;
	w: number;
	h: number;
	constructor(x: number, y:number, w: number, h:number) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
	}
	get left() {
		return this.x;
	}
	get right() {
		return this.x + this.w;
	}
	get top() {
		return this.y;
	}
	get bottom() {
		return this.y + this.h;
	}
}
