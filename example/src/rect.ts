import Vec from "./vec";

/**
 * スクロール座標を制限する際に弾性のついた表現に用いる（経過時間を考慮）
 *
 * @param current 現在の座標
 * @param limit 制限を開始する座標
 * @param delta 経過時間
 * @param rate 単位時間あたりに引き寄せたい位置の内分比率
 * @returns {number}
 */
function pullBack(current: number, limit: number, delta: number, rate: number) {
	let r = 1.0 - Math.pow(1.0 - rate, delta);
	return limit * r + current * (1.0 - r);
}

/**
 * スクロール座標を制限する際に弾性のついた表現に用いる
 * baseは2.0前後の値を推奨（1.0 < base）
 *
 *        OUT(return)
 *         |
 *  limit +････････････････ このラインを超えない
 *         |     ＿─￣￣
 *         |  ,-~
 *         |／
 *  xBegin +--------+------- IN(current)
 *       ／|xBegin   limit
 *     ／  |
 *   ／    |
 *     ↑
 * ここまで傾き1
 *
 * @param current 本来の座標
 * @param begin 制限を開始する座標
 * @param limit 制限の限界となる座標
 * @param base 制限の強さ
 * @returns {number} 制限された座標
 */
function pullBackExponentially(current: number, begin: number, limit: number, base: number) {
	var sgn = begin<=limit ? 1 : -1;
	var dx0 = (limit - begin) * sgn;
	var dx = (current - begin) * sgn;
	if (dx < 0) return current;
	var rx = dx / dx0;
	rx = 1 - Math.pow(base, -rx);
	return begin + rx * dx0 * sgn;
}

export default class Rect {

	x: number;
	y: number;
	w: number;
	h: number;

	constructor(x: number=.0, y: number=.0, w: number=.0, h: number=.0) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
	}

	static fromClientRect(r: ClientRect): Rect {
		return new Rect(r.left, r.top, r.width, r.height);
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

	extend(r: Rect): Rect {
		let left   = Math.min(this.left,   r.left);
		let right  = Math.max(this.right,  r.right);
		let top    = Math.min(this.top,    r.top);
		let bottom = Math.max(this.bottom, r.bottom);
		return new Rect(left, top, right-left, bottom-top);
	}

	mul(v: Vec): Rect {
		return new Rect(this.x * v.x, this.y * v.y, this.w * v.x, this.h * v.y);
	}

	pullBack(v0: Vec, delta: number, rate: number): Vec {
		let v1 = v0.clone();
		if (v1.x < this.left) {
			v1.x = pullBack(v1.x, this.left, delta, rate);
		}
		if (this.right < v1.x) {
			v1.x = pullBack(v1.x, this.right, delta, rate);
		}
		if (v1.y < this.top) {
			v1.y = pullBack(v1.y, this.top, delta, rate);
		}
		if (this.bottom < v1.y) {
			v1.y = pullBack(v1.y, this.bottom, delta, rate);
		}
		return v1;
	}

	pullBackStatic(v0: Vec, margin: Vec, base: number): Vec {
		let v1 = v0.clone();
		if (v1.x < this.left) {
			v1.x = pullBackExponentially(v1.x, this.left, this.left - margin.x, base);
		}
		if (this.right < v1.x) {
			v1.x = pullBackExponentially(v1.x, this.right, this.right + margin.x, base);
		}
		if (v1.y < this.top) {
			v1.y = pullBackExponentially(v1.y, this.top, this.top - margin.y, base);
		}
		if (this.bottom < v1.y) {
			v1.y = pullBackExponentially(v1.y, this.bottom, this.bottom + margin.y, base);
		}
		return v1;
	}

}
