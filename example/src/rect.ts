export default class Rect {
	x: number;
	y: number;
	w: number;
	h: number;
	constructor(x: number, y: number, w: number, h: number) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
	}
	get left(): number {
		return this.x;
	}
	get right(): number {
		return this.x + this.w;
	}
	get top(): number {
		return this.y;
	}
	get bottom(): number {
		return this.y + this.h;
	}
	clone(): Rect {
		return new Rect(this.x, this.y, this.w, this.h);
	}
	equals(r: Rect): boolean {
		return this.x==r.x && this.y==r.y && this.w==r.w && this.h==r.h;
	}
	intersects(r: Rect): boolean {
		return this.left < r.right && r.left < this.right && this.top < r.bottom && r.top < this.bottom;
	}
}
