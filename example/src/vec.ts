export default class Vec {

	x: number;
	y: number;

	constructor(x: number=.0, y:number=.0) {
		this.set(x, y);
	}

	clone(): Vec {
		return new Vec(this.x, this.y);
	}

	equals(v: Vec): boolean {
		return this.x==v.x && this.y==v.y;
	}

	set(x: number, y:number): Vec {
		this.x = x;
		this.y = y;
		return this;
	}

	isZero(): boolean {
		return this.x == .0 && this.y == .0
	}

	setZero(): Vec {
		this.x = .0;
		this.y = .0;
		return this;
	}

	setZeroIf(eps: number): Vec {
		if (this.size() < eps) this.setZero();
		return this;
	}

	static get nan(): Vec {
		return new Vec(NaN, NaN);
	}

	size(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	add(v: Vec): Vec {
		return new Vec(this.x + v.x, this.y + v.y);
	}

	addXY(x: number, y: number): Vec {
		return new Vec(this.x + x, this.y + y);
	}

	sub(v: Vec): Vec {
		return new Vec(this.x - v.x, this.y - v.y);
	}

	subXY(x: number, y: number): Vec {
		return new Vec(this.x - x, this.y - y);
	}

	mul(v: Vec): Vec {
		return new Vec(this.x * v.x, this.y * v.y);
	}

	mulXY(x: number, y?: number): Vec {
		if (y == null) y = x;
		return new Vec(this.x * x, this.y * y);
	}

	div(v: Vec): Vec {
		return new Vec(this.x / v.x, this.y / v.y);
	}

	divXY(x: number, y: number): Vec {
		return new Vec(this.x / x, this.y / y);
	}

}
